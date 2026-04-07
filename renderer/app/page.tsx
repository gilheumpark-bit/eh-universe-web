"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/code-studio");
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1c1a17] text-accent-amber font-mono text-xs tracking-widest uppercase">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center rounded-full border border-accent-amber/30 bg-accent-amber/10 animate-pulse">
          EH
        </div>
        <div className="animate-pulse">Loading Code Studio...</div>
      </div>
    </div>
  );
}
