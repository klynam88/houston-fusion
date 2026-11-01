"use client";

import dynamic from "next/dynamic";

const Explorer = dynamic(
  () => import("@/components/explorer").then((mod) => mod.Explorer),
  {
    ssr: false,
    loading: () => (
      <main className="grid h-dvh place-items-center bg-ink text-cream">
        <div className="text-center">
          <p className="text-[10px] tracking-[0.28em] text-cream/70">HOUSTON</p>
          <p className="font-serif text-5xl italic">Fusion</p>
          <p className="mt-3 text-sm text-cream/60">Opening the aerial map…</p>
        </div>
      </main>
    ),
  },
);

export default function Home() {
  return <Explorer />;
}
