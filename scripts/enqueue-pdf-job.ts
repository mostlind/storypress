import { Queue } from "bullmq";
import IORedis from "ioredis";
import { createClient } from "@supabase/supabase-js";

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: tsx scripts/enqueue-pdf-job.ts <orderId>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, project_id, storybook_id")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error("Order not found:", error?.message);
    process.exit(1);
  }

  console.log(`Order:     ${order.id}`);
  console.log(`Project:   ${order.project_id}`);
  console.log(`Storybook: ${order.storybook_id}`);

  const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  const queue = new Queue("generate-pdf", { connection });

  await queue.add("generate-pdf", {
    storybookId: order.storybook_id,
    projectId: order.project_id,
    orderId: order.id,
  });

  console.log("generate-pdf job enqueued");
  await connection.quit();
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
