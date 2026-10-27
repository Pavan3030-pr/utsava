export default function Loading() {
  return (
    <div className="ambient min-h-screen" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="container-x py-16"><div className="shimmer h-64" aria-hidden="true" /></div>
    </div>
  );
}
