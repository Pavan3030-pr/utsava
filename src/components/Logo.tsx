import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-saffron to-kumkum font-bold text-white shadow-md"
    >
      उ
    </span>
  );
}

export function SiteHeader({ cta = true }: { cta?: boolean }) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-ivory/85 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Utsava home">
          <LogoMark />
          <span className="h-display text-xl font-semibold">Utsava</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-2 text-sm font-medium">
          <Link href="/events" className="rounded-full px-4 py-2 text-soft hover:bg-cream hover:text-ink">My events</Link>
          {cta && <Link href="/create" className="btn btn-primary btn-sm">Plan an event</Link>}
        </nav>
      </div>
    </header>
  );
}
