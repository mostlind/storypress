import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { StoryBeat } from "@/types";

// Lulu 8x8 square with 0.125" bleed on all sides
const PAGE_W = 8.25 * 72;   // 594pt
const PAGE_H = 8.25 * 72;   // 594pt
const BLEED = 0.125 * 72;    // 9pt
const MARGIN = 0.875 * 72;   // 63pt (bleed + 0.75" safe area)

const CREAM = rgb(0.98, 0.96, 0.93);
const INK   = rgb(0.12, 0.10, 0.09);
const MUTED = rgb(0.55, 0.50, 0.46);

export async function generateStorybookPdf(
  beats: StoryBeat[],
  getBeatImageBuffer: (imagePath: string) => Promise<Buffer | null>,
  title: string
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  // ── Cover page ───────────────────────────────────────────────────────────
  const cover = doc.addPage([PAGE_W, PAGE_H]);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });

  // Decorative top bar
  cover.drawRectangle({ x: MARGIN, y: PAGE_H - MARGIN - 4, width: PAGE_W - MARGIN * 2, height: 1.5, color: INK });

  const titleSize = title.length > 30 ? 28 : 36;
  cover.drawText(title, {
    x: MARGIN,
    y: PAGE_H / 2 + 20,
    size: titleSize,
    font: serifBold,
    color: INK,
    maxWidth: PAGE_W - MARGIN * 2,
    lineHeight: titleSize * 1.3,
  });

  cover.drawRectangle({ x: MARGIN, y: PAGE_H / 2 - 10, width: PAGE_W - MARGIN * 2, height: 1, color: MUTED });

  cover.drawText("A storybook", {
    x: MARGIN,
    y: PAGE_H / 2 - 34,
    size: 13,
    font: serif,
    color: MUTED,
  });

  // ── 12 spreads: text left, image right ───────────────────────────────────
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];

    // Left page — text
    const textPage = doc.addPage([PAGE_W, PAGE_H]);
    textPage.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });

    // Page number
    textPage.drawText(String(i + 1), {
      x: MARGIN,
      y: PAGE_H - MARGIN + 18,
      size: 9,
      font: serif,
      color: MUTED,
    });

    // Top rule
    textPage.drawRectangle({ x: MARGIN, y: PAGE_H - MARGIN, width: PAGE_W - MARGIN * 2, height: 0.75, color: MUTED });

    // Story beat text
    textPage.drawText(beat.text, {
      x: MARGIN,
      y: PAGE_H / 2 + 40,
      size: 13,
      font: serif,
      color: INK,
      maxWidth: PAGE_W - MARGIN * 2,
      lineHeight: 22,
    });

    // Bottom rule
    textPage.drawRectangle({ x: MARGIN, y: MARGIN - 12, width: PAGE_W - MARGIN * 2, height: 0.75, color: MUTED });

    // Right page — full-bleed image
    const imgPage = doc.addPage([PAGE_W, PAGE_H]);
    imgPage.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.15, 0.13, 0.12) });

    if (beat.image_path) {
      try {
        const buf = await getBeatImageBuffer(beat.image_path);
        if (buf) {
          const img = await doc.embedJpg(buf);
          const { width, height } = img.scale(1);
          // Cover-fit: scale so image fills the page, crop if needed
          const scale = Math.max(PAGE_W / width, PAGE_H / height);
          const drawW = width * scale;
          const drawH = height * scale;
          imgPage.drawImage(img, {
            x: (PAGE_W - drawW) / 2,
            y: (PAGE_H - drawH) / 2,
            width: drawW,
            height: drawH,
          });
        }
      } catch {
        // Leave dark background if image fails
      }
    }
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
