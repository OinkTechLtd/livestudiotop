import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LiveChat } from "@/components/LiveChat";
import { supabase } from "@/integrations/supabase/client";
import { ownerTokenFor } from "@/lib/livestudio";

export const Route = createFileRoute("/embed/$channelId")({
  head: () => ({ meta: [{ title: "LiveStudio embed" }] }),
  component: Embed,
});

type Channel = { stream_url: string; scheduled_at: string | null };

function Embed() {
  const { channelId } = Route.useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const ownerToken = useMemo(() => ownerTokenFor(channelId), [channelId]);

  useEffect(() => {
    let active = true;
    supabase
      .from("channels")
      .select("stream_url,scheduled_at")
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
      <div className="grid h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="grid h-screen place-items-center bg-background px-4 text-center text-sm text-muted-foreground">
        Трансляция не найдена.
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] gap-2 bg-background p-2 sm:grid-cols-[1fr_320px] sm:grid-rows-1">
      <div className="min-h-0">
        <VideoPlayer url={channel.stream_url} />
      </div>
      <div className="min-h-0">
        <LiveChat channelId={channelId} ownerToken={ownerToken} compact />
      </div>
    </div>
  );
}
