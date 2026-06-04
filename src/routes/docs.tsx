import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, Prose } from "@/components/PageShell";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Документация — LiveStudio" },
      { name: "description", content: "Как создать трансляцию, настроить расписание и встроить плеер с чатом на сайт." },
    ],
  }),
  component: Docs,
});

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-auto rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-foreground/85">
      {children}
    </pre>
  );
}

function Docs() {
  return (
    <PageShell>
      <Prose title="Документация">
        <p>
          LiveStudio превращает любую ссылку на поток в современный плеер с живым чатом, который можно
          встроить на ваш сайт. Ниже — короткое руководство.
        </p>

        <h2>1. Создание трансляции</h2>
        <p>
          Откройте страницу{" "}
          <Link to="/studio">«Создать»</Link>, вставьте ссылку на поток, при желании добавьте
          название и время старта. Поддерживаются:
        </p>
        <ul>
          <li>YouTube (watch / live / youtu.be)</li>
          <li>Twitch (twitch.tv/канал)</li>
          <li>HLS-потоки с расширением .m3u8</li>
          <li>Прямые видеофайлы: MP4, WebM, OGG</li>
          <li>Прочие встраиваемые ссылки (через iframe)</li>
        </ul>

        <h2>2. Плеер</h2>
        <p>
          Для HLS и прямых видео доступен полный набор управления: воспроизведение/пауза, перемотка
          по шкале и кнопками ±10 секунд, громкость, скорость воспроизведения, картинка-в-картинке и
          полноэкранный режим. Для YouTube и Twitch используется их встроенный плеер.
        </p>

        <h2>3. Расписание</h2>
        <p>
          Если указать будущее время старта, зрители увидят обратный отсчёт. Как только время
          наступит, плеер появится автоматически.
        </p>

        <h2>4. Живой чат и модерация</h2>
        <p>
          Каждый канал имеет общий чат в реальном времени. Создатель канала автоматически становится
          владельцем (право хранится в его браузере) и может удалять отдельные сообщения или очищать
          чат целиком.
        </p>

        <h2>5. Встраивание через iframe</h2>
        <p>На странице трансляции скопируйте готовый код и вставьте его в HTML:</p>
        <Code>{`<iframe
  src="https://ВАШ-ДОМЕН/embed/CHANNEL_ID"
  width="100%" height="640"
  style="border:0;border-radius:12px"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  allowfullscreen></iframe>`}</Code>

        <h2>6. Встраивание через JS</h2>
        <p>Если нужен программный способ — используйте JS-сниппет:</p>
        <Code>{`<div id="livestudio-CHANNEL_ID"></div>
<script>
(function(){
  var f=document.createElement('iframe');
  f.src='https://ВАШ-ДОМЕН/embed/CHANNEL_ID';
  f.width='100%';f.height='640';
  f.style.border='0';f.style.borderRadius='12px';
  f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen=true;
  document.getElementById('livestudio-CHANNEL_ID').appendChild(f);
})();
</script>`}</Code>

        <h2>7. Деплой</h2>
        <p>
          Проект разворачивается на Vercel, Netlify, Render и других платформах. Инструкции — в файле
          README репозитория.
        </p>
      </Prose>
    </PageShell>
  );
}
