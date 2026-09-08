"use client";

import { useState } from "react";
import Image from "next/image";
import type { StoryBeat } from "@/types";

interface BeatWithUrl extends StoryBeat {
  signedUrl: string | null;
}

export default function StorybookBeats({
  projectId,
  initialBeats,
}: {
  projectId: string;
  initialBeats: BeatWithUrl[];
}) {
  const [beats, setBeats] = useState(initialBeats);
  const [fixingIndex, setFixingIndex] = useState<number | null>(null);
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate(index: number) {
    setRegenerating(index);
    setError(null);
    try {
      const res = await fetch("/api/beats/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          beatIndex: index,
          correction: corrections[index] ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Regeneration failed");
      setBeats((prev) =>
        prev.map((b, i) =>
          i === index ? { ...b, signedUrl: data.signed_url } : b
        )
      );
      setFixingIndex(null);
      setCorrections((prev) => ({ ...prev, [index]: "" }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      {beats.map((beat, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-gray-200">
          <div className="grid grid-cols-2 aspect-[2/1]">
            {/* Left: text page */}
            <div className="bg-[#faf8f5] flex flex-col justify-center px-8 py-8 border-r border-gray-200">
              <p className="text-xs text-gray-400 mb-4 font-mono">{i + 1}</p>
              <p className="text-gray-800 leading-relaxed text-sm">{beat.text}</p>
            </div>
            {/* Right: image page */}
            <div className="relative bg-gray-900">
              {regenerating === i ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
                    <p className="text-gray-400 text-xs">Regenerating...</p>
                  </div>
                </div>
              ) : beat.signedUrl ? (
                <Image src={beat.signedUrl} alt={`Page ${i + 1}`} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
                </div>
              )}
              {/* Fix button */}
              {regenerating !== i && (
                <button
                  onClick={() => setFixingIndex(fixingIndex === i ? null : i)}
                  className="absolute bottom-2 right-2 bg-black/60 active:bg-black/80 text-white text-xs px-2.5 py-1 rounded-lg"
                >
                  Fix image
                </button>
              )}
            </div>
          </div>

          {/* Fix form */}
          {fixingIndex === i && regenerating !== i && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">What's wrong with this image?</label>
                <textarea
                  value={corrections[i] ?? ""}
                  onChange={(e) => setCorrections((prev) => ({ ...prev, [i]: e.target.value }))}
                  placeholder="e.g. Mom should be with stepdad, not with Bob. They are a couple."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-2 pb-0.5">
                <button
                  onClick={() => setFixingIndex(null)}
                  className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRegenerate(i)}
                  disabled={!corrections[i]?.trim()}
                  className="bg-brand-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-brand-700 disabled:opacity-40 transition-colors"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
