import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Lightweight server time so every viewer syncs to the same clock.
export const getServerTime = createServerFn({ method: "GET" }).handler(async () => {
  return { now: Date.now() };
});

const configSchema = z.any();

// Owner-only update of channel (title, main stream url, schedule/ads/brand config).
export const updateChannel = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      channelId: z.string().min(1).max(64),
      ownerToken: z.string().min(8).max(128),
      title: z.string().max(120).nullable().optional(),
      streamUrl: z.string().url().max(2000).optional(),
      scheduledAt: z.string().nullable().optional(),
      config: configSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { data: channel, error } = await supabaseAdmin
      .from("channels")
      .select("id, owner_token")
      .eq("id", data.channelId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!channel || channel.owner_token !== data.ownerToken) {
      throw new Error("Недостаточно прав для редактирования канала");
    }

    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.streamUrl !== undefined) patch.stream_url = data.streamUrl;
    if (data.scheduledAt !== undefined) patch.scheduled_at = data.scheduledAt;
    if (data.config !== undefined) patch.config = data.config;

    const { error: updErr } = await supabaseAdmin
      .from("channels")
      .update(patch)
      .eq("id", data.channelId);

    if (updErr) throw new Error(updErr.message);
    return { success: true };
  });

// Owner releases the channel: it keeps existing but becomes ownerless.
export const releaseChannel = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      channelId: z.string().min(1).max(64),
      ownerToken: z.string().min(8).max(128),
    }),
  )
  .handler(async ({ data }) => {
    const { data: channel, error } = await supabaseAdmin
      .from("channels")
      .select("id, owner_token")
      .eq("id", data.channelId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!channel || channel.owner_token !== data.ownerToken) {
      throw new Error("Недостаточно прав");
    }
    // set a sentinel ownerless token (column is NOT NULL)
    const { error: updErr } = await supabaseAdmin
      .from("channels")
      .update({ owner_token: "__ownerless__" })
      .eq("id", data.channelId);
    if (updErr) throw new Error(updErr.message);
    return { success: true };
  });
