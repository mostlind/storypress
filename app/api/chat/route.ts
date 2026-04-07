import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { chat } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, message, photoIds } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  // Create project on first message if none exists
  let resolvedProjectId = projectId;
  if (!resolvedProjectId) {
    const { data: project, error: createError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: message.slice(0, 60),
        description: "",
        status: "draft",
        conversation: [],
      })
      .select()
      .single();
    if (createError || !project) {
      return NextResponse.json({ error: createError?.message ?? "Failed to create project" }, { status: 500 });
    }
    resolvedProjectId = project.id;
  }

  // Fetch current conversation and photos
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", resolvedProjectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Fetch any photos attached to this message
  let attachedPhotos: { id: string; storage_path: string }[] = [];
  if (photoIds?.length) {
    const { data } = await supabase
      .from("photos")
      .select("id, storage_path")
      .in("id", photoIds)
      .eq("project_id", resolvedProjectId);
    attachedPhotos = data ?? [];
  }

  // Download attached photo buffers for Gemini
  const photoBuffers: { id: string; buffer: Buffer }[] = [];
  for (const photo of attachedPhotos) {
    const { data } = await supabase.storage.from("photos").download(photo.storage_path);
    if (data) photoBuffers.push({ id: photo.id, buffer: Buffer.from(await data.arrayBuffer()) });
  }

  const userMessage = { role: "user" as const, text: message, photo_ids: photoIds ?? [] };
  const conversation = [...(project.conversation ?? []), userMessage];

  // Get AI response
  const { reply, isReady } = await chat({ conversation, newPhotoBuffers: photoBuffers });

  const assistantMessage = { role: "assistant" as const, text: reply, photo_ids: [] };
  const updatedConversation = [...conversation, assistantMessage];

  // Save conversation, update title from first message
  const updates: Record<string, unknown> = { conversation: updatedConversation };
  if (!project.conversation?.length) {
    updates.title = message.slice(0, 80);
  }
  if (isReady) {
    updates.status = "generating";
  }

  await supabase.from("projects").update(updates).eq("id", resolvedProjectId);

  return NextResponse.json({ projectId: resolvedProjectId, reply, isReady });
}
