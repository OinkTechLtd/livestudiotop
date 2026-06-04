import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} LiveStudio — потоки без регистрации.
        </p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to="/docs" className="transition hover:text-foreground">
            Документация
          </Link>
          <Link to="/faq" className="transition hover:text-foreground">
            FAQ
          </Link>
          <Link to="/terms" className="transition hover:text-foreground">
            Условия
          </Link>
          <Link to="/privacy" className="transition hover:text-foreground">
            Конфиденциальность
          </Link>
        </nav>
      </div>
    </footer>
  );
}
