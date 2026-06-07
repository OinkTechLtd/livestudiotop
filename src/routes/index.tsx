import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, Code2, MessagesSquare, CalendarClock, Megaphone, Tv } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LiveStudio — создай свой телеканал онлайн без регистрации" },
      {
        name: "description",
        content:
          "Соберите собственный телеканал: расписание эфира, премьеры в стиле ТВ, реклама, логотип и живой чат. Синхронный эфир 24/7 у всех зрителей, встраивание на сайт и ссылка для IPTV. Без регистрации.",
      },
      { property: "og:title", content: "LiveStudio — твой телеканал" },
      { property: "og:description", content: "Создай независимый телеканал с расписанием, премьерами и рекламой." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: CalendarClock, title: "Расписание 24/7", text: "Задайте сетку эфира: передачи и премьеры в точное время — у всех зрителей синхронно." },
  { icon: Tv, title: "Премьеры как на ТВ", text: "Плашка «ПРЕМЬЕРА», логотип канала и титры поверх видео — в стиле ТНТ/СТС." },
  { icon: Megaphone, title: "Реклама и преролл", text: "Вставки каждые N минут, ваши ролики или партнёрка, заглушка с контактом." },
  { icon: MessagesSquare, title: "Живой реальный чат", text: "Общий чат канала в реальном времени. Владелец удаляет сообщения." },
  { icon: Code2, title: "Встраивание и IPTV", text: "iframe, JS-код и ссылка .m3u8 для IPTV-плееров." },
  { icon: Radio, title: "Полная кастомизация", text: "Логотип, цвета, название, заглушка — настройте канал под себя. Без регистрации." },
];

function Index() {
  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-primary" /> Создавайте телеканалы без регистрации
          </div>
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Свой телеканал. <span className="text-primary">Свой эфир 24/7.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            Соберите независимый телеканал в стиле ТНТ или СТС: расписание передач, премьеры,
            реклама, логотип и живой чат. Эфир синхронен у всех зрителей. Встраивайте на сайт или
            смотрите в IPTV.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/studio"
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              Создать телеканал
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
