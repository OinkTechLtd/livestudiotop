import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Prose } from "@/components/PageShell";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — LiveStudio" },
      { name: "description", content: "Частые вопросы о LiveStudio: источники потоков, чат, встраивание, приватность." },
    ],
  }),
  component: Faq,
});

const items = [
  {
    q: "Нужна ли регистрация?",
    a: "Нет. LiveStudio работает полностью без регистрации и авторизации. Настройки владельца канала хранятся локально в вашем браузере.",
  },
  {
    q: "Какие ссылки на потоки поддерживаются?",
    a: "YouTube, Twitch, HLS-потоки (.m3u8), прямые видеофайлы (MP4, WebM) и большинство встраиваемых ссылок через iframe.",
  },
  {
    q: "Как работает время показа?",
    a: "При создании трансляции можно указать будущее время старта. До его наступления зрители видят обратный отсчёт, затем автоматически появляется плеер.",
  },
  {
    q: "Чат действительно реальный?",
    a: "Да. Чат общий для канала и обновляется в реальном времени для всех зрителей. Владелец канала может удалять отдельные сообщения и очищать весь чат.",
  },
  {
    q: "Как встроить плеер на свой сайт?",
    a: "На странице трансляции есть готовый iframe-код и JS-сниппет. Скопируйте любой из них и вставьте в HTML своего сайта.",
  },
  {
    q: "Кто отвечает за содержание потока?",
    a: "Владелец канала. LiveStudio не хранит и не размещает чужой видеоконтент — мы только воспроизводим указанную вами ссылку.",
  },
  {
    q: "Можно ли удалить трансляцию?",
    a: "Очистите локальные данные браузера, чтобы убрать права владельца. Сам канал перестанет быть доступен после удаления локальной ссылки, так как вы её больше не распространяете.",
  },
];

function Faq() {
  return (
    <PageShell>
      <Prose title="Частые вопросы">
        <div className="space-y-3">
          {items.map((it) => (
            <details
              key={it.q}
              className="group rounded-xl border border-border bg-card p-4 [&_summary]:cursor-pointer"
            >
              <summary className="flex items-center justify-between font-semibold marker:content-none">
                {it.q}
                <span className="text-primary transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{it.a}</p>
            </details>
          ))}
        </div>
      </Prose>
    </PageShell>
  );
}
