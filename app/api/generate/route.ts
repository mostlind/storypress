import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getGenerateStorybookQueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  // Verify project belongs to user and has photos
  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Mark as generating and enqueue
  await supabase
    .from("projects")
    .update({ status: "generating" })
    .eq("id", projectId);

  await getGenerateStorybookQueue().add("generate", { projectId, userId: user.id });

  return NextResponse.json({ queued: true });
}
