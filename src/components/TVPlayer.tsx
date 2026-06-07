import { useEffect, useRef, useState, useCallback } from "react";
import { CalendarClock, Radio, Megaphone, X, Volume2, VolumeX, Maximize } from "lucide-react";
import {
  detectStreamKind,
  youtubeId,
  twitchChannel,
  type StreamKind,
} from "@/lib/livestudio";
import {
  getNowPlaying,
  buildGuide,
  type ChannelConfig,
  type NowPlaying,
} from "@/lib/broadcast";

function MediaSurface({
  url,
  seek,
  muted,
}: {
  url: string;
  seek: number;
  muted: boolean;
}) {
  const kind: StreamKind = detectStreamKind(url);
  const videoRef = useRef<HTMLVideoElement>(null);

  // HLS / file native player with seek
  useEffect(() => {
    if (kind === "youtube" || kind === "twitch" || kind === "iframe") return;
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;
    let hlsInstance: { destroy: () => void } | null = null;

    const applySeek = () => {
      if (seek > 0 && isFinite(seek)) {
        try {
          video.currentTime = seek;
        } catch {
          /* ignore */
        }
      }
      video.play().catch(() => {});
    };

    if (kind === "hls" && !video.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (destroyed) return;
        if (Hls.isSupported()) {
          const inst = new Hls({ enableWorker: true, liveSyncDuration: 3 });
          inst.loadSource(url);
          inst.attachMedia(video);
          inst.on(Hls.Events.MANIFEST_PARSED, applySeek);
          hlsInstance = inst;
        } else {
          video.src = url;
          video.addEventListener("loadedmetadata", applySeek, { once: true });
        }
      });
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", applySeek, { once: true });
    }
    return () => {
      destroyed = true;
      hlsInstance?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, kind]);

  if (kind === "youtube") {
    const id = youtubeId(url);
    const src = id
      ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&start=${Math.floor(
          seek,
        )}&rel=0&modestbranding=1&playsinline=1&mute=${muted ? 1 : 0}`
      : url;
    return (
      <iframe
        src={src}
        title="stream"
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  if (kind === "twitch") {
    const ch = twitchChannel(url);
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const src = ch
      ? `https://player.twitch.tv/?channel=${ch}&parent=${host}&autoplay=true&muted=${muted}`
      : url;
    return (
      <iframe
        src={src}
        title="stream"
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  if (kind === "iframe") {
    return (
      <iframe
        src={url}
        title="stream"
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full bg-black"
      autoPlay
      playsInline
      muted={muted}
      controls={false}
    />
  );
}

const POS: Record<string, string> = {
  tl: "top-3 left-3",
  tr: "top-3 right-3",
  bl: "bottom-14 left-3",
  br: "bottom-14 right-3",
};

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ru-RU";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function TVPlayer({
  config,
  fallbackUrl,
  fallbackTitle,
  serverOffset,
}: {
  config: ChannelConfig;
  fallbackUrl: string | null;
  fallbackTitle: string;
  serverOffset: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [air, setAir] = useState<NowPlaying | null>(null);
  const [muted, setMuted] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [tick, setTick] = useState(0);

  // recompute air state every second (cheap, pure)
  useEffect(() => {
    const compute = () => {
      const now = Date.now() + serverOffset;
      setAir(getNowPlaying(config, now, fallbackUrl, fallbackTitle));
    };
    compute();
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, fallbackUrl, fallbackTitle, serverOffset]);

  useEffect(() => {
    const now = Date.now() + serverOffset;
    setAir(getNowPlaying(config, now, fallbackUrl, fallbackTitle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // segment key forces media remount only when url/mode changes (not every tick)
  const segKey = air ? `${air.mode}:${air.url ?? "none"}:${Math.floor(air.seek / 5)}` : "init";
  const lastSeg = useRef<string>("");
  const [renderKey, setRenderKey] = useState("init");
  useEffect(() => {
    const base = air ? `${air.mode}:${air.url ?? "none"}` : "init";
    if (base !== lastSeg.current) {
      lastSeg.current = base;
      setRenderKey(base + ":" + Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segKey]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  const brand = config.brand;
  const guide = buildGuide(config);

  return (
    <div
      ref={wrapRef}
      className="relative aspect-video w-full select-none overflow-hidden rounded-xl bg-black"
    >
      {/* Media / screens */}
      {air && (air.mode === "program" || air.mode === "ad" || air.mode === "preroll") && air.url ? (
        <MediaSurface key={renderKey} url={air.url} seek={air.seek} muted={muted} />
      ) : null}

      {air && air.mode === "countdown" && (
        <CountdownScreen air={air} accent={brand.accentColor} now={Date.now() + serverOffset} />
      )}

      {air && (air.mode === "filler" || ((air.mode === "ad" || air.mode === "preroll") && !air.url)) && (
        <FillerScreen
          text={air.mode === "ad" || air.mode === "preroll" ? config.ads.fallbackText : air.fillerText || config.filler.text}
          contact={config.ads.contactText}
          channelName={brand.channelName}
          poster={air.posterUrl || config.filler.posterUrl}
          accent={brand.accentColor}
          isAd={air.mode === "ad" || air.mode === "preroll"}
        />
      )}

      {/* Logo overlay */}
      {brand.logoUrl ? (
        <img
          src={brand.logoUrl}
          alt={brand.channelName}
          className={`pointer-events-none absolute z-20 ${POS[brand.logoPosition] || POS.tr}`}
          style={{ height: brand.logoSize, opacity: brand.logoOpacity }}
        />
      ) : (
        <span
          className={`pointer-events-none absolute z-20 rounded bg-black/40 px-2 py-0.5 text-sm font-bold backdrop-blur ${
            POS[brand.logoPosition] || POS.tr
          }`}
          style={{ color: "#fff", opacity: brand.logoOpacity }}
        >
          {brand.channelName}
        </span>
      )}

      {/* LIVE + premiere badges */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1.5">
        {air?.isLive && (
          <span className="inline-flex w-fit items-center gap-1 rounded bg-black/55 px-2 py-0.5 text-xs font-bold text-white backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> LIVE
          </span>
        )}
        {air?.isPremiere && air.mode === "program" && (
          <span
            className="inline-flex w-fit items-center rounded px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-white"
            style={{ backgroundColor: brand.accentColor }}
          >
            {air.premiereLabel}
          </span>
        )}
        {(air?.mode === "ad" || air?.mode === "preroll") && air?.url && (
          <span className="inline-flex w-fit items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
            <Megaphone className="h-3 w-3" /> Реклама
          </span>
        )}
      </div>

      {/* Bottom bar */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
        <button
          onClick={() => setMuted((m) => !m)}
          className="grid h-9 w-9 place-items-center rounded-md text-white/90 transition hover:bg-white/15"
          aria-label="Звук"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <span className="truncate text-sm text-white/90">{air?.title}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowGuide((s) => !s)}
            className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
          >
            <CalendarClock className="h-4 w-4" /> Программа
          </button>
          <button
            onClick={toggleFullscreen}
            className="grid h-9 w-9 place-items-center rounded-md text-white/90 transition hover:bg-white/15"
            aria-label="Полный экран"
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>

      {muted && (
        <button
          onClick={() => setMuted(false)}
          className="absolute inset-0 z-10 grid place-items-center bg-black/0"
          aria-label="Включить звук"
        >
          <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur">
            Нажмите, чтобы включить звук
          </span>
        </button>
      )}

      {/* Guide panel */}
      {showGuide && (
        <div className="absolute inset-0 z-40 flex flex-col bg-black/85 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-white">
              <Radio className="h-4 w-4" /> Программа передач
            </h3>
            <button onClick={() => setShowGuide(false)} className="text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 space-y-1.5 overflow-auto">
            {guide.length === 0 && (
              <p className="text-sm text-white/60">Расписание не задано — идёт постоянный эфир.</p>
            )}
            {guide.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white/70">
                    {new Date(b.startsAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>{b.title}</span>
                </div>
                {b.isPremiere && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    style={{ backgroundColor: brand.accentColor, color: "#fff" }}
                  >
                    {b.premiereLabel || "Премьера"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CountdownScreen({
  air,
  accent,
  now,
}: {
  air: NowPlaying;
  accent: string;
  now: number;
}) {
  const target = air.countdownTo || now;
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-black via-zinc-900 to-black text-center">
      <div>
        {air.isPremiere && (
          <span
            className="mb-4 inline-block rounded px-3 py-1 text-sm font-extrabold uppercase tracking-widest text-white"
            style={{ backgroundColor: accent }}
          >
            {air.premiereLabel}
          </span>
        )}
        <p className="text-lg font-medium text-white/80">{air.countdownTitle}</p>
        <p className="mt-3 font-mono text-4xl font-bold tabular-nums text-white sm:text-6xl">
          {d > 0 && `${d}д `}
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </p>
        <p className="mt-3 text-sm text-white/50">До начала в прямом эфире</p>
      </div>
    </div>
  );
}

function FillerScreen({
  text,
  contact,
  channelName,
  poster,
  accent,
  isAd,
}: {
  text: string;
  contact: string;
  channelName: string;
  poster?: string;
  accent: string;
  isAd: boolean;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black text-center">
      {poster && (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}
      <div className="relative px-6">
        <div
          className="mx-auto mb-4 h-1 w-16 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <p className="text-xl font-bold text-white sm:text-2xl">{text}</p>
        {isAd && contact && (
          <p className="mt-4 text-sm text-white/70">{contact}</p>
        )}
        <p className="mt-6 text-xs uppercase tracking-widest text-white/40">{channelName}</p>
      </div>
    </div>
  );
}
