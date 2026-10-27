import Link from "next/link";
import { SiteHeader } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="ambient min-h-screen">
      <SiteHeader />
      <main id="main" className="container-x py-28 text-center">
        <p className="eyebrow">404</p>
        <h1 className="h-display t-h2 mt-3">We couldn’t find that page.</h1>
        <p className="lead mx-auto mt-3 max-w-md">The link may be old, or the plan may live in another browser.</p>
        <Link href="/" className="btn btn-primary mt-8">Back to Utsava</Link>
      </main>
    </div>
  );
}
