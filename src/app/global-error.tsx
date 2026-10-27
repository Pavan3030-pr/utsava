"use client";

/** Last-resort boundary: renders when the root layout itself fails. Must bring its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fffaf2", color: "#1c1410", margin: 0 }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: "1.75rem", marginBottom: ".5rem" }}>That didn’t go to plan.</h1>
            <p style={{ color: "#6b5d50" }}>An unexpected error occurred. Your saved events are safe.</p>
            <button type="button" onClick={reset} style={{ marginTop: "1.5rem", padding: ".7rem 1.4rem", borderRadius: 999, border: 0, background: "#b4234e", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
