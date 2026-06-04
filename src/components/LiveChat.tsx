import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Trash2, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { deleteMessage, clearChat } from "@/lib/chat.functions";
import { getName, setName as persistName } from "@/lib/livestudio";

type Message = {
  id: string;
  channel_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export function LiveChat({
  channelId,
  ownerToken,
  compact = false,
}: {
  channelId: string;
  ownerToken: string | null;
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const delFn = useServerFn(deleteMessage);
  const clrFn = useServerFn(clearChat);
  const isOwner = !!ownerToken;

  useEffect(() => {
    setName(getName());
  }, []);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    let active = true;
    supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (active && data) {
          setMessages(data as Message[]);
          scrollDown();
        }
      });

    const channel = supabase
      .channel(`chat-${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          setMessages((prev) => {
            const msg = payload.new as Message;
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollDown();
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as Message).id));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [channelId, scrollDown]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    const author = (name.trim() || "Гость").slice(0, 40);
    if (!trimmed || sending) return;
    setSending(true);
    persistName(author);
    const { error } = await supabase
      .from("messages")
      .insert({ channel_id: channelId, author_name: author, body: trimmed.slice(0, 500) });
    setSending(false);
    if (!error) setBody("");
  };

  const remove = async (id: string) => {
    if (!ownerToken) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await delFn({ data: { channelId, messageId: id, ownerToken } });
    } catch {
      /* ignore – realtime will re-sync on reload */
    }
  };

  const clearAll = async () => {
    if (!ownerToken) return;
    if (!confirm("Очистить весь чат?")) return;
    setMessages([]);
    try {
      await clrFn({ data: { channelId, ownerToken } });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Живой чат
        </div>
        {isOwner ? (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Очистить
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">{messages.length} сообщ.</span>
        )}
      </div>

      <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Пока тихо. Напишите первым 👋
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="group flex items-start gap-2 text-sm">
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-primary">{m.author_name}</span>{" "}
              <span className="break-words text-foreground/90">{m.body}</span>
            </div>
            {isOwner && (
              <button
                onClick={() => remove(m.id)}
                className="opacity-0 transition group-hover:opacity-100"
                aria-label="Удалить"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={send} className="border-t border-border p-3">
        {!compact && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            maxLength={40}
            className="mb-2 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        )}
        <div className="flex items-center gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Сообщение…"
            maxLength={500}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
