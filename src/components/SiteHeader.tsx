import { Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";

const nav = [
  { to: "/studio", label: "Создать" },
  { to: "/docs", label: "Docs" },
  { to: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Radio className="h-4 w-4" />
          </span>
          <span>
            Live<span className="text-primary">Studio</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 text-foreground bg-accent" }}
            >
              {n.label}
            </Link>
          ))}
          <Link
            to="/studio"
            className="ml-1 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition hover:opacity-90"
          >
            Запустить
          </Link>
        </nav>
      </div>
    </header>
  );
}
