import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
const MODEL = "gemini-3.1-flash-image-preview";

// ─── Chat ────────────────────────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are a warm, curious interviewer helping someone turn their memories into a beautiful printed storybook. Your job is to ask follow-up questions that draw out rich, specific details — the kind that make a story come alive.

Ask about: who was there, specific moments, funny or emotional things that happened, what the place looked, smelled, or felt like, what people said, what surprised them, what they'll remember most.

Ask one or two focused questions at a time. Be conversational, not clinical.

When you feel you have enough content to fill roughly 12 pages of a storybook — typically after 4-6 substantive exchanges with good detail — end your response with the exact token: [READY]

If the user uploads photos, describe what you see in them and weave questions around the visual details.

Never mention the [READY] token to the user. Just include it at the very end of your message when ready.`;

export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
  photo_ids: string[];
}

export async function chat({
  conversation,
  newPhotoBuffers,
}: {
  conversation: ConversationMessage[];
  newPhotoBuffers: { id: string; buffer: Buffer }[];
}): Promise<{ reply: string; isReady: boolean }> {
  const prompt: object[] = [{ text: CHAT_SYSTEM_PROMPT + "\n\n---\n\n" }];

  for (const msg of conversation) {
    prompt.push({
      text: `${msg.role === "user" ? "User" : "You"}: ${msg.text}`,
    });
  }

  for (const { buffer } of newPhotoBuffers) {
    prompt.push({
      inlineData: { mimeType: "image/jpeg", data: buffer.toString("base64") },
    });
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts?.length)
    throw new Error(
      `Gemini chat returned empty response. Full response: ${JSON.stringify(response)}`,
    );

  const rawText = parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join("");

  const isReady = rawText.includes("[READY]");
  const reply = rawText.replace("[READY]", "").trim();
  return { reply, isReady };
}

// ─── Phase 1: Generate story beats (text only) ───────────────────────────────

const storyBeatsSchema = z.object({
  beat_one:    z.string().describe("Page 1 story beat — vivid prose, 3-5 sentences."),
  beat_two:    z.string().describe("Page 2 story beat — vivid prose, 3-5 sentences."),
  beat_three:  z.string().describe("Page 3 story beat — vivid prose, 3-5 sentences."),
  beat_four:   z.string().describe("Page 4 story beat — vivid prose, 3-5 sentences."),
  beat_five:   z.string().describe("Page 5 story beat — vivid prose, 3-5 sentences."),
  beat_six:    z.string().describe("Page 6 story beat — vivid prose, 3-5 sentences."),
  beat_seven:  z.string().describe("Page 7 story beat — vivid prose, 3-5 sentences."),
  beat_eight:  z.string().describe("Page 8 story beat — vivid prose, 3-5 sentences."),
  beat_nine:   z.string().describe("Page 9 story beat — vivid prose, 3-5 sentences."),
  beat_ten:    z.string().describe("Page 10 story beat — vivid prose, 3-5 sentences."),
  beat_eleven: z.string().describe("Page 11 story beat — vivid prose, 3-5 sentences."),
  beat_twelve: z.string().describe("Page 12 story beat — vivid prose, 3-5 sentences."),
});

export async function generateStoryBeats({
  conversation,
  photoBuffers,
}: {
  conversation: ConversationMessage[];
  photoBuffers: Buffer[];
}): Promise<string[]> {
  const transcript = conversation
    .map((m) => `${m.role === "user" ? "Person" : "Interviewer"}: ${m.text}`)
    .join("\n\n");

  const photoParts = photoBuffers.map((buf) => ({
    inlineData: {
      mimeType: "image/jpeg" as const,
      data: buf.toString("base64"),
    },
  }));

  const prompt = [
    {
      text: `You are a creative author turning someone's memories into a printed storybook.

Here is the interview transcript:

${transcript}

${photoBuffers.length > 0 ? `I'm also providing ${photoBuffers.length} photos from the trip for context.` : ""}

Write 12 story beats — short, vivid prose passages of 3-5 sentences each. Together they should tell the full arc of the story: arrival, experiences, people, moments, feelings, and reflection. Each beat will occupy one page of a printed book.`,
    },
    ...photoParts,
  ];

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: zodToJsonSchema(storyBeatsSchema),
        },
      });

      const data = storyBeatsSchema.parse(JSON.parse(response.text!));
      return [
        data.beat_one, data.beat_two, data.beat_three, data.beat_four,
        data.beat_five, data.beat_six, data.beat_seven, data.beat_eight,
        data.beat_nine, data.beat_ten, data.beat_eleven, data.beat_twelve,
      ];
    } catch (err) {
      lastError = err as Error;
      console.warn(`[generateStoryBeats] Attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  throw lastError!;
}

// ─── Phase 2: Generate image for a single beat ───────────────────────────────

export async function generateBeatImage({
  beatText,
  beatIndex,
  referenceBuffers,
  previousImageBuffers,
}: {
  beatText: string;
  beatIndex: number;
  referenceBuffers: Buffer[]; // user's uploaded photos
  previousImageBuffers: Buffer[]; // already-generated beat images for consistency
}): Promise<Buffer | null> {
  const refParts = referenceBuffers.slice(0, 3).map((buf) => ({
    inlineData: {
      mimeType: "image/jpeg" as const,
      data: buf.toString("base64"),
    },
  }));

  const prevParts = previousImageBuffers.map((buf) => ({
    inlineData: {
      mimeType: "image/jpeg" as const,
      data: buf.toString("base64"),
    },
  }));

  const hasPrevious = previousImageBuffers.length > 0;
  const hasReference = referenceBuffers.length > 0;

  const prompt = [
    {
      text: `You are illustrating page ${beatIndex + 1} of a personal storybook — the kind made to capture a real memory, trip, or moment in someone's life, and often given as a gift. Create a warm, expressive illustration in a classic illustrated storybook style — painterly, soft edges, rich colors, evocative of the mood and setting. Think editorial illustration meets fine art picture book. No text or lettering in the image. The image will be printed as a full-bleed 8x8 inch square page.

The story beat for this page:
"${beatText}"

${hasReference ? "Reference photos are provided showing the real people, places, and objects in this story — use them to inform the characters and settings, but render everything in the illustrated style, not photorealistic." : ""}

${hasPrevious ? `The illustrations generated for the previous ${previousImageBuffers.length} page(s) are also attached. You MUST maintain strict visual consistency: same character appearances, same art style, same color palette, same line quality across all pages.` : "This is the first illustration — establish the art style, color palette, and character designs that will be used consistently throughout the book."}`,
    },
    ...refParts,
    ...prevParts,
  ];

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts?.length) {
        throw new Error(`No parts in response for beat ${beatIndex}`);
      }

      for (const part of parts) {
        if ((part as any).inlineData) {
          return Buffer.from((part as any).inlineData.data, "base64");
        }
      }

      throw new Error(`No image data in response for beat ${beatIndex}`);
    } catch (err) {
      lastError = err as Error;
      console.warn(`[generateBeatImage] Attempt ${attempt}/${MAX_ATTEMPTS} for beat ${beatIndex} failed:`, lastError.message);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  console.warn(`[generateBeatImage] All attempts failed for beat ${beatIndex}, skipping.`);
  return null;
}
