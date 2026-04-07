import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Project } from "@/types";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Storybooks</h1>
        <Link
          href="/create"
          className="bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          New storybook
        </Link>
      </div>

      {!projects?.length ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg">No storybooks yet.</p>
          <Link href="/create" className="text-brand-600 hover:underline mt-2 inline-block">
            Create your first one
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((project: Project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="p-5 border border-gray-200 rounded-xl hover:border-brand-400 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{project.title}</h2>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                </div>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const styles: Record<Project["status"], string> = {
    draft: "bg-gray-100 text-gray-600",
    generating: "bg-yellow-100 text-yellow-700",
    ready: "bg-green-100 text-green-700",
    ordered: "bg-blue-100 text-blue-700",
    printing: "bg-purple-100 text-purple-700",
    shipped: "bg-brand-100 text-brand-700",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
