import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import type { StorybookChapter } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

const MODEL = "gemini-3.1-flash-image-preview";

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

interface ChatOptions {
  conversation: ConversationMessage[];
  newPhotoBuffers: { id: string; buffer: Buffer }[];
}

export async function chat({ conversation, newPhotoBuffers }: ChatOptions): Promise<{
  reply: string;
  isReady: boolean;
}> {
  // Build a single prompt from the full conversation history
  const parts: object[] = [{ text: CHAT_SYSTEM_PROMPT + "\n\n---\n\n" }];

  for (const msg of conversation) {
    const prefix = msg.role === "user" ? "User: " : "You: ";
    parts.push({ text: prefix + msg.text });
  }

  // Attach any new photos from the latest user message
  for (const { buffer } of newPhotoBuffers) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: buffer.toString("base64"),
      },
    });
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: parts,
  });

  const rawText = response.candidates![0].content.parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join("");

  const isReady = rawText.includes("[READY]");
  const reply = rawText.replace("[READY]", "").trim();

  return { reply, isReady };
}

interface GenerateStorybookOptions {
  conversation: ConversationMessage[];
  photoPaths: { id: string; path: string }[];
}

interface GenerateStorybookResult {
  chapters: StorybookChapter[];
  coverImageBuffer: Buffer | null;
}

export async function generateStorybook({
  conversation,
  photoPaths,
}: GenerateStorybookOptions): Promise<GenerateStorybookResult> {
  const transcript = conversation
    .map((m) => `${m.role === "user" ? "Person" : "Interviewer"}: ${m.text}`)
    .join("\n\n");

  const photoParts = photoPaths.map(({ path }) => ({
    inlineData: {
      mimeType: "image/jpeg" as const,
      data: fs.readFileSync(path).toString("base64"),
    },
  }));

  const prompt = [
    {
      text: `You are a creative author turning someone's personal memories into a beautiful printed storybook.

Here is the interview transcript capturing their story:

${transcript}

I'm also providing ${photoPaths.length} photos from the trip. Study them carefully and choose the best ones for each chapter.

Please:
1. Write a 3-chapter narrative storybook. Each chapter should have a title and 2-3 paragraphs of warm, vivid prose drawn from the interview details.
2. For each chapter, list the indices (0-based) of the most fitting photos from the provided set.
3. Generate a beautiful cover image that captures the mood and essence of the story.

Respond with JSON in this exact format, followed by the cover image:
{
  "chapters": [
    {
      "title": "Chapter title",
      "narrative": "Chapter text...",
      "photo_ids": [0, 2]
    }
  ]
}`,
    },
    ...photoParts,
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  let chaptersJson: StorybookChapter[] = [];
  let coverImageBuffer: Buffer | null = null;

  for (const part of response.candidates![0].content.parts) {
    if (part.text) {
      const jsonMatch = part.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        chaptersJson = parsed.chapters;
      }
    } else if (part.inlineData) {
      coverImageBuffer = Buffer.from(part.inlineData.data!, "base64");
    }
  }

  return { chapters: chaptersJson, coverImageBuffer };
}

export async function generateCaption(photoPath: string): Promise<string> {
  const data = fs.readFileSync(photoPath).toString("base64");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: "Write a short, warm caption (1-2 sentences) for this photo as it would appear in a personal storybook." },
      { inlineData: { mimeType: "image/jpeg", data } },
    ],
  });

  return response.candidates![0].content.parts[0].text ?? "";
}
