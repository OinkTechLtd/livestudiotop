import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { TVPlayer } from "@/components/TVPlayer";
import { LiveChat } from "@/components/LiveChat";
import { supabase } from "@/integrations/supabase/client";
import { ownerTokenFor } from "@/lib/livestudio";
import { normalizeConfig, type ChannelConfig } from "@/lib/broadcast";
import { getServerTime } from "@/lib/channel.functions";

export const Route = createFileRoute("/embed/$channelId")({
  head: () => ({ meta: [{ title: "LiveStudio embed" }] }),
  component: Embed,
});

type Channel = { title: string | null; stream_url: string; config: unknown };

function Embed() {
  const { channelId } = Route.useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [config, setConfig] = useState<ChannelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverOffset, setServerOffset] = useState(0);
  const ownerToken = useMemo(() => ownerTokenFor(channelId), [channelId]);
  const fetchTime = useServerFn(getServerTime);

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

  useEffect(() => {
    let active = true;
    supabase
      .from("channels")
      .select("title,stream_url,config")
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

  useEffect(() => {
    const ch = supabase
      .channel(`embed-${channelId}`)
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
      <div className="grid h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!channel || !config) {
    return (
      <div className="grid h-screen place-items-center bg-background px-4 text-center text-sm text-muted-foreground">
        Канал не найден.
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] gap-2 bg-background p-2 sm:grid-cols-[1fr_320px] sm:grid-rows-1">
      <div className="min-h-0">
        <TVPlayer
          config={config}
          fallbackUrl={channel.stream_url}
          fallbackTitle={channel.title || "Прямой эфир"}
          serverOffset={serverOffset}
        />
      </div>
      <div className="min-h-0">
        <LiveChat channelId={channelId} ownerToken={ownerToken} compact />
      </div>
    </div>
  );
}
