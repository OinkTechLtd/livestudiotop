import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { hasConsent, setConsent } from "@/lib/livestudio";

export function ConsentGate() {
  const [open, setOpen] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasConsent()) setOpen(true);
  }, []);

  if (!open) return null;

  const canAccept = scrolledEnd && agreeTerms && agreePrivacy && agreeAge;

  const accept = () => {
    if (!canAccept) return;
    setConsent();
    setOpen(false);
  };

  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledEnd(true);
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold">Добро пожаловать в LiveStudio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Перед использованием прочитайте условия и подтвердите согласие.
          </p>
        </div>

        <div
          ref={boxRef}
          onScroll={onScroll}
          className="flex-1 space-y-3 overflow-y-auto px-6 py-4 text-sm leading-relaxed text-foreground/90"
        >
          <p>
            <strong>LiveStudio</strong> — бесплатный инструмент, который позволяет вставить ссылку
            на видеопоток, задать время показа и смотреть его в современном плеере вместе с живым
            чатом. Регистрация не требуется — все ваши настройки хранятся локально в браузере.
          </p>
          <p>
            Сервис не размещает и не хранит чужой видеоконтент. Вы самостоятельно указываете ссылку
            на поток и несёте полную ответственность за её содержание и законность.
          </p>
          <p>
            Запрещено использовать сервис для распространения незаконного, оскорбительного контента,
            нарушения авторских прав или прав третьих лиц, а также для спама в чате.
          </p>
          <p>
            Чат является публичным: сообщения видны всем участникам канала. Владелец канала может
            удалять сообщения и очищать чат. Не публикуйте персональные данные.
          </p>
          <p>
            Мы используем только технически необходимое локальное хранилище браузера и анонимный
            бэкенд для работы чата. Подробности — в{" "}
            <Link to="/terms" className="text-primary underline">
              Условиях использования
            </Link>{" "}
            и{" "}
            <Link to="/privacy" className="text-primary underline">
              Политике конфиденциальности
            </Link>
            .
          </p>
          <p className="text-muted-foreground">
            Прокрутите этот текст до конца, чтобы продолжить. Используя сервис, вы подтверждаете, что
            ознакомились с указанными документами и принимаете их полностью.
          </p>
          <div className="flex items-center gap-2 pt-2 text-xs text-primary">
            <CheckCircle2 className={`h-4 w-4 ${scrolledEnd ? "opacity-100" : "opacity-30"}`} />
            {scrolledEnd ? "Текст прочитан" : "Прокрутите до конца…"}
          </div>
        </div>

        <div className="space-y-2 border-t border-border px-6 py-4">
          <Check checked={agreeTerms} onChange={setAgreeTerms} disabled={!scrolledEnd}>
            Я прочитал(а) и принимаю{" "}
            <Link to="/terms" className="text-primary underline">
              Условия использования
            </Link>
          </Check>
          <Check checked={agreePrivacy} onChange={setAgreePrivacy} disabled={!scrolledEnd}>
            Я прочитал(а) и принимаю{" "}
            <Link to="/privacy" className="text-primary underline">
              Политику конфиденциальности
            </Link>
          </Check>
          <Check checked={agreeAge} onChange={setAgreeAge} disabled={!scrolledEnd}>
            Мне исполнилось 16 лет, и я несу ответственность за размещаемые ссылки и сообщения
          </Check>

          <button
            onClick={accept}
            disabled={!canAccept}
            className="mt-2 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Принять и продолжить
          </button>
        </div>
      </div>
    </div>
  );
}

function Check({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 text-sm ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[oklch(0.63_0.24_25)]"
      />
      <span className="text-foreground/90">{children}</span>
    </label>
  );
}
