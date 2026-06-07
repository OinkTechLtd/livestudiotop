import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Tv,
  CalendarClock,
  Megaphone,
  Palette,
  MonitorOff,
  ExternalLink,
  ShieldOff,
  Check,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { ownerTokenFor, releaseOwned, validateStreamUrl, makeChannelId } from "@/lib/livestudio";
import { updateChannel, releaseChannel } from "@/lib/channel.functions";
import {
  normalizeConfig,
  type ChannelConfig,
  type ScheduleBlock,
} from "@/lib/broadcast";

export const Route = createFileRoute("/manage/$channelId")({
  head: () => ({ meta: [{ title: "Управление каналом — LiveStudio" }] }),
  component: Manage,
});

type Tab = "air" | "schedule" | "ads" | "brand" | "filler";

function Manage() {
  const { channelId } = Route.useParams();
  const navigate = useNavigate();
  const ownerToken = useMemo(() => ownerTokenFor(channelId), [channelId]);
  const save = useServerFn(updateChannel);
  const release = useServerFn(releaseChannel);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [config, setConfig] = useState<ChannelConfig | null>(null);
  const [tab, setTab] = useState<Tab>("air");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("channels")
      .select("id,title,stream_url,config")
      .eq("id", channelId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (!data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setTitle(data.title || "");
        setStreamUrl(data.stream_url || "");
        setConfig(normalizeConfig(data.config, data.title || "Мой канал"));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [channelId]);

  const patch = (fn: (c: ChannelConfig) => ChannelConfig) =>
    setConfig((c) => (c ? fn(c) : c));

  const handleSave = async () => {
    if (!config) return;
    setError(null);
    if (streamUrl.trim()) {
      const v = validateStreamUrl(streamUrl);
      if (!v.ok) {
        setError("Основная ссылка: " + v.error);
        setTab("air");
        return;
      }
    }
    // validate schedule urls
    for (const b of config.schedule.blocks) {
      const v = validateStreamUrl(b.url);
      if (!v.ok) {
        setError(`Блок «${b.title || "без названия"}»: ${v.error}`);
        setTab("schedule");
        return;
      }
    }
    setSaving(true);
    try {
      await save({
        data: {
          channelId,
          ownerToken: ownerToken!,
          title: title.trim() || null,
          streamUrl: streamUrl.trim() || undefined,
          config,
        },
      });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="grid place-items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (notFound) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md px-4 py-32 text-center">
          <h1 className="text-2xl font-bold">Канал не найден</h1>
        </div>
      </PageShell>
    );
  }

  if (!ownerToken) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md px-4 py-32 text-center">
          <h1 className="text-2xl font-bold">Нет прав на управление</h1>
          <p className="mt-2 text-muted-foreground">
            Этим каналом можно управлять только из браузера, где он был создан.
          </p>
          <Link
            to="/watch/$channelId"
            params={{ channelId }}
            className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
          >
            Смотреть канал
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!config) return null;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "air", label: "Эфир", icon: Tv },
    { id: "schedule", label: "Расписание", icon: CalendarClock },
    { id: "ads", label: "Реклама", icon: Megaphone },
    { id: "brand", label: "Бренд", icon: Palette },
    { id: "filler", label: "Заглушка", icon: MonitorOff },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Управление каналом</h1>
            <p className="text-sm text-muted-foreground">Изменения применяются у всех зрителей мгновенно.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/watch/$channelId"
              params={{ channelId }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" /> Открыть канал
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}
        {savedAt && !error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
            <Check className="h-4 w-4" /> Сохранено и применено в эфире
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-border bg-card p-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "air" && (
          <Section>
            <FieldLabel>Основная ссылка эфира (24/7, если расписание не задано)</FieldLabel>
            <input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://…/stream.m3u8 или YouTube/Twitch"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Поддержка: YouTube, Twitch, HLS (.m3u8), MP4, встраиваемые плееры. Ссылка без плеера не сохранится.
            </p>
            <FieldLabel className="mt-5">Название канала</FieldLabel>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputCls} />
          </Section>
        )}

        {tab === "schedule" && (
          <ScheduleEditor blocks={config.schedule.blocks} onChange={(blocks) => patch((c) => ({ ...c, schedule: { blocks } }))} />
        )}

        {tab === "ads" && <AdsEditor config={config} patch={patch} />}
        {tab === "brand" && <BrandEditor config={config} patch={patch} />}
        {tab === "filler" && <FillerEditor config={config} patch={patch} />}

        <div className="mt-10 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-destructive">
            <ShieldOff className="h-4 w-4" /> Отказаться от владения
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Канал продолжит работать, но станет без владельца — вы потеряете возможность редактировать его.
          </p>
          <button
            onClick={async () => {
              if (!confirm("Отказаться от управления каналом? Это необратимо.")) return;
              try {
                await release({ data: { channelId, ownerToken: ownerToken! } });
                releaseOwned(channelId);
                navigate({ to: "/watch/$channelId", params: { channelId } });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Ошибка");
              }
            }}
            className="mt-3 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            Отказаться от канала
          </button>
        </div>
      </div>
    </PageShell>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

function Section({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5">{children}</div>;
}
function FieldLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`mb-1.5 block text-sm font-medium ${className}`}>{children}</label>;
}

function ScheduleEditor({
  blocks,
  onChange,
}: {
  blocks: ScheduleBlock[];
  onChange: (b: ScheduleBlock[]) => void;
}) {
  const add = () =>
    onChange([
      ...blocks,
      {
        id: makeChannelId(),
        title: "Новая передача",
        url: "",
        startsAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        durationMin: 60,
        isPremiere: false,
        premiereLabel: "ПРЕМЬЕРА",
      },
    ]);
  const upd = (id: string, p: Partial<ScheduleBlock>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const del = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  return (
    <Section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Блоки эфира с точным временем. В указанное время у всех зрителей включится этот контент.
        </p>
        <button onClick={add} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Блок
        </button>
      </div>
      <div className="space-y-3">
        {blocks.length === 0 && <p className="text-sm text-muted-foreground">Пока нет блоков — добавьте передачу или премьеру.</p>}
        {blocks.map((b) => (
          <div key={b.id} className="rounded-lg border border-border bg-background p-3">
            <div className="flex gap-2">
              <input value={b.title} onChange={(e) => upd(b.id, { title: e.target.value })} placeholder="Название" className={inputCls} />
              <button onClick={() => del(b.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <input value={b.url} onChange={(e) => upd(b.id, { url: e.target.value })} placeholder="Ссылка на видео/поток" className={`${inputCls} mt-2`} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Старт</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(b.startsAt)}
                  onChange={(e) => upd(b.id, { startsAt: new Date(e.target.value).toISOString() })}
                  className={inputCls}
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Длительность (мин)</span>
                <input type="number" min={1} value={b.durationMin} onChange={(e) => upd(b.id, { durationMin: Number(e.target.value) || 1 })} className={inputCls} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!b.isPremiere} onChange={(e) => upd(b.id, { isPremiere: e.target.checked })} />
                Премьера
              </label>
              {b.isPremiere && (
                <input value={b.premiereLabel || ""} onChange={(e) => upd(b.id, { premiereLabel: e.target.value })} placeholder="ПРЕМЬЕРА / НОВЫЙ СЕЗОН" className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AdsEditor({ config, patch }: { config: ChannelConfig; patch: (fn: (c: ChannelConfig) => ChannelConfig) => void }) {
  const ads = config.ads;
  const set = (p: Partial<typeof ads>) => patch((c) => ({ ...c, ads: { ...c.ads, ...p } }));
  return (
    <Section>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={ads.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        Включить рекламные вставки
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Реклама каждые (мин)</FieldLabel>
          <input type="number" min={1} value={ads.everyMin} onChange={(e) => set({ everyMin: Number(e.target.value) || 1 })} className={inputCls} />
        </div>
        <div>
          <FieldLabel>Длительность рекламы (мин)</FieldLabel>
          <input type="number" min={1} value={ads.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) || 1 })} className={inputCls} />
        </div>
      </div>
      <FieldLabel className="mt-4">Преролл (реклама в начале блока)</FieldLabel>
      <input value={ads.prerollUrl || ""} onChange={(e) => set({ prerollUrl: e.target.value })} placeholder="Ссылка на рекламный ролик (необязательно)" className={inputCls} />
      <div className="mt-2">
        <span className="text-xs text-muted-foreground">Длительность преролла (мин)</span>
        <input type="number" min={0} value={ads.prerollMin || 0} onChange={(e) => set({ prerollMin: Number(e.target.value) || 0 })} className={inputCls} />
      </div>

      <FieldLabel className="mt-4">Рекламные ролики (ротация во вставках)</FieldLabel>
      <div className="space-y-2">
        {ads.items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input value={it.url} onChange={(e) => set({ items: ads.items.map((x, j) => (j === i ? { url: e.target.value } : x)) })} placeholder="Ссылка на рекламу / партнёрку" className={inputCls} />
            <button onClick={() => set({ items: ads.items.filter((_, j) => j !== i) })} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button onClick={() => set({ items: [...ads.items, { url: "" }] })} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
          <Plus className="h-4 w-4" /> Добавить ролик
        </button>
      </div>

      <FieldLabel className="mt-4">Текст заглушки, если рекламы нет</FieldLabel>
      <input value={ads.fallbackText} onChange={(e) => set({ fallbackText: e.target.value })} className={inputCls} />
      <FieldLabel className="mt-4">Контакт для заказа рекламы (показывается на заглушке)</FieldLabel>
      <input value={ads.contactText} onChange={(e) => set({ contactText: e.target.value })} placeholder="Заказать рекламу: @yourcontact" className={inputCls} />
    </Section>
  );
}

function BrandEditor({ config, patch }: { config: ChannelConfig; patch: (fn: (c: ChannelConfig) => ChannelConfig) => void }) {
  const b = config.brand;
  const set = (p: Partial<typeof b>) => patch((c) => ({ ...c, brand: { ...c.brand, ...p } }));
  return (
    <Section>
      <FieldLabel>Название канала (если нет логотипа)</FieldLabel>
      <input value={b.channelName} onChange={(e) => set({ channelName: e.target.value })} className={inputCls} />
      <FieldLabel className="mt-4">Ссылка на логотип (PNG, желательно с прозрачным фоном)</FieldLabel>
      <input value={b.logoUrl || ""} onChange={(e) => set({ logoUrl: e.target.value })} placeholder="https://…/logo.png" className={inputCls} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Положение логотипа</FieldLabel>
          <select value={b.logoPosition} onChange={(e) => set({ logoPosition: e.target.value as typeof b.logoPosition })} className={inputCls}>
            <option value="tl">Слева сверху</option>
            <option value="tr">Справа сверху</option>
            <option value="bl">Слева снизу</option>
            <option value="br">Справа снизу</option>
          </select>
        </div>
        <div>
          <FieldLabel>Акцентный цвет (плашка премьеры)</FieldLabel>
          <input type="color" value={b.accentColor} onChange={(e) => set({ accentColor: e.target.value })} className="h-10 w-full rounded-lg border border-input bg-background" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Размер логотипа (px): {b.logoSize}</FieldLabel>
          <input type="range" min={24} max={120} value={b.logoSize} onChange={(e) => set({ logoSize: Number(e.target.value) })} className="w-full" />
        </div>
        <div>
          <FieldLabel>Прозрачность: {Math.round(b.logoOpacity * 100)}%</FieldLabel>
          <input type="range" min={20} max={100} value={Math.round(b.logoOpacity * 100)} onChange={(e) => set({ logoOpacity: Number(e.target.value) / 100 })} className="w-full" />
        </div>
      </div>
    </Section>
  );
}

function FillerEditor({ config, patch }: { config: ChannelConfig; patch: (fn: (c: ChannelConfig) => ChannelConfig) => void }) {
  const f = config.filler;
  const set = (p: Partial<typeof f>) => patch((c) => ({ ...c, filler: { ...c.filler, ...p } }));
  return (
    <Section>
      <FieldLabel>Текст заглушки (когда ничего не идёт)</FieldLabel>
      <input value={f.text} onChange={(e) => set({ text: e.target.value })} className={inputCls} />
      <FieldLabel className="mt-4">Фоновое изображение заглушки (необязательно)</FieldLabel>
      <input value={f.posterUrl || ""} onChange={(e) => set({ posterUrl: e.target.value })} placeholder="https://…/poster.jpg" className={inputCls} />
    </Section>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
