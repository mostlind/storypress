import { Queue } from "bullmq";
import IORedis from "ioredis";
import { createClient } from "@supabase/supabase-js";

const projectId = process.argv[2];
if (!projectId) {
  console.error("Usage: tsx scripts/enqueue-storybook-job.ts <projectId>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id, title")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    console.error("Project not found:", error?.message);
    process.exit(1);
  }

  console.log(`Project: ${project.id} — ${project.title}`);

  const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  const queue = new Queue("generate-storybook", { connection });

  await queue.add("generate-storybook", {
    projectId: project.id,
    userId: project.user_id,
  });

  console.log("generate-storybook job enqueued");
  await connection.quit();
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
