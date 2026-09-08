export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateBeatImage, selectStyleReferences } from "@/lib/gemini";
import type { StoryBeat } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, beatIndex, correction } = await req.json();
  if (!projectId || beatIndex == null) {
    return NextResponse.json({ error: "Missing projectId or beatIndex" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: storybook } = await supabase
    .from("storybooks")
    .select("id, beats")
    .eq("project_id", projectId)
    .single();
  if (!storybook) return NextResponse.json({ error: "Storybook not found" }, { status: 404 });

  const beats: StoryBeat[] = storybook.beats ?? [];
  const beat = beats[beatIndex];
  if (!beat) return NextResponse.json({ error: "Beat not found" }, { status: 404 });

  // Fetch characters for this project, plus any generated portraits
  const { data: characterRows } = await supabase
    .from("characters")
    .select("name, description, portrait_path")
    .eq("project_id", projectId)
    .order("display_order");

  const characterRecords = characterRows ?? [];
  const characters = characterRecords.map(({ name, description }) => ({ name, description }));

  const characterPortraits: Array<{ name: string; buffer: Buffer }> = [];
  for (const character of characterRecords) {
    if (!character.portrait_path) continue;
    const { data } = await supabase.storage.from("portraits").download(character.portrait_path);
    if (data) characterPortraits.push({ name: character.name, buffer: Buffer.from(await data.arrayBuffer()) });
  }

  // Attach the book's other pages so the replacement still matches the rest of
  // it. selectStyleReferences runs first so only the pages that will actually
  // be sent are downloaded.
  const otherBeatPaths = beats
    .filter((b, i) => i !== beatIndex && !!b.image_path)
    .map((b) => b.image_path as string);

  const previousImageBuffers: Buffer[] = [];
  for (const path of selectStyleReferences(otherBeatPaths)) {
    const { data } = await supabase.storage.from("storybooks").download(path);
    if (data) previousImageBuffers.push(Buffer.from(await data.arrayBuffer()));
  }

  // Download reference photos
  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("project_id", projectId)
    .order("order");

  const referenceBuffers: Buffer[] = [];
  for (const photo of photos ?? []) {
    const { data } = await supabase.storage.from("photos").download(photo.storage_path);
    if (data) referenceBuffers.push(Buffer.from(await data.arrayBuffer()));
  }

  const imageBuffer = await generateBeatImage({
    beatText: beat.text,
    beatIndex,
    referenceBuffers,
    previousImageBuffers,
    characters,
    characterPortraits,
    correction,
  });

  if (!imageBuffer) {
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }

  const imagePath = `${projectId}/beat-${beatIndex}.jpg`;
  await supabase.storage
    .from("storybooks")
    .upload(imagePath, imageBuffer, { contentType: "image/jpeg", upsert: true });

  const updatedBeats = beats.map((b, i) =>
    i === beatIndex ? { ...b, image_path: imagePath } : b
  );
  await supabase.from("storybooks").update({ beats: updatedBeats }).eq("id", storybook.id);

  const { data: signedData } = await supabase.storage
    .from("storybooks")
    .createSignedUrl(imagePath, 3600);

  return NextResponse.json({ signed_url: signedData?.signedUrl });
}
