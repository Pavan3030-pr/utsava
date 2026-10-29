import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Security headers: defence-in-depth for a public, unauthenticated AI app.
const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Next.js injects inline bootstrap scripts; dev also needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  // Pin tracing to this project (silences the "multiple lockfiles" warning when a stray package-lock.json exists in a parent folder).
  outputFileTracingRoot: process.cwd(),
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
        ],
      },
      // Private, per-user pages must never be indexed or cached by shared caches.
      ...["/plan/:path*", "/rsvp/:path*", "/events", "/api/:path*"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};

export default nextConfig;
