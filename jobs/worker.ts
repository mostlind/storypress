/// <reference types="node" />
import { Worker, type Job } from "bullmq";
import { makeRedisConnection, QUEUES } from "@/lib/queue";

const redisConnection = makeRedisConnection();

import { generateStoryBeats, generateBeatImage } from "@/lib/gemini";
import { generateInteriorPdf, generateCoverPdf } from "@/lib/pdf";
import { submitPrintOrder } from "@/lib/lulu";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { getSubmitPrintOrderQueue } from "@/lib/queue";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import type { GenerateStorybookJob, GeneratePdfJob, SubmitPrintOrderJob } from "@/lib/queue";
import type { StoryBeat } from "@/types";

const supabase = createSupabaseServiceClient();

// ── Worker: Generate storybook ───────────────────────────────────────────────
new Worker<GenerateStorybookJob>(
  QUEUES.GENERATE_STORYBOOK,
  async (job: Job<GenerateStorybookJob>) => {
    const { projectId } = job.data;
    console.log(`[generate-storybook] Starting job for project ${projectId}`);

    try {
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (!project) throw new Error("Project not found");

      const { data: photos } = await supabase
        .from("photos")
        .select("*")
        .eq("project_id", projectId)
        .order("order");

      console.log(`[generate-storybook] ${photos?.length ?? 0} photos, ${project.conversation?.length ?? 0} conversation messages`);

      // Download all user photos as buffers (used as reference for both beats + images)
      const photoBuffers: Buffer[] = [];
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "storybook-"));

      for (const photo of photos ?? []) {
        const { data } = await supabase.storage.from("photos").download(photo.storage_path);
        if (!data) continue;
        const buf = Buffer.from(await data.arrayBuffer());
        photoBuffers.push(buf);
        fs.writeFileSync(path.join(tmpDir, `${photo.id}.jpg`), buf);
      }

      // ── Phase 1: Generate 12 story beats (text) ──────────────────────────
      console.log(`[generate-storybook] Phase 1: generating 12 story beats...`);

      const beatTexts = await generateStoryBeats({
        conversation: project.conversation ?? [],
        photoBuffers,
      });

      console.log(`[generate-storybook] Got ${beatTexts.length} beats`);

      // Save storybook with beats (no images yet)
      const initialBeats: StoryBeat[] = beatTexts.map((text) => ({ text, image_path: null }));

      const { data: storybook, error: upsertError } = await supabase
        .from("storybooks")
        .upsert({
          project_id: projectId,
          beats: initialBeats,
          cover_image_path: null,
          status: "generating_images",
        }, { onConflict: "project_id" })
        .select()
        .single();

      if (upsertError || !storybook) throw new Error(`Failed to save storybook: ${upsertError?.message}`);

      // ── Phase 2: Generate image for each beat ────────────────────────────
      const beats: StoryBeat[] = [...initialBeats];
      const generatedImageBuffers: Buffer[] = []; // accumulate for consistency

      for (let i = 0; i < beats.length; i++) {
        console.log(`[generate-storybook] Phase 2: generating image ${i + 1}/12...`);

        const imageBuffer = await generateBeatImage({
          beatText: beats[i].text,
          beatIndex: i,
          referenceBuffers: photoBuffers,
          previousImageBuffers: generatedImageBuffers,
        });

        if (imageBuffer) {
          const imagePath = `${projectId}/beat-${i}.jpg`;
          await supabase.storage
            .from("storybooks")
            .upload(imagePath, imageBuffer, { contentType: "image/jpeg", upsert: true });

          beats[i] = { ...beats[i], image_path: imagePath };
          generatedImageBuffers.push(imageBuffer);

          // Update DB after each image so progress is visible
          await supabase
            .from("storybooks")
            .update({ beats })
            .eq("id", storybook.id);
        }
      }

      // Mark storybook and project as ready
      await supabase.from("storybooks").update({ status: "ready", beats }).eq("id", storybook.id);
      await supabase.from("projects").update({ status: "ready" }).eq("id", projectId);

      fs.rmSync(tmpDir, { recursive: true });

      console.log(`[generate-storybook] Done. Storybook ${storybook.id} is ready.`);
      return { storybookId: storybook.id };

    } catch (err) {
      console.error("[generate-storybook] Failed:", err);
      await supabase.from("projects").update({ status: "failed" }).eq("id", projectId);
      throw err;
    }
  },
  { connection: redisConnection }
);

// ── Worker: Generate print-ready PDF ─────────────────────────────────────────
new Worker<GeneratePdfJob>(
  QUEUES.GENERATE_PDF,
  async (job: Job<GeneratePdfJob>) => {
    const { storybookId, projectId, orderId } = job.data;
    console.log(`[generate-pdf] Starting for storybook ${storybookId}`);

    const { data: storybook } = await supabase
      .from("storybooks")
      .select("*")
      .eq("id", storybookId)
      .single();

    const { data: project } = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .single();

    if (!storybook) throw new Error("Storybook not found");

    const beats: StoryBeat[] = storybook.beats ?? [];
    const title = project?.title ?? "My Storybook";
    const interiorPageCount = beats.length * 2; // text page + image page per beat

    async function getBeatImageBuffer(imagePath: string): Promise<Buffer | null> {
      const { data } = await supabase.storage.from("storybooks").download(imagePath);
      if (!data) return null;
      return Buffer.from(await data.arrayBuffer());
    }

    // Generate interior and cover PDFs
    console.log(`[generate-pdf] Generating interior PDF (${interiorPageCount} pages)...`);
    const interiorBuffer = await generateInteriorPdf(beats, getBeatImageBuffer);

    console.log(`[generate-pdf] Generating cover PDF...`);
    const coverBuffer = await generateCoverPdf(title, interiorPageCount);

    const pdfPath = `${projectId}/${storybookId}.pdf`;
    const coverPdfPath = `${projectId}/${storybookId}-cover.pdf`;

    await Promise.all([
      supabase.storage.from("storybooks").upload(pdfPath, interiorBuffer, { contentType: "application/pdf", upsert: true }),
      supabase.storage.from("storybooks").upload(coverPdfPath, coverBuffer, { contentType: "application/pdf", upsert: true }),
    ]);

    await supabase.from("storybooks").update({ pdf_path: pdfPath, cover_pdf_path: coverPdfPath }).eq("id", storybookId);
    console.log(`[generate-pdf] Interior saved to ${pdfPath}, cover saved to ${coverPdfPath}`);

    // Chain to print order submission using the orderId passed directly from the webhook
    if (orderId) {
      console.log(`[generate-pdf] Enqueuing print order submission for order ${orderId}`);
      await getSubmitPrintOrderQueue().add("submit-print-order", { orderId });
    } else {
      console.log(`[generate-pdf] No orderId provided, skipping print submission`);
    }

    return { pdfPath };
  },
  { connection: redisConnection }
);

// ── Worker: Submit print order to Lulu ───────────────────────────────────────
new Worker<SubmitPrintOrderJob>(
  QUEUES.SUBMIT_PRINT_ORDER,
  async (job: Job<SubmitPrintOrderJob>) => {
    const { orderId } = job.data;
    console.log(`[submit-print-order] Submitting order ${orderId}`);

    const { data: order } = await supabase
      .from("orders")
      .select("*, storybooks(*)")
      .eq("id", orderId)
      .single();

    if (!order) throw new Error("Order not found");

    const { pdf_path: interiorPath, cover_pdf_path: coverPath } = order.storybooks;
    if (!interiorPath) throw new Error("Interior PDF not found on storybook");
    if (!coverPath) throw new Error("Cover PDF not found on storybook");

    const SEVEN_DAYS = 60 * 60 * 24 * 7;

    // Lulu needs publicly accessible URLs — signed for 7 days
    const [{ data: interiorUrlData }, { data: coverUrlData }] = await Promise.all([
      supabase.storage.from("storybooks").createSignedUrl(interiorPath, SEVEN_DAYS),
      supabase.storage.from("storybooks").createSignedUrl(coverPath, SEVEN_DAYS),
    ]);

    if (!interiorUrlData?.signedUrl) throw new Error("Failed to generate signed URL for interior PDF");
    if (!coverUrlData?.signedUrl) throw new Error("Failed to generate signed URL for cover PDF");

    let luluOrder;
    try {
      luluOrder = await submitPrintOrder({
        orderId,
        interiorPdfUrl: interiorUrlData.signedUrl,
        coverPdfUrl: coverUrlData.signedUrl,
        shippingAddress: order.shipping_address,
        contactEmail: order.contact_email,
      });
    } catch (err) {
      console.error(`[submit-print-order] Lulu API call failed for order ${orderId}:`, err);
      throw err;
    }

    await supabase
      .from("orders")
      .update({ lulu_order_id: luluOrder.id, status: "submitted_to_printer" })
      .eq("id", orderId);

    console.log(`[submit-print-order] Lulu order ${luluOrder.id} created`);
  },
  { connection: redisConnection }
);

console.log("Workers started");
