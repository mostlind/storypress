"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

interface Character {
  id?: string;
  name: string;
  description: string;
  portrait_path?: string | null;
  portrait_url?: string | null;
}

function PersonIcon() {
  return (
    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default function CharactersPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPortrait, setGeneratingPortrait] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/characters?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        setCharacters(d.characters ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  function addCharacter() {
    setCharacters((prev) => [...prev, { name: "", description: "", portrait_url: null }]);
  }

  function updateCharacter(index: number, field: keyof Character, value: string) {
    setCharacters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  async function removeCharacter(index: number) {
    const char = characters[index];
    if (char.id) {
      await fetch(`/api/characters?id=${char.id}`, { method: "DELETE" });
    }
    setCharacters((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveCharacter(index: number): Promise<string | undefined> {
    const char = characters[index];
    if (char.id) {
      await fetch("/api/characters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: char.id, name: char.name, description: char.description }),
      });
      return char.id;
    } else {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: char.name, description: char.description, display_order: index }),
      });
      const data = await res.json();
      if (data.character?.id) {
        setCharacters((prev) =>
          prev.map((c, i) => (i === index ? { ...c, id: data.character.id } : c))
        );
        return data.character.id;
      }
    }
  }

  async function generatePortrait(index: number) {
    setGeneratingPortrait(index);
    setError(null);
    try {
      const characterId = await saveCharacter(index);
      if (!characterId) throw new Error("Failed to save character");

      const char = characters[index];
      const res = await fetch("/api/characters/portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          projectId,
          name: char.name,
          description: char.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCharacters((prev) =>
        prev.map((c, i) =>
          i === index
            ? { ...c, portrait_path: data.portrait_path, portrait_url: data.portrait_url }
            : c
        )
      );
    } catch (err: any) {
      setError(err.message ?? "Portrait generation failed");
    } finally {
      setGeneratingPortrait(null);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      // Save any unsaved characters
      for (let i = 0; i < characters.length; i++) {
        if (characters[i].name.trim()) {
          await saveCharacter(i);
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start generation");
      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Who's in your story?</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Add the people in your storybook so we can illustrate them correctly — names, what they look like, and how they're related to each other. We'll generate a portrait for each one.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="space-y-4 mb-6">
        {characters.map((char, i) => (
          <div key={i} className="border border-gray-200 rounded-2xl p-4 flex gap-4">
            {/* Portrait */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                {char.portrait_url ? (
                  <Image src={char.portrait_url} alt={char.name} width={96} height={96} className="object-cover w-full h-full" unoptimized />
                ) : generatingPortrait === i ? (
                  <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                ) : (
                  <PersonIcon />
                )}
              </div>
              <button
                type="button"
                onClick={() => generatePortrait(i)}
                disabled={generatingPortrait !== null || !char.name.trim()}
                className="text-xs text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {char.portrait_url ? "Regenerate" : "Generate portrait"}
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-2">
              <input
                value={char.name}
                onChange={(e) => updateCharacter(i, "name", e.target.value)}
                placeholder="Name"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <textarea
                value={char.description}
                onChange={(e) => updateCharacter(i, "description", e.target.value)}
                placeholder={`Describe this person — appearance, personality, and relationship to others.\ne.g. "Mom — warm, curly red hair, always laughing. Married to Tom (stepdad)."`}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeCharacter(i)}
              className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors self-start mt-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addCharacter}
        className="w-full border-2 border-dashed border-gray-200 hover:border-brand-300 text-gray-400 hover:text-brand-600 rounded-2xl py-3 text-sm font-medium transition-colors mb-8"
      >
        + Add person
      </button>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId }),
            }).then(() => router.push(`/projects/${projectId}`));
          }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Skip character setup
        </button>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {generating ? "Starting..." : "Generate my storybook →"}
        </button>
      </div>
    </main>
  );
}
