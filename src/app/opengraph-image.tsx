import { ImageResponse } from "next/og";

export const alt = "Utsava — AI celebration planner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90,
        background: "linear-gradient(135deg, #fffaf2 0%, #ffe8c2 55%, #fbd0dc 100%)", color: "#231a14" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#f59e0b,#b4234e)", display: "flex" }} />
          <div style={{ fontSize: 46, fontWeight: 700 }}>Utsava</div>
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 40, display: "flex" }}>Every celebration,</div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, color: "#b4234e", display: "flex" }}>planned in a sentence.</div>
        <div style={{ fontSize: 30, marginTop: 36, color: "#5c4f45", display: "flex" }}>
          AI budget · timeline · vendors · guest RSVPs · spend tracker — powered by Gemini
        </div>
      </div>
    ),
    size,
  );
}
