/// <reference types="node" />
import { Worker, type Job } from "bullmq";
import { makeRedisConnection, QUEUES } from "@/lib/queue";

const redisConnection = makeRedisConnection();
import { generateStorybook } from "@/lib/gemini";
import { generateStorybookPdf } from "@/lib/pdf";
import { submitPrintOrder } from "@/lib/lulu";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import type { GenerateStorybookJob, GeneratePdfJob, SubmitPrintOrderJob } from "@/lib/queue";

const supabase = createSupabaseServiceClient();

// Worker: Generate storybook from photos + description
new Worker<GenerateStorybookJob>(
  QUEUES.GENERATE_STORYBOOK,
  async (job: Job<GenerateStorybookJob>) => {
    const { projectId } = job.data;
    console.log(`[generate-storybook] Starting job for project ${projectId}`);
    try {

    // Fetch project and photos
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    const { data: photos } = await supabase
      .from("photos")
      .select("*")
      .eq("project_id", projectId)
      .order("order");

    if (!project) throw new Error("Project not found");
    console.log(`[generate-storybook] Project loaded. ${photos?.length ?? 0} photos. Conversation has ${project.conversation?.length ?? 0} messages.`);

    // Download photos to temp dir (photos are optional — AI works from conversation alone if none)
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "storybook-"));
    const photoPaths: { id: string; path: string }[] = [];

    for (const photo of (photos ?? [])) {
      const { data } = await supabase.storage
        .from("photos")
        .download(photo.storage_path);
      if (!data) continue;
      const tmpPath = path.join(tmpDir, `${photo.id}.jpg`);
      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(tmpPath, buffer);
      photoPaths.push({ id: photo.id, path: tmpPath });
    }

    console.log(`[generate-storybook] Downloaded ${photoPaths.length} photos. Calling Gemini...`);

    // Generate storybook via Gemini using full conversation transcript
    const { chapters, coverImageBuffer } = await generateStorybook({
      conversation: project.conversation ?? [],
      photoPaths,
    });

    console.log(`[generate-storybook] Gemini returned ${chapters.length} chapters. Cover image: ${coverImageBuffer ? "yes" : "no"}`);

    // Upload cover image if generated
    let coverImagePath: string | null = null;
    if (coverImageBuffer) {
      coverImagePath = `${projectId}/cover.jpg`;
      await supabase.storage
        .from("storybooks")
        .upload(coverImagePath, coverImageBuffer, { contentType: "image/jpeg", upsert: true });
    }

    // Map photo_ids from indices to actual photo IDs
    const mappedChapters = chapters.map((ch) => ({
      ...ch,
      photo_ids: ch.photo_ids.map((idx: unknown) => photoPaths[idx as number]?.id).filter(Boolean),
    }));

    // Save storybook record (upsert in case this project was generated before)
    const { data: storybook, error: storybookError } = await supabase
      .from("storybooks")
      .upsert({
        project_id: projectId,
        chapters: mappedChapters,
        cover_image_path: coverImagePath,
        status: "ready",
      }, { onConflict: "project_id" })
      .select()
      .single();

    if (storybookError || !storybook) throw new Error(`Failed to save storybook: ${storybookError?.message}`);

    // Update project status
    await supabase
      .from("projects")
      .update({ status: "ready" })
      .eq("id", projectId);

    // Cleanup temp files
    fs.rmSync(tmpDir, { recursive: true });

    console.log(`[generate-storybook] Done. Storybook ${storybook.id} is ready.`);
    return { storybookId: storybook.id };
    } catch (err) {
      console.error("Storybook generation failed:", err);
      await supabase.from("projects").update({ status: "failed" }).eq("id", projectId);
      throw err;
    }
  },
  { connection: redisConnection }
);

// Worker: Generate print-ready PDF
new Worker<GeneratePdfJob>(
  QUEUES.GENERATE_PDF,
  async (job: Job<GeneratePdfJob>) => {
    const { storybookId, projectId } = job.data;

    const { data: storybook } = await supabase
      .from("storybooks")
      .select("*")
      .eq("id", storybookId)
      .single();

    const { data: photos } = await supabase
      .from("photos")
      .select("*")
      .eq("project_id", projectId);

    if (!storybook || !photos) throw new Error("Storybook or photos not found");

    // Fetch cover image if exists
    let coverImageBuffer: Buffer | null = null;
    if (storybook.cover_image_path) {
      const { data } = await supabase.storage
        .from("storybooks")
        .download(storybook.cover_image_path);
      if (data) coverImageBuffer = Buffer.from(await data.arrayBuffer());
    }

    const pdfBuffer = await generateStorybookPdf(storybook, photos, coverImageBuffer);

    const pdfPath = `${projectId}/${storybookId}.pdf`;
    await supabase.storage
      .from("storybooks")
      .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    await supabase
      .from("storybooks")
      .update({ pdf_path: pdfPath })
      .eq("id", storybookId);

    return { pdfPath };
  },
  { connection: redisConnection }
);

// Worker: Submit print order to Lulu
new Worker<SubmitPrintOrderJob>(
  QUEUES.SUBMIT_PRINT_ORDER,
  async (job: Job<SubmitPrintOrderJob>) => {
    const { orderId } = job.data;

    const { data: order } = await supabase
      .from("orders")
      .select("*, storybooks(*)")
      .eq("id", orderId)
      .single();

    if (!order) throw new Error("Order not found");

    const pdfPath = order.storybooks.pdf_path;
    const { data: pdfUrlData } = supabase.storage
      .from("storybooks")
      .getPublicUrl(pdfPath);

    const luluOrder = await submitPrintOrder({
      pdfUrl: pdfUrlData.publicUrl,
      shippingAddress: order.shipping_address,
      pageCount: 24, // Square hardcover, 24pp
      contactEmail: order.contact_email,
    });

    await supabase
      .from("orders")
      .update({
        lulu_order_id: luluOrder.id,
        status: "submitted_to_printer",
      })
      .eq("id", orderId);
  },
  { connection: redisConnection }
);

console.log("Workers started");
