export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateCharacterPortrait } from "@/lib/gemini";
import { ownsCharacterInProject } from "@/lib/ownership";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { characterId, projectId, name, description } = await req.json();
  if (!characterId || !projectId) {
    return NextResponse.json({ error: "Missing characterId or projectId" }, { status: 400 });
  }

  // Verify the character exists, sits in this project, and the project is the caller's
  if (!(await ownsCharacterInProject(supabase, characterId, projectId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const imageBuffer = await generateCharacterPortrait(name ?? "Character", description ?? "");
  if (!imageBuffer) {
    return NextResponse.json({ error: "Portrait generation failed" }, { status: 500 });
  }

  const portraitPath = `${projectId}/${characterId}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("portraits")
    .upload(portraitPath, imageBuffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  await supabase
    .from("characters")
    .update({ portrait_path: portraitPath })
    .eq("id", characterId);

  const { data: signedData } = await supabase.storage
    .from("portraits")
    .createSignedUrl(portraitPath, 3600);

  return NextResponse.json({ portrait_path: portraitPath, portrait_url: signedData?.signedUrl });
}
