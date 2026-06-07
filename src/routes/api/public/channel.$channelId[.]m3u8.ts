import { createFileRoute } from "@tanstack/react-router";
import { detectStreamKind } from "@/lib/livestudio";
import { getNowPlaying, normalizeConfig } from "@/lib/broadcast";

// IPTV endpoint: returns/redirects to the stream that is on air RIGHT NOW
// according to the channel schedule. Works for HLS (.m3u8) and direct media.
export const Route = createFileRoute("/api/public/channel/$channelId.m3u8")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.channelId;
        if (!id || id.length > 64) {
          return new Response("Bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("channels")
          .select("id,title,stream_url,config")
          .eq("id", id)
          .maybeSingle();

        if (error || !data) {
          return new Response("# Channel not found", {
            status: 404,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        const config = normalizeConfig(data.config, data.title || "Channel");
        const air = getNowPlaying(config, Date.now(), data.stream_url, data.title || "Live");

        const url = air.url;
        if (!url) {
          return new Response("# Off air", {
            status: 503,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        }

        const kind = detectStreamKind(url);

        // HLS source — redirect IPTV player straight to it.
        if (kind === "hls") {
          return new Response(null, {
            status: 302,
            headers: { location: url, "cache-control": "no-store" },
          });
        }

        // Direct media (mp4 etc.) — most IPTV players follow this too.
        if (kind === "file") {
          return new Response(null, {
            status: 302,
            headers: { location: url, "cache-control": "no-store" },
          });
        }

        // YouTube/Twitch/iframe cannot be served as IPTV.
        return new Response(
          `# This channel segment (${kind}) is not compatible with IPTV.\n# Watch on the website instead.`,
          {
            status: 409,
            headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
          },
        );
      },
    },
  },
});
