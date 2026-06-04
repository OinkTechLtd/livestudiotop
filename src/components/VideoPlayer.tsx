import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
  Settings,
  Loader2,
} from "lucide-react";
import {
  detectStreamKind,
  youtubeId,
  twitchChannel,
  type StreamKind,
} from "@/lib/livestudio";

function fmt(t: number) {
  if (!isFinite(t) || t < 0) t = 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({ url }: { url: string }) {
  const kind: StreamKind = detectStreamKind(url);

  if (kind === "youtube") {
    const id = youtubeId(url);
    const src = id
      ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`
      : url;
    return <IframeFrame src={src} title="YouTube stream" />;
  }
  if (kind === "twitch") {
    const ch = twitchChannel(url);
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const src = ch
      ? `https://player.twitch.tv/?channel=${ch}&parent=${host}&autoplay=false`
      : url;
    return <IframeFrame src={src} title="Twitch stream" />;
  }
  if (kind === "iframe") {
    return <IframeFrame src={url} title="Embedded stream" />;
  }
  return <NativePlayer url={url} hls={kind === "hls"} />;
}

function IframeFrame({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

function NativePlayer({ url, hls }: { url: string; hls: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controls, setControls] = useState(true);
  const [rate, setRate] = useState(1);
  const [showRate, setShowRate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // HLS setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;
    let hlsInstance: { destroy: () => void } | null = null;

    setError(null);
    setLoading(true);

    if (hls && !video.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (destroyed) return;
          if (Hls.isSupported()) {
            const inst = new Hls({ enableWorker: true });
            inst.loadSource(url);
            inst.attachMedia(video);
            inst.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) setError("Не удалось загрузить поток. Проверьте ссылку.");
            });
            hlsInstance = inst;
          } else {
            setError("Ваш браузер не поддерживает HLS-потоки.");
          }
        })
        .catch(() => setError("Не удалось инициализировать плеер."));
    } else {
      video.src = url;
    }

    return () => {
      destroyed = true;
      hlsInstance?.destroy();
    };
  }, [url, hls]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControls(true);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControls(false);
    }, 2800);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seek = (val: number) => {
    const v = videoRef.current;
    if (v && isFinite(val)) v.currentTime = val;
  };

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="group relative aspect-video w-full select-none overflow-hidden rounded-xl bg-black"
      onMouseMove={scheduleHide}
      onMouseLeave={() => playing && setControls(false)}
      onClick={(e) => {
        if (e.target === videoRef.current) togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlaying={() => setLoading(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          setCurrent(e.currentTarget.currentTime);
          const b = e.currentTarget.buffered;
          if (b.length) setBuffered(b.end(b.length - 1));
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onError={() => {
          setLoading(false);
          if (!hls) setError("Не удалось воспроизвести видео. Проверьте ссылку.");
        }}
      />

      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {!playing && !loading && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center"
          aria-label="Воспроизвести"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/90 shadow-glow transition hover:scale-105">
            <Play className="h-9 w-9 translate-x-0.5 fill-primary-foreground text-primary-foreground" />
          </span>
        </button>
      )}

      {/* Controls bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-2 pt-10 transition-opacity duration-200 ${
          controls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Seek bar */}
        <div className="group/seek relative mb-1 h-4 w-full cursor-pointer">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/25" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/35"
            style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
            style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:opacity-0 group-hover/seek:[&::-webkit-slider-thumb]:opacity-100"
            aria-label="Перемотка"
          />
        </div>

        <div className="flex items-center gap-1.5 text-foreground">
          <Ctrl onClick={togglePlay} label={playing ? "Пауза" : "Играть"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Ctrl>
          <Ctrl onClick={() => skip(-10)} label="Назад 10с">
            <RotateCcw className="h-5 w-5" />
          </Ctrl>
          <Ctrl onClick={() => skip(10)} label="Вперёд 10с">
            <RotateCw className="h-5 w-5" />
          </Ctrl>

          <div className="group/vol flex items-center gap-1">
            <Ctrl
              onClick={() => {
                const v = videoRef.current;
                if (v) v.muted = !v.muted;
              }}
              label="Звук"
            >
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Ctrl>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                if (v) {
                  v.volume = Number(e.target.value);
                  v.muted = Number(e.target.value) === 0;
                }
              }}
              className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all duration-200 group-hover/vol:w-16 group-hover/vol:opacity-100 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              aria-label="Громкость"
            />
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/90">
            {fmt(current)} / {fmt(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative">
              <Ctrl onClick={() => setShowRate((s) => !s)} label="Скорость">
                <Settings className="h-5 w-5" />
              </Ctrl>
              {showRate && (
                <div className="absolute bottom-10 right-0 w-28 rounded-lg border border-border bg-popover p-1 text-sm shadow-xl">
                  {RATES.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        const v = videoRef.current;
                        if (v) v.playbackRate = r;
                        setRate(r);
                        setShowRate(false);
                      }}
                      className={`flex w-full items-center justify-between rounded px-2 py-1 hover:bg-accent ${
                        rate === r ? "text-primary" : ""
                      }`}
                    >
                      <span>{r === 1 ? "Обычная" : `${r}x`}</span>
                      {rate === r && <span>•</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Ctrl onClick={togglePip} label="Картинка в картинке">
              <PictureInPicture2 className="h-5 w-5" />
            </Ctrl>
            <Ctrl onClick={toggleFullscreen} label="Полный экран">
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Ctrl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ctrl({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-md text-white/90 transition hover:bg-white/15 hover:text-white"
    >
      {children}
    </button>
  );
}
