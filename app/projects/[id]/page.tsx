import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import OrderForm from "@/components/OrderForm";
import GeneratingView from "@/components/GeneratingView";
import RegenerateButton from "@/components/RegenerateButton";
import StorybookBeats from "@/components/StorybookBeats";
import type { StoryBeat } from "@/types";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  if (project.status === "generating" || project.status === "generating_images") {
    const label = project.status === "generating_images"
      ? "Illustrating your story..."
      : "Writing your story...";
    return <GeneratingView label={label} />;
  }

  if (project.status === "failed") {
    return (
      <main className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2 text-red-600">Generation failed</h1>
        <p className="text-gray-500 mb-6">Something went wrong. Check the worker logs for details.</p>
        <a href="/create" className="text-brand-600 hover:underline text-sm">Start a new storybook</a>
      </main>
    );
  }

  const { data: storybook } = await supabase
    .from("storybooks")
    .select("*")
    .eq("project_id", project.id)
    .single();

  // Generate signed URLs for all beat images
  const beats: StoryBeat[] = storybook?.beats ?? [];
  const imagePaths = beats.map((b) => b.image_path).filter(Boolean) as string[];

  const signedUrlMap = new Map<string, string>();
  if (imagePaths.length) {
    const { data: signedUrls } = await supabase.storage
      .from("storybooks")
      .createSignedUrls(imagePaths, 3600);

    signedUrls?.forEach((entry, i) => {
      if (entry.signedUrl) signedUrlMap.set(imagePaths[i], entry.signedUrl);
    });
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">{project.title}</h1>
          <p className="text-gray-500">{beats.length} pages</p>
        </div>
        <a
          href={`/create?projectId=${project.id}`}
          className="text-sm text-brand-600 hover:underline mt-1"
        >
          Add detail / regenerate
        </a>
      </div>

      {beats.length === 0 && <RegenerateButton projectId={project.id} />}

      <StorybookBeats
        projectId={project.id}
        initialBeats={beats.map((beat) => ({
          ...beat,
          signedUrl: beat.image_path ? (signedUrlMap.get(beat.image_path) ?? null) : null,
        }))}
      />

      {project.status === "ready" && (
        <div className="border-t border-gray-200 mt-12 pt-10">
          <h2 className="text-2xl font-bold mb-2">Order your printed book</h2>
          <p className="text-gray-500 mb-6">
            We'll print and ship a hardcover book directly to you — $49.99 including shipping.
          </p>
          <OrderForm projectId={project.id} />
        </div>
      )}
    </main>
  );
}
