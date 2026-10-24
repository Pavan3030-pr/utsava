import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
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
      <body className="min-h-screen antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
