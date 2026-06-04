// Shared LiveStudio client helpers (browser-only state + stream detection).

export type StreamKind = "youtube" | "twitch" | "hls" | "file" | "iframe";

const isBrowser = typeof window !== "undefined";

export function detectStreamKind(rawUrl: string): StreamKind {
  const url = rawUrl.trim();
  const lower = url.toLowerCase();
  if (/youtube\.com|youtu\.be/.test(lower)) return "youtube";
  if (/twitch\.tv/.test(lower)) return "twitch";
  if (lower.includes(".m3u8")) return "hls";
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/.test(lower)) return "file";
  return "iframe";
}

export function youtubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/) ||
    url.match(/[?&]v=([\w-]{11})/);
  return m ? m[1] : null;
}

export function twitchChannel(url: string): string | null {
  const m = url.match(/twitch\.tv\/([\w]+)/);
  return m ? m[1] : null;
}

export function makeChannelId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

export function makeToken(): string {
  if (isBrowser && window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, "");
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// ---- Consent ----
const CONSENT_KEY = "livestudio.consent.v1";
export function hasConsent(): boolean {
  if (!isBrowser) return true;
  return localStorage.getItem(CONSENT_KEY) === "yes";
}
export function setConsent() {
  if (isBrowser) localStorage.setItem(CONSENT_KEY, "yes");
}

// ---- Owned channels (so owner can moderate) ----
const OWNED_KEY = "livestudio.owned.v1";
type Owned = Record<string, string>; // channelId -> ownerToken
export function getOwnedTokens(): Owned {
  if (!isBrowser) return {};
  try {
    return JSON.parse(localStorage.getItem(OWNED_KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveOwned(channelId: string, token: string) {
  if (!isBrowser) return;
  const all = getOwnedTokens();
  all[channelId] = token;
  localStorage.setItem(OWNED_KEY, JSON.stringify(all));
}
export function ownerTokenFor(channelId: string): string | null {
  return getOwnedTokens()[channelId] ?? null;
}

// ---- Display name ----
const NAME_KEY = "livestudio.name.v1";
export function getName(): string {
  if (!isBrowser) return "";
  return localStorage.getItem(NAME_KEY) || "";
}
export function setName(name: string) {
  if (isBrowser) localStorage.setItem(NAME_KEY, name);
}
