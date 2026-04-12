import { Queue } from "bullmq";
import IORedis from "ioredis";

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: tsx scripts/enqueue-print-job.ts <orderId>");
  process.exit(1);
}

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
const queue = new Queue("submit-print-order", { connection });

queue.add("submit-print-order", { orderId }).then(() => {
  console.log(`Enqueued submit-print-order for order ${orderId}`);
  return connection.quit();
}).then(() => process.exit(0));
