import { PDFDocument, StandardFonts, rgb, PDFPage } from "pdf-lib";
import type { Storybook, Photo } from "@/types";

// Lulu 6x9 print specs: 6.25x9.25 with 0.125" bleed on all sides
const PAGE_WIDTH = 6.25 * 72;   // points
const PAGE_HEIGHT = 9.25 * 72;
const MARGIN = 0.75 * 72;

export async function generateStorybookPdf(
  storybook: Storybook,
  photos: Photo[],
  coverImageBuffer: Buffer | null
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  // Cover page
  const coverPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  if (coverImageBuffer) {
    const coverImage = await doc.embedJpg(coverImageBuffer);
    coverPage.drawImage(coverImage, {
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
    });
  } else {
    coverPage.drawRectangle({
      x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT,
      color: rgb(0.95, 0.9, 0.98),
    });
  }

  // Title on cover
  const photoMap = new Map(photos.map((p) => [p.id, p]));

  // Chapter pages
  for (let i = 0; i < storybook.chapters.length; i++) {
    const chapter = storybook.chapters[i];

    // Chapter title page
    const titlePage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawBackground(titlePage);
    titlePage.drawText(`Chapter ${i + 1}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - 20,
      size: 14,
      font: fontRegular,
      color: rgb(0.5, 0.3, 0.7),
    });
    titlePage.drawText(chapter.title, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - 60,
      size: 24,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: PAGE_WIDTH - MARGIN * 2,
    });

    // Narrative text (simple wrapping — replace with richer layout as needed)
    titlePage.drawText(chapter.narrative, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - 120,
      size: 11,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: PAGE_WIDTH - MARGIN * 2,
      lineHeight: 18,
    });

    // Photo pages for this chapter
    for (const photoId of chapter.photo_ids) {
      const photo = photoMap.get(photoId);
      if (!photo) continue;

      const photoPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawBackground(photoPage);

      try {
        const photoRes = await fetch(photo.public_url);
        const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
        const embedded = await doc.embedJpg(photoBuffer);
        const { width, height } = embedded.scale(1);
        const maxW = PAGE_WIDTH - MARGIN * 2;
        const maxH = PAGE_HEIGHT - MARGIN * 2 - 40;
        const scale = Math.min(maxW / width, maxH / height);
        const drawW = width * scale;
        const drawH = height * scale;
        photoPage.drawImage(embedded, {
          x: (PAGE_WIDTH - drawW) / 2,
          y: (PAGE_HEIGHT - drawH) / 2 + 20,
          width: drawW,
          height: drawH,
        });
      } catch {
        // Photo failed to load — leave blank page
      }

      if (photo.caption) {
        photoPage.drawText(photo.caption, {
          x: MARGIN,
          y: MARGIN - 10,
          size: 10,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
          maxWidth: PAGE_WIDTH - MARGIN * 2,
        });
      }
    }
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

function drawBackground(page: PDFPage) {
  page.drawRectangle({
    x: 0, y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
    color: rgb(0.99, 0.98, 0.97),
  });
}
