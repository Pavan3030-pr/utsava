import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Utsava — AI Celebration & Event Planner",
  description:
    "Plan weddings, birthdays & community events with AI. Budgets, timelines, vendor checklists and personalized ideas rooted in Indian culture.",
  keywords: ["event planner", "wedding planner", "AI planner", "Indian wedding", "utsava"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#fafafa] text-gray-800 antialiased">
        {children}
      </body>
    </html>
  );
}
