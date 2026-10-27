import type { ReactNode } from "react";

/** Streaming objects can contain holes — always iterate through this. */
export function list<T>(arr: (T | undefined | null)[] | undefined | null): T[] {
  return (arr ?? []).filter((x): x is T => x != null);
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true" className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="shimmer h-4" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function Panel({ title, kicker, children, className = "" }: { title?: string; kicker?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`surface p-6 sm:p-7 ${className}`}>
      {kicker && <p className="eyebrow !text-saffron-dark">{kicker}</p>}
      {title && <h3 className="h-display mt-1.5 text-2xl font-semibold">{title}</h3>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

/** Shown while a section hasn't streamed in yet. */
export function Waiting({ streaming, label, children, ready }: { streaming: boolean; label: string; ready: boolean; children: ReactNode }) {
  if (ready) return <>{children}</>;
  return streaming ? (
    <div role="status" aria-label={`Writing ${label}`}><Skeleton lines={4} /></div>
  ) : (
    <p className="text-sm text-soft">No {label} yet.</p>
  );
}
