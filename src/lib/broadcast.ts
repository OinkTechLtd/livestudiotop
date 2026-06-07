// LiveStudio broadcast engine — deterministic "what is playing right now" by time.
// Pure functions: same input (config + timestamp) => same output for every viewer.

export type LogoPosition = "tl" | "tr" | "bl" | "br";

export interface ScheduleBlock {
  id: string;
  title: string;
  url: string;
  /** ISO datetime — absolute start of this block */
  startsAt: string;
  /** duration in minutes */
  durationMin: number;
  isPremiere?: boolean;
  /** overlay text, e.g. "ПРЕМЬЕРА" / "НОВЫЙ СЕЗОН" */
  premiereLabel?: string;
}

export interface AdItem {
  url: string;
}

export interface AdsConfig {
  enabled: boolean;
  /** show an ad break every N minutes of program */
  everyMin: number;
  /** ad break length in minutes */
  durationMin: number;
  /** preroll played once at the very start of every block */
  prerollUrl?: string;
  prerollMin?: number;
  items: AdItem[];
  /** shown when an ad break is due but no ad links are provided */
  fallbackText: string;
  contactText: string;
}

export interface PromoItem {
  id: string;
  title: string;
  dateText: string;
  narratorText: string;
  posterUrl?: string;
}

export interface BrandConfig {
  channelName: string;
  logoUrl?: string;
  logoPosition: LogoPosition;
  /** logo height in px (over a 16:9 area scaled to container) */
  logoSize: number;
  logoOpacity: number;
  accentColor: string;
}

export interface FillerConfig {
  text: string;
  posterUrl?: string;
}

export interface ChannelConfig {
  brand: BrandConfig;
  schedule: { blocks: ScheduleBlock[] };
  ads: AdsConfig;
  promos: { items: PromoItem[] };
  filler: FillerConfig;
}

export function defaultConfig(channelName = "Мой канал"): ChannelConfig {
  return {
    brand: {
      channelName,
      logoUrl: "",
      logoPosition: "tr",
      logoSize: 48,
      logoOpacity: 0.9,
      accentColor: "#e11d48",
    },
    schedule: { blocks: [] },
    ads: {
      enabled: false,
      everyMin: 30,
      durationMin: 5,
      prerollUrl: "",
      prerollMin: 0,
      items: [],
      fallbackText: "Трансляция на техническом перерыве",
      contactText: "",
    },
    promos: { items: [] },
    filler: {
      text: "Трансляция скоро начнётся",
      posterUrl: "",
    },
  };
}

/** Merge a partial/unknown config (from DB jsonb) with safe defaults. */
export function normalizeConfig(raw: unknown, channelName = "Мой канал"): ChannelConfig {
  const d = defaultConfig(channelName);
  if (!raw || typeof raw !== "object") return d;
  const c = raw as Partial<ChannelConfig>;
  return {
    brand: { ...d.brand, ...(c.brand || {}) },
    schedule: { blocks: Array.isArray(c.schedule?.blocks) ? c.schedule!.blocks : [] },
    ads: { ...d.ads, ...(c.ads || {}), items: Array.isArray(c.ads?.items) ? c.ads!.items : [] },
    promos: { items: Array.isArray(c.promos?.items) ? c.promos!.items : [] },
    filler: { ...d.filler, ...(c.filler || {}) },
  };
}

export type AirMode = "program" | "ad" | "preroll" | "filler" | "countdown";

export interface NowPlaying {
  mode: AirMode;
  url: string | null;
  /** seconds to seek to inside url (program/ad/preroll) */
  seek: number;
  title: string;
  isPremiere: boolean;
  premiereLabel: string;
  /** seconds until the engine should recompute (segment change) */
  timeToNextSec: number;
  /** for countdown mode — target epoch ms */
  countdownTo?: number;
  countdownTitle?: string;
  fillerText?: string;
  posterUrl?: string;
  adIndex?: number;
  isLive: boolean;
}

function blockEnd(b: ScheduleBlock): number {
  return new Date(b.startsAt).getTime() + b.durationMin * 60_000;
}

/**
 * Compute current air state.
 * @param config channel config
 * @param nowMs   server-synced current time in ms
 * @param fallbackUrl channel.stream_url — used as 24/7 program when no schedule blocks exist
 * @param fallbackTitle channel title
 */
export function getNowPlaying(
  config: ChannelConfig,
  nowMs: number,
  fallbackUrl: string | null,
  fallbackTitle = "Прямой эфир",
): NowPlaying {
  const blocks = [...config.schedule.blocks]
    .filter((b) => b.url && b.startsAt && b.durationMin > 0)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // Active scheduled block?
  const active = blocks.find((b) => {
    const start = new Date(b.startsAt).getTime();
    return nowMs >= start && nowMs < blockEnd(b);
  });

  if (!active) {
    // Nothing scheduled right now. If there is a fallback 24/7 stream, use it.
    const next = blocks.find((b) => new Date(b.startsAt).getTime() > nowMs);
    if (fallbackUrl) {
      return airFromContinuous(config, nowMs, fallbackUrl, fallbackTitle, false, "");
    }
    if (next) {
      return {
        mode: "countdown",
        url: null,
        seek: 0,
        title: next.title,
        isPremiere: !!next.isPremiere,
        premiereLabel: next.premiereLabel || "ПРЕМЬЕРА",
        timeToNextSec: Math.max(1, Math.ceil((new Date(next.startsAt).getTime() - nowMs) / 1000)),
        countdownTo: new Date(next.startsAt).getTime(),
        countdownTitle: next.title,
        posterUrl: config.filler.posterUrl,
        isLive: true,
      };
    }
    return {
      mode: "filler",
      url: null,
      seek: 0,
      title: config.filler.text,
      isPremiere: false,
      premiereLabel: "",
      timeToNextSec: 15,
      fillerText: config.filler.text,
      posterUrl: config.filler.posterUrl,
      isLive: true,
    };
  }

  const start = new Date(active.startsAt).getTime();
  const elapsed = Math.floor((nowMs - start) / 1000); // seconds into block
  return airFromBlock(config, active, elapsed, nowMs);
}

function airFromBlock(
  config: ChannelConfig,
  block: ScheduleBlock,
  elapsed: number,
  nowMs: number,
): NowPlaying {
  const ads = config.ads;
  const prerollSec = ads.enabled && ads.prerollUrl ? (ads.prerollMin || 1) * 60 : 0;

  // Preroll window at block start
  if (prerollSec > 0 && elapsed < prerollSec) {
    return {
      mode: "preroll",
      url: ads.prerollUrl!,
      seek: elapsed,
      title: block.title,
      isPremiere: !!block.isPremiere,
      premiereLabel: block.premiereLabel || "ПРЕМЬЕРА",
      timeToNextSec: Math.max(1, prerollSec - elapsed),
      isLive: true,
    };
  }

  const afterPre = elapsed - prerollSec; // program timeline seconds
  return airTimeline(config, block.url, block.title, afterPre, !!block.isPremiere, block.premiereLabel || "ПРЕМЬЕРА");
}

function airFromContinuous(
  config: ChannelConfig,
  nowMs: number,
  url: string,
  title: string,
  isPremiere: boolean,
  premiereLabel: string,
): NowPlaying {
  // 24/7 continuous program: timeline anchored to epoch so all viewers sync.
  const elapsed = Math.floor(nowMs / 1000);
  return airTimeline(config, url, title, elapsed, isPremiere, premiereLabel);
}

function airTimeline(
  config: ChannelConfig,
  programUrl: string,
  title: string,
  programTime: number,
  isPremiere: boolean,
  premiereLabel: string,
): NowPlaying {
  const ads = config.ads;
  const hasAds = ads.enabled && ads.items.length > 0;
  const adBreak = ads.durationMin * 60;
  const segment = ads.everyMin * 60;

  if (!hasAds || segment <= 0 || adBreak <= 0) {
    return {
      mode: "program",
      url: programUrl,
      seek: Math.max(0, programTime),
      title,
      isPremiere,
      premiereLabel,
      timeToNextSec: 30,
      isLive: true,
    };
  }

  const cycle = segment + adBreak;
  const cyclesDone = Math.floor(programTime / cycle);
  const within = programTime - cyclesDone * cycle;

  if (within < segment) {
    // program
    const seek = cyclesDone * segment + within;
    return {
      mode: "program",
      url: programUrl,
      seek,
      title,
      isPremiere,
      premiereLabel,
      timeToNextSec: Math.max(1, segment - within),
      isLive: true,
    };
  }

  // ad break
  const adElapsed = within - segment;
  const idx = ((cyclesDone % ads.items.length) + ads.items.length) % ads.items.length;
  return {
    mode: "ad",
    url: ads.items[idx]?.url || null,
    seek: adElapsed,
    title: "Реклама",
    isPremiere: false,
    premiereLabel: "",
    timeToNextSec: Math.max(1, adBreak - adElapsed),
    adIndex: idx,
    isLive: true,
  };
}

/** Build a viewer-facing program guide (today's blocks, sorted). */
export function buildGuide(config: ChannelConfig): ScheduleBlock[] {
  return [...config.schedule.blocks]
    .filter((b) => b.url && b.startsAt)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
