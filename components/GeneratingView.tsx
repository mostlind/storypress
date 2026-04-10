"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GeneratingView({ label = "Writing your storybook..." }: { label?: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <main className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-6" />
      <h1 className="text-2xl font-bold mb-2">{label}</h1>
      <p className="text-gray-500">This usually takes a few minutes. Hang tight.</p>
    </main>
  );
}
