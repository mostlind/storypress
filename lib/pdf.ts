import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as fs from "fs";
import * as path from "path";
import type { StoryBeat } from "@/types";

const FONTS_DIR = path.join(process.cwd(), "fonts");

function loadFonts() {
  return {
    regular: fs.readFileSync(path.join(FONTS_DIR, "Lora.ttf")),
    italic: fs.readFileSync(path.join(FONTS_DIR, "Lora-Italic.ttf")),
  };
}

async function createDoc() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { regular, italic } = loadFonts();
  const serif = await doc.embedFont(regular);
  const serifBold = await doc.embedFont(italic); // use italic as accent; both are embedded
  return { doc, serif, serifBold };
}

// Lulu 8.5x8.5 square with 0.125" bleed on all sides
const TRIM  = 8.5 * 72;       // 612pt — trim size
const PAGE_W = (8.5 + 0.125) * 72;  // 621pt — trim + bleed (Lulu adds bleed on binding edge separately)
const PAGE_H = (8.5 + 0.125 * 2) * 72; // 630pt — trim + top/bottom bleed
const BLEED = 0.125 * 72;     // 9pt
const MARGIN = (0.125 + 0.75) * 72; // 63pt (bleed + 0.75" safe area)

const CREAM = rgb(0.98, 0.96, 0.93);
const INK   = rgb(0.12, 0.10, 0.09);
const MUTED = rgb(0.55, 0.50, 0.46);

// Lulu hardcover case wrap spine formula: (0.0025 * interiorPageCount) + 0.2 inches
export function calcSpineWidth(interiorPageCount: number): number {
  return (0.0025 * interiorPageCount + 0.2) * 72; // in points
}

// ── Interior PDF (24 pages: 12 text + 12 image) ──────────────────────────────

export async function generateInteriorPdf(
  beats: StoryBeat[],
  getBeatImageBuffer: (imagePath: string) => Promise<Buffer | null>,
): Promise<Buffer> {
  const { doc, serif, serifBold } = await createDoc();

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];

    // Left page — text
    const textPage = doc.addPage([PAGE_W, PAGE_H]);
    textPage.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });

    textPage.drawText(String(i + 1), {
      x: MARGIN,
      y: PAGE_H - MARGIN + 18,
      size: 9,
      font: serif,
      color: MUTED,
    });

    textPage.drawRectangle({ x: MARGIN, y: PAGE_H - MARGIN, width: PAGE_W - MARGIN * 2, height: 0.75, color: MUTED });

    textPage.drawText(beat.text, {
      x: MARGIN,
      y: PAGE_H / 2 + 40,
      size: 13,
      font: serifBold,
      color: INK,
      maxWidth: PAGE_W - MARGIN * 2,
      lineHeight: 22,
    });

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

// ── Cover PDF (single wide page: back | spine | front, with full case-wrap margins) ──

// Hardcover case wrap requires bleed (0.125") + wrap/hinge allowance (0.75") on all sides
const WRAP  = 0.75 * 72;           // 54pt — wraps around the physical boards
const EXTRA = BLEED + WRAP;        // 63pt — total margin outside trim on each edge
const SAFE  = EXTRA + 0.25 * 72;  // safe zone for text/design on front/back panels

export async function generateCoverPdf(
  title: string,
  interiorPageCount: number,
): Promise<Buffer> {
  const spineW = calcSpineWidth(interiorPageCount);

  // Lulu case wrap dimensions:
  // Width  = extra + back trim + spine + front trim + extra  (~19" for 8.5x8.5 w/ 24pp)
  // Height = extra + trim height + extra                     (~10.25" for 8.5x8.5)
  const coverW = EXTRA + TRIM + spineW + TRIM + EXTRA;
  const coverH = EXTRA + TRIM + EXTRA;

  const { doc, serif, serifBold } = await createDoc();

  const page = doc.addPage([coverW, coverH]);

  // Full background
  page.drawRectangle({ x: 0, y: 0, width: coverW, height: coverH, color: CREAM });

  // ── Front cover (right panel) ─────────────────────────────────────────────
  const frontX = EXTRA + TRIM + spineW; // x origin of front cover panel

  // Top rule
  page.drawRectangle({
    x: frontX + SAFE,
    y: coverH - SAFE,
    width: TRIM - SAFE * 2,
    height: 1.5,
    color: INK,
  });

  const titleSize = title.length > 30 ? 28 : 36;
  page.drawText(title, {
    x: frontX + SAFE,
    y: coverH / 2 + 20,
    size: titleSize,
    font: serifBold,
    color: INK,
    maxWidth: TRIM - SAFE * 2,
    lineHeight: titleSize * 1.3,
  });

  page.drawRectangle({
    x: frontX + SAFE,
    y: coverH / 2 - 10,
    width: TRIM - SAFE * 2,
    height: 1,
    color: MUTED,
  });

  page.drawText("A storybook", {
    x: frontX + SAFE,
    y: coverH / 2 - 34,
    size: 13,
    font: serif,
    color: MUTED,
  });

  // ── Spine ─────────────────────────────────────────────────────────────────
  const spineX = EXTRA + TRIM;

  page.drawRectangle({ x: spineX, y: 0, width: spineW, height: coverH, color: INK });

  // Spine title — rotated 90°, centred
  const spineFontSize = Math.min(11, spineW * 0.6);
  const spineTextX = spineX + spineW / 2 + spineFontSize / 2;
  page.drawText(title, {
    x: spineTextX,
    y: coverH * 0.15,
    size: spineFontSize,
    font: serifBold,
    color: CREAM,
    rotate: degrees(90),
    maxWidth: coverH * 0.7,
  });

  // ── Back cover (left side) ────────────────────────────────────────────────
  // Intentionally minimal — just background colour
  page.drawText("storybookgenerator.com", {
    x: SAFE,
    y: EXTRA + SAFE * 0.5,
    size: 9,
    font: serif,
    color: MUTED,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
