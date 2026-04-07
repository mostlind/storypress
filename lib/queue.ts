import { Queue } from "bullmq";
import IORedis from "ioredis";

// Queue names
export const QUEUES = {
  GENERATE_STORYBOOK: "generate-storybook",
  GENERATE_PDF: "generate-pdf",
  SUBMIT_PRINT_ORDER: "submit-print-order",
} as const;

function makeConnection() {
  return new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

// Queues are lazily instantiated so importing this file in Next.js
// does not open a Redis connection until a job is actually enqueued.
let _generateStorybookQueue: Queue | null = null;
let _generatePdfQueue: Queue | null = null;
let _submitPrintOrderQueue: Queue | null = null;

export function getGenerateStorybookQueue() {
  if (!_generateStorybookQueue)
    _generateStorybookQueue = new Queue(QUEUES.GENERATE_STORYBOOK, { connection: makeConnection() });
  return _generateStorybookQueue;
}

export function getGeneratePdfQueue() {
  if (!_generatePdfQueue)
    _generatePdfQueue = new Queue(QUEUES.GENERATE_PDF, { connection: makeConnection() });
  return _generatePdfQueue;
}

export function getSubmitPrintOrderQueue() {
  if (!_submitPrintOrderQueue)
    _submitPrintOrderQueue = new Queue(QUEUES.SUBMIT_PRINT_ORDER, { connection: makeConnection() });
  return _submitPrintOrderQueue;
}

export function makeRedisConnection() {
  return new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
}

// Job payload types
export interface GenerateStorybookJob {
  projectId: string;
  userId: string;
}

export interface GeneratePdfJob {
  storybookId: string;
  projectId: string;
}

export interface SubmitPrintOrderJob {
  orderId: string;
}
