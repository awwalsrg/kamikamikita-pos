"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.push("/login");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center text-slate-400">
        <div className="mb-4 text-4xl">☕</div>
        <p>Loading...</p>
      </div>
    </main>
  );
}
