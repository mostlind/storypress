import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import OrderForm from "@/components/OrderForm";
import GeneratingView from "@/components/GeneratingView";

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

  const { data: storybook } = await supabase
    .from("storybooks")
    .select("*")
    .eq("project_id", project.id)
    .single();

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("project_id", project.id)
    .order("order");

  if (project.status === "generating") {
    return <GeneratingView />;
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

  // Generate signed URLs (1 hour expiry) for all private storage objects
  let coverUrl: string | null = null;
  if (storybook?.cover_image_path) {
    const { data } = await supabase.storage
      .from("storybooks")
      .createSignedUrl(storybook.cover_image_path, 3600);
    coverUrl = data?.signedUrl ?? null;
  }

  const photoUrlMap = new Map<string, string>();
  if (photos?.length) {
    const { data: signedUrls } = await supabase.storage
      .from("photos")
      .createSignedUrls(photos.map((p) => p.storage_path), 3600);

    signedUrls?.forEach((entry, i) => {
      if (entry.signedUrl) photoUrlMap.set(photos[i].id, entry.signedUrl);
    });
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-1">{project.title}</h1>
      <p className="text-gray-500 mb-8">{project.description}</p>

      {storybook && (
        <div className="space-y-10 mb-16">
          {coverUrl && (
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100">
              <Image src={coverUrl} alt="Cover" fill className="object-cover" />
            </div>
          )}

          {storybook.chapters?.map((chapter: any, i: number) => (
            <section key={i} className="space-y-4">
              <h2 className="text-2xl font-bold">
                <span className="text-brand-500 text-lg font-normal">Chapter {i + 1} — </span>
                {chapter.title}
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {chapter.narrative}
              </p>

              {chapter.photo_ids?.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {chapter.photo_ids.slice(0, 4).map((photoId: string) => {
                    const photo = photos?.find((p) => p.id === photoId);
                    const signedUrl = photoUrlMap.get(photoId);
                    if (!photo || !signedUrl) return null;
                    return (
                      <div key={photoId} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <Image src={signedUrl} alt={photo.caption ?? ""} fill className="object-cover" />
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1">
                            {photo.caption}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {project.status === "ready" && (
        <div className="border-t border-gray-200 pt-10">
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
