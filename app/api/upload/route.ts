export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const projectId = formData.get("projectId") as string;
  const files = formData.getAll("photos") as File[];

  if (!projectId || !files.length) {
    return NextResponse.json({ error: "Missing projectId or photos" }, { status: 400 });
  }

  // Verify project belongs to user
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const uploaded: { id: string; public_url: string }[] = [];
  let lastError: string | null = null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();

    // Resize to max 2000px on longest side, convert to JPEG for consistency
    const optimized = await sharp(Buffer.from(arrayBuffer))
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const storagePath = `${user.id}/${projectId}/${Date.now()}-${i}.jpg`;

    const { error: storageError } = await supabase.storage
      .from("photos")
      .upload(storagePath, optimized, { contentType: "image/jpeg" });

    if (storageError) {
      lastError = `Storage error: ${storageError.message}`;
      continue;
    }

    const { data: urlData } = supabase.storage
      .from("photos")
      .getPublicUrl(storagePath);

    const { data: photo, error: dbError } = await supabase
      .from("photos")
      .insert({
        project_id: projectId,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        order: i,
      })
      .select()
      .single();

    if (dbError) {
      lastError = `DB error: ${dbError.message}`;
      continue;
    }

    if (photo) uploaded.push({ id: photo.id, public_url: urlData.publicUrl });
  }

  if (!uploaded.length) {
    return NextResponse.json(
      { error: lastError ?? "No photos were saved." },
      { status: 500 }
    );
  }

  return NextResponse.json({ uploaded });
}
