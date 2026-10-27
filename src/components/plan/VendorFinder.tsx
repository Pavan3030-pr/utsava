"use client";

import { useEffect, useRef, useState } from "react";
import { categoryKey, type PlaceResult, type PlacesResponse } from "@/lib/place-categories";

type State = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "done"; data: PlacesResponse };

export function VendorFinder({ category, city, shortlisted, onAdd }: {
  category: string; city: string; shortlisted: Set<string>; onAdd: (p: PlaceResult) => void;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const acRef = useRef<AbortController | null>(null);
  useEffect(() => () => acRef.current?.abort(), []);
  if (!categoryKey(category)) return null;

  const run = async () => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/places?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`, { signal: ac.signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Search failed");
      setState({ status: "done", data: body as PlacesResponse });
    } catch (e) {
      if (ac.signal.aborted) return;
      setState({ status: "error", message: e instanceof Error ? e.message : "Search failed" });
    }
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      {state.status !== "done" && (
        <button type="button" onClick={run} disabled={state.status === "loading"} className="btn btn-ghost btn-sm">
          {state.status === "loading" ? "Searching nearby…" : `Find real ${category.toLowerCase()} in ${city}`}
        </button>
      )}
      {state.status === "error" && <p role="alert" className="mt-2 text-sm text-kumkum-dark">{state.message}</p>}
      {state.status === "done" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-soft">{state.data.label} near {state.data.place.name}</p>
          {state.data.results.length === 0 ? (
            <p className="mt-2 text-sm text-soft">No listed results in OpenStreetMap for this area. Try the Google Maps link above.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {state.data.results.map((p) => {
                const added = shortlisted.has(p.name.toLowerCase());
                return (
                  <li key={p.osmUrl} className="rounded-xl bg-cream/60 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{p.name} <span className="ml-1 text-xs font-medium text-soft">{p.distanceKm} km</span></p>
                        {p.address && <p className="text-xs text-soft">{p.address}</p>}
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-kumkum">
                          {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>Call {p.phone}</a>}
                          {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer">Website<span className="sr-only"> (opens in a new tab)</span></a>}
                          <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer">Map<span className="sr-only"> (opens Google Maps in a new tab)</span></a>
                        </p>
                      </div>
                      <button type="button" disabled={added} onClick={() => onAdd(p)} className="btn btn-primary btn-sm shrink-0" aria-label={`Add ${p.name} to shortlist`}>{added ? "Added ✓" : "+ Shortlist"}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-soft">{state.data.attribution}</p>
        </div>
      )}
    </div>
  );
}
