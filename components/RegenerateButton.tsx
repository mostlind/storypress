"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegenerateButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    router.refresh();
  }

  return (
    <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl mb-10">
      <p className="text-gray-500 mb-4">No pages generated yet.</p>
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Starting..." : "Generate storybook"}
      </button>
    </div>
  );
}
