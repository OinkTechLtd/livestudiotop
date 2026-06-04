import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Verify the caller owns the channel (by secret owner_token), then delete a message.
export const deleteMessage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      channelId: z.string().min(1).max(64),
      messageId: z.string().uuid(),
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
      throw new Error("Недостаточно прав для удаления сообщения");
    }

    const { error: delError } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("id", data.messageId)
      .eq("channel_id", data.channelId);

    if (delError) throw new Error(delError.message);
    return { success: true };
  });

// Clear the whole chat for a channel (owner only).
export const clearChat = createServerFn({ method: "POST" })
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

    const { error: delError } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("channel_id", data.channelId);

    if (delError) throw new Error(delError.message);
    return { success: true };
  });
