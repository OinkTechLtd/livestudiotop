import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Link2, Clock, Type } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import {
  detectStreamKind,
  makeChannelId,
  makeToken,
  saveOwned,
  validateStreamUrl,
} from "@/lib/livestudio";
import { defaultConfig } from "@/lib/broadcast";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Создать трансляцию — LiveStudio" },
      { name: "description", content: "Вставьте ссылку на поток и задайте время показа. Без регистрации." },
    ],
  }),
  component: Studio,
});

function Studio() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    const v = validateStreamUrl(trimmed);
    if (!v.ok) {
      setError(v.error || "Некорректная ссылка");
      return;
    }
    setLoading(true);
    const id = makeChannelId();
    const token = makeToken();
    const { error: insErr } = await supabase.from("channels").insert({
      id,
      title: title.trim() || null,
      stream_url: trimmed,
      stream_type: detectStreamKind(trimmed),
      scheduled_at: schedule ? new Date(schedule).toISOString() : null,
      owner_token: token,
      config: defaultConfig(title.trim() || "Мой канал") as never,
    });
    if (insErr) {
      setLoading(false);
      setError("Не удалось создать канал. Попробуйте ещё раз.");
      return;
    }
    saveOwned(id, token);
    navigate({ to: "/manage/$channelId", params: { channelId: id } });
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-3xl font-bold">Создать трансляцию</h1>
        <p className="mt-2 text-muted-foreground">
          Вставьте ссылку на поток. Поддерживаются YouTube, Twitch, HLS (.m3u8), MP4 и другие
          прямые ссылки.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field icon={Link2} label="Ссылка на поток *">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=… или https://…/stream.m3u8"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:border-primary"
              required
            />
          </Field>

          <Field icon={Type} label="Название (необязательно)">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Вечерний стрим"
              maxLength={120}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:border-primary"
            />
          </Field>

          <Field icon={Clock} label="Время начала показа (необязательно)">
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Если указано будущее время — зрители увидят обратный отсчёт до старта.
            </p>
          </Field>

          {error && <p className="text-sm text-primary">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Запустить трансляцию
          </button>
        </form>
      </div>
    </PageShell>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </span>
      {children}
    </label>
  );
}
