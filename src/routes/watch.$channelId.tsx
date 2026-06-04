import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Copy, Check, Share2, Code2, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LiveChat } from "@/components/LiveChat";
import { supabase } from "@/integrations/supabase/client";
import { ownerTokenFor } from "@/lib/livestudio";

export const Route = createFileRoute("/watch/$channelId")({
  head: () => ({ meta: [{ title: "Трансляция — LiveStudio" }] }),
  component: Watch,
});

type Channel = {
  id: string;
  title: string | null;
  stream_url: string;
  stream_type: string;
  scheduled_at: string | null;
  created_at: string;
};

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function Watch() {
  const { channelId } = Route.useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const ownerToken = useMemo(() => ownerTokenFor(channelId), [channelId]);
  const countdown = useCountdown(channel?.scheduled_at ?? null);

  useEffect(() => {
    let active = true;
    supabase
      .from("channels")
      .select("id,title,stream_url,stream_type,scheduled_at,created_at")
      .eq("id", channelId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setChannel(data as Channel | null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [channelId]);

  if (loading) {
    return (
      <PageShell>
        <div className="grid place-items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (!channel) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md px-4 py-32 text-center">
          <h1 className="text-2xl font-bold">Трансляция не найдена</h1>
          <p className="mt-2 text-muted-foreground">
            Возможно, ссылка устарела или введена неверно.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="relative">
              {countdown ? (
                <div className="grid aspect-video w-full place-items-center rounded-xl border border-border bg-card text-center">
                  <div>
                    <p className="text-sm uppercase tracking-wider text-muted-foreground">
                      Старт через
                    </p>
                    <p className="mt-3 font-mono text-4xl font-bold tabular-nums sm:text-5xl">
                      {countdown.d > 0 && `${countdown.d}д `}
                      {String(countdown.h).padStart(2, "0")}:
                      {String(countdown.m).padStart(2, "0")}:
                      {String(countdown.s).padStart(2, "0")}
                    </p>
                  </div>
                </div>
              ) : (
                <VideoPlayer url={channel.stream_url} />
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{channel.title || "Прямая трансляция"}</h1>
                {ownerToken && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" /> Вы владелец канала
                  </span>
                )}
              </div>
            </div>

            <SharePanel channelId={channelId} />
          </div>

          <div className="h-[520px] lg:h-auto lg:min-h-[520px]">
            <LiveChat channelId={channelId} ownerToken={ownerToken} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function SharePanel({ channelId }: { channelId: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const watchUrl = `${origin}/watch/${channelId}`;
  const embedUrl = `${origin}/embed/${channelId}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="640" style="border:0;border-radius:12px" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  const jsCode = `<div id="livestudio-${channelId}"></div>
<script>
(function(){
  var f=document.createElement('iframe');
  f.src='${embedUrl}';
  f.width='100%';f.height='640';f.style.border='0';f.style.borderRadius='12px';
  f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen=true;
  document.getElementById('livestudio-${channelId}').appendChild(f);
})();
</script>`;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <CopyRow icon={Share2} label="Ссылка на трансляцию" value={watchUrl} />
      <CopyRow icon={Code2} label="Встраивание (iframe)" value={iframeCode} multiline />
      <CopyRow icon={Code2} label="Встраивание (JS-код)" value={jsCode} multiline />
    </div>
  );
}

function CopyRow({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-primary transition hover:bg-accent"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      {multiline ? (
        <pre className="max-h-32 overflow-auto rounded-md border border-border bg-background p-2 text-[11px] leading-relaxed text-foreground/80">
          {value}
        </pre>
      ) : (
        <div className="truncate rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground/80">
          {value}
        </div>
      )}
    </div>
  );
}
