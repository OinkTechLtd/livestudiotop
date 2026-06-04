import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, Code2, MessagesSquare, Clock, Gauge, ShieldCheck, Play } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LiveStudio — потоки и живой чат без регистрации" },
      {
        name: "description",
        content:
          "Вставьте ссылку на поток, задайте время показа и смотрите в современном плеере с живым чатом. Встраивайте на сайт через iframe или JS. Без регистрации.",
      },
      { property: "og:title", content: "LiveStudio" },
      { property: "og:description", content: "Потоки и живой чат без регистрации." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Play, title: "Плеер в стиле 2026", text: "Перемотка, скорость, PiP, полный экран и горячее управление — как на YouTube." },
  { icon: Clock, title: "Расписание показа", text: "Укажите, когда поток начнётся — зрители увидят обратный отсчёт." },
  { icon: MessagesSquare, title: "Живой реальный чат", text: "Общий чат канала в реальном времени. Владелец удаляет сообщения." },
  { icon: Code2, title: "Встраивание", text: "Готовый iframe и JS-код, чтобы вставить плеер и чат на любой сайт." },
  { icon: Gauge, title: "Без регистрации", text: "Настройки хранятся локально в браузере. Создал ссылку — поделился." },
  { icon: ShieldCheck, title: "Любые источники", text: "YouTube, Twitch, HLS (.m3u8), MP4 и другие прямые ссылки." },
];

function Index() {
  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-primary" /> Запускайте трансляции без регистрации
          </div>
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Ваш поток. Ваш плеер. <span className="text-primary">Ваш чат.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            Вставьте ссылку на трансляцию, задайте время показа и получите современный плеер с живым
            чатом. Встраивайте на свой сайт одной строкой кода.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/studio"
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              Создать трансляцию
            </Link>
            <Link
              to="/docs"
              className="rounded-xl border border-border bg-card px-6 py-3 font-semibold transition hover:bg-accent"
            >
              Как встроить →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-card p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Готовы запустить?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Это бесплатно и занимает меньше минуты. Никаких аккаунтов и паролей.
          </p>
          <Link
            to="/studio"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Начать сейчас
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
