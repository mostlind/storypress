export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ownsProject, ownsCharacter } from "@/lib/ownership";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  if (!(await ownsProject(supabase, projectId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order");

  // Generate signed portrait URLs
  const withUrls = await Promise.all(
    (characters ?? []).map(async (c) => {
      if (!c.portrait_path) return { ...c, portrait_url: null };
      const { data } = await supabase.storage
        .from("portraits")
        .createSignedUrl(c.portrait_path, 3600);
      return { ...c, portrait_url: data?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ characters: withUrls });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, name, description, display_order } = await req.json();
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  if (!(await ownsProject(supabase, projectId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: character, error } = await supabase
    .from("characters")
    .insert({ project_id: projectId, name: name ?? "", description: description ?? "", display_order: display_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ character });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, description } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (!(await ownsCharacter(supabase, id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: character, error } = await supabase
    .from("characters")
    .update({ name, description })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ character });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (!(await ownsCharacter(supabase, id, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase.from("characters").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
