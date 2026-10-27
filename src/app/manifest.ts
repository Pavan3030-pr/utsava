import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Utsava — AI Celebration Planner",
    short_name: "Utsava",
    description: "Plan weddings, birthdays and community events with AI — budget, timeline, guests and RSVPs.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf2",
    theme_color: "#fffaf2",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
