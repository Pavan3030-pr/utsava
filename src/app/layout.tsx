import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Indian-script fallbacks (so Hindi/Telugu/etc. plans look designed). Loaded via a plain stylesheet:
// Google serves per-script @font-face rules with unicode-range, so the browser only downloads
// a script's font file when the page actually contains that script.
const INDIC_FONTS =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&family=Noto+Sans+Malayalam:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Sans+Gujarati:wght@400;600;700&display=swap";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Utsava — AI Celebration & Event Planner",
  description:
    "Describe your wedding, birthday or community event and get a live-generated budget, timeline, vendor checklist and themes — in your language, with an AI copilot to refine it.",
  keywords: ["event planner", "wedding planner", "AI planner", "Indian wedding", "birthday", "Gemini"],
  openGraph: {
    title: "Utsava — plan any celebration with AI",
    description: "Budgets, timelines, vendor checklists and personalised ideas rooted in Indian culture.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#fffaf2", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={INDIC_FONTS} />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
