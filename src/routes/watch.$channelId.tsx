import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Copy, Check, Share2, Code2, ShieldCheck, Settings, Tv } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { TVPlayer } from "@/components/TVPlayer";
import { LiveChat } from "@/components/LiveChat";
import { supabase } from "@/integrations/supabase/client";
import { ownerTokenFor } from "@/lib/livestudio";
import { normalizeConfig, type ChannelConfig } from "@/lib/broadcast";
import { getServerTime } from "@/lib/channel.functions";

export const Route = createFileRoute("/watch/$channelId")({
  head: () => ({ meta: [{ title: "Трансляция — LiveStudio" }] }),
  component: Watch,
});

type Channel = {
  id: string;
  title: string | null;
  stream_url: string;
  config: unknown;
};

function Watch() {
  const { channelId } = Route.useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [config, setConfig] = useState<ChannelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverOffset, setServerOffset] = useState(0);
  const ownerToken = useMemo(() => ownerTokenFor(channelId), [channelId]);
  const fetchTime = useServerFn(getServerTime);

  // server time sync
  useEffect(() => {
    let active = true;
    const t0 = Date.now();
    fetchTime().then((r) => {
      if (!active) return;
      const rtt = (Date.now() - t0) / 2;
      setServerOffset(r.now + rtt - Date.now());
    });
    return () => {
      active = false;
    };
  }, [fetchTime]);

  // load channel
  useEffect(() => {
    let active = true;
    supabase
      .from("channels")
      .select("id,title,stream_url,config")
      .eq("id", channelId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setChannel(data as Channel | null);
        if (data) setConfig(normalizeConfig(data.config, data.title || "Канал"));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [channelId]);

  // realtime: owner edits apply instantly for everyone
  useEffect(() => {
    const ch = supabase
      .channel(`channel-${channelId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "channels", filter: `id=eq.${channelId}` },
        (payload) => {
          const row = payload.new as Channel;
          setChannel(row);
          setConfig(normalizeConfig(row.config, row.title || "Канал"));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
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

  if (!channel || !config) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md px-4 py-32 text-center">
          <h1 className="text-2xl font-bold">Канал не найден</h1>
          <p className="mt-2 text-muted-foreground">Возможно, ссылка устарела или введена неверно.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <TVPlayer
              config={config}
              fallbackUrl={channel.stream_url}
              fallbackTitle={channel.title || "Прямой эфир"}
              serverOffset={serverOffset}
            />

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-bold">
                  <Tv className="h-5 w-5 text-primary" />
                  {config.brand.channelName || channel.title || "Телеканал"}
                </h1>
                {ownerToken && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" /> Вы владелец канала
                  </span>
                )}
              </div>
              {ownerToken && (
                <Link
                  to="/manage/$channelId"
                  params={{ channelId }}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Settings className="h-4 w-4" /> Управление каналом
                </Link>
              )}
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
  const m3uUrl = `${origin}/api/public/channel/${channelId}.m3u8`;
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
      <CopyRow icon={Share2} label="Ссылка на канал" value={watchUrl} />
      <CopyRow icon={Tv} label="Ссылка для IPTV-плеера (m3u8)" value={m3uUrl} />
      <CopyRow icon={Code2} label="Встраивание (iframe)" value={iframeCode} multiline />
      <CopyRow icon={Code2} label="Встраивание (JS-код)" value={jsCode} multiline />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        IPTV-ссылка отдаёт текущий по расписанию поток. Логотип и плашки видны только на нашем сайте и во
        встраивании — IPTV-плеер показывает чистое видео.
      </p>
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
        <button onClick={copy} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-primary transition hover:bg-accent">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      {multiline ? (
        <pre className="max-h-32 overflow-auto rounded-md border border-border bg-background p-2 text-[11px] leading-relaxed text-foreground/80">
          {value}
        </pre>
      ) : (
        <div className="truncate rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground/80">{value}</div>
      )}
    </div>
  );
}
