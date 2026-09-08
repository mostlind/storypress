// Ownership checks shared by the character routes. Everything hangs off the
// project: a project belongs to a user, and a character belongs to a project.
import type { createSupabaseServerClient } from "@/lib/supabase-server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function ownsProject(supabase: ServerClient, projectId: string, userId: string) {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function ownsCharacter(supabase: ServerClient, characterId: string, userId: string) {
  const { data: character } = await supabase
    .from("characters")
    .select("project_id")
    .eq("id", characterId)
    .single();
  if (!character) return false;
  return ownsProject(supabase, character.project_id, userId);
}

// Confirms the character exists, belongs to the given project, and that the
// project belongs to the user — so a caller cannot pair their own project id
// with someone else's character id.
export async function ownsCharacterInProject(
  supabase: ServerClient,
  characterId: string,
  projectId: string,
  userId: string
) {
  const { data: character } = await supabase
    .from("characters")
    .select("project_id")
    .eq("id", characterId)
    .single();
  if (!character || character.project_id !== projectId) return false;
  return ownsProject(supabase, projectId, userId);
}
