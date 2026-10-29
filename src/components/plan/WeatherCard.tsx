"use client";

import { useEffect, useState } from "react";
import type { WeatherResult } from "@/lib/weather";
import { Panel } from "./ui";

export function WeatherCard({ city, date }: { city: string; date: string }) {
  const [w, setW] = useState<WeatherResult | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none">("loading");

  useEffect(() => {
    const ac = new AbortController();
    setState("loading");
    fetch(`/api/weather?city=${encodeURIComponent(city)}&date=${date}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no data"))))
      .then((data: WeatherResult) => { setW(data); setState("ready"); })
      .catch((e) => { if (!ac.signal.aborted) { void e; setState("none"); } });
    return () => ac.abort();
  }, [city, date]);

  if (state === "none") return null;
  if (state === "loading" || !w) return <Panel kicker="Weather on the day"><div className="shimmer h-20" aria-busy="true" /></Panel>;

  const rainTone = w.rainChance >= 60 ? "bg-rose-soft text-kumkum-dark" : w.rainChance >= 30 ? "bg-gold-soft text-saffron-dark" : "bg-leaf-soft text-leaf";
  return (
    <Panel kicker={w.mode === "forecast" ? "Live forecast" : "Typical weather for your dates"} title={`Weather in ${w.place}`}>
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-cream/70 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-soft">High / Low</dt><dd className="h-display mt-1 text-xl font-semibold tabular-nums">{Math.round(w.maxC)}° / {Math.round(w.minC)}°C</dd></div>
        <div className={`rounded-2xl p-3 ${rainTone}`}><dt className="text-xs font-semibold uppercase tracking-wide">{w.mode === "forecast" ? "Rain chance" : "Rainy days"}</dt><dd className="h-display mt-1 text-xl font-semibold tabular-nums">{Math.round(w.rainChance)}%</dd></div>
        <div className="rounded-2xl bg-cream/70 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-soft">Avg rainfall</dt><dd className="h-display mt-1 text-xl font-semibold tabular-nums">{w.rainMm} mm</dd></div>
      </dl>
      <ul className="mt-4 space-y-2 text-sm">
        {w.advice.map((a) => <li key={a} className="flex gap-2"><span aria-hidden="true" className="text-saffron">☂</span><span>{a}</span></li>)}
      </ul>
      <p className="mt-3 text-xs text-soft">{w.source}{w.mode === "climate" && w.sampleDays ? ` · ${w.sampleDays} sample days` : ""} · Weather data by <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a> (CC BY 4.0)</p>
    </Panel>
  );
}
