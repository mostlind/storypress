"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import Image from "next/image";

interface Message {
  role: "user" | "assistant";
  text: string;
  photoUrls?: string[];
}

const GREETING = "Hey! Tell me about the trip or event you want to turn into a storybook. What happened, and what made it special?";

export default function CreatePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPhotoIds, setPendingPhotoIds] = useState<string[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // Check auth first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/signup?next=/create"); return; }

    setUploading(true);
    setError(null);

    // We need a projectId to upload photos — create one if needed
    let pid = projectId;
    if (!pid) {
      const { data: project } = await supabase
        .from("projects")
        .insert({ user_id: user.id, title: "My Storybook", description: "", status: "draft", conversation: [] })
        .select()
        .single();
      if (!project) { setError("Failed to start project"); setUploading(false); return; }
      pid = project.id;
      setProjectId(pid);
    }

    const formData = new FormData();
    formData.append("projectId", pid!);
    files.forEach((f) => formData.append("photos", f));

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) { setError(data.error); setUploading(false); return; }

    const newIds = data.uploaded.map((u: { id: string }) => u.id);
    const newPreviews = files.map((f) => URL.createObjectURL(f));

    setPendingPhotoIds((prev) => [...prev, ...newIds]);
    setPendingPreviewUrls((prev) => [...prev, ...newPreviews]);
    setPendingFiles((prev) => [...prev, ...files]);
    setUploading(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && !pendingPhotoIds.length) return;
    if (thinking) return;

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/signup?next=/create"); return; }

    const userMessage: Message = {
      role: "user",
      text: input,
      photoUrls: pendingPreviewUrls,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPendingFiles([]);
    setPendingPreviewUrls([]);
    const photoIdsToSend = [...pendingPhotoIds];
    setPendingPhotoIds([]);
    setThinking(true);
    setError(null);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        message: input,
        photoIds: photoIdsToSend,
      }),
    });

    const data = await res.json();
    setThinking(false);

    if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }

    if (!projectId) setProjectId(data.projectId);

    setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);

    if (data.isReady) {
      // Kick off generation then redirect
      await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: data.projectId }),
      });
      router.push(`/projects/${data.projectId}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  }

  return (
    <main className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h1 className="font-semibold text-gray-900">Create a storybook</h1>
        <p className="text-xs text-gray-400 mt-0.5">Tell your story — we'll ask questions, then turn it into a printed book.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] space-y-2`}>
              {msg.photoUrls?.length ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {msg.photoUrls.map((url, j) => (
                    <div key={j} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              ) : null}
              {msg.text && (
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Pending photo previews */}
      {pendingPreviewUrls.length > 0 && (
        <div className="px-6 flex gap-2 flex-wrap pb-2">
          {pendingPreviewUrls.map((url, i) => (
            <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100">
              <Image src={url} alt="" fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-100">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 disabled:opacity-40 transition-colors"
            title="Add photos"
          >
            {uploading ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell your story..."
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-32 overflow-y-auto"
          />

          <button
            type="submit"
            disabled={thinking || uploading || (!input.trim() && !pendingPhotoIds.length)}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handlePhotoSelect}
        />

        <p className="text-xs text-gray-400 text-center mt-2">
          Press Enter to send · Shift+Enter for new line · 📎 to attach photos
        </p>
      </div>
    </main>
  );
}
