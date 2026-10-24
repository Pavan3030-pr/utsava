import { Suspense } from "react";
import { SiteHeader } from "@/components/Logo";
import { CreateForm } from "./CreateForm";

export const metadata = { title: "Plan an event — Utsava" };

export default function CreatePage() {
  return (
    <div className="ambient min-h-screen">
      <SiteHeader cta={false} />
      <main id="main" className="mx-auto max-w-3xl px-5 py-10">
        <Suspense fallback={<div className="shimmer h-96" aria-busy="true" />}>
          <CreateForm />
        </Suspense>
      </main>
    </div>
  );
}
