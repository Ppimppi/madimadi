import { GoogleGenAI } from "@google/genai";

import { isRetryableGeminiError, safeErrorMessage, withGeminiRetry } from "./gemini-retry.js";

const DEFAULT_TRANSCRIPTION_MODEL = "gemini-3.5-transcribe";
const TRANSCRIPTION_TIMEOUT_MS = 90_000;

const FILLER_VOCABULARY = [
  "어", "어어", "음", "으음", "엄", "아", "저기", "그러니까", "그니까",
  "뭐랄까", "있잖아", "있잖아요", "약간", "뭔가", "이제", "마디마디",
];

export class GeminiConfigurationError extends Error {}
export class GeminiTranscriptionError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

export async function transcribeKoreanSpeech(input: {
  audio: Buffer;
  mimeType: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigurationError("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  try {
    const interaction = await withGeminiRetry("Gemini transcription", () => client.interactions.create(
      {
        model: process.env.GEMINI_TRANSCRIPTION_MODEL?.trim() || DEFAULT_TRANSCRIPTION_MODEL,
        input: [{
          type: "audio",
          data: input.audio.toString("base64"),
          mime_type: normalizeMimeType(input.mimeType),
        }],
        generation_config: {
          transcription_config: {
            language_codes: ["ko-KR"],
            custom_vocabulary: FILLER_VOCABULARY,
            mode: "verbatim",
          },
        },
        store: false,
      },
      { timeout: TRANSCRIPTION_TIMEOUT_MS },
    ));

    const transcript = interaction.output_text?.trim();
    if (!transcript) {
      console.error("Gemini transcription returned no text", interaction.errors ?? []);
      throw new GeminiTranscriptionError("Gemini transcription returned no text");
    }
    return removeWrappingCodeFence(transcript);
  } catch (error) {
    if (error instanceof GeminiConfigurationError || error instanceof GeminiTranscriptionError) {
      throw error;
    }
    const retryable = isRetryableGeminiError(error);
    console.error("Gemini transcription request failed", safeErrorMessage(error));
    throw new GeminiTranscriptionError("Gemini transcription request failed", retryable);
  }
}

function normalizeMimeType(value: string): string {
  const mimeType = value.split(";", 1)[0]?.trim().toLowerCase() || "audio/webm";
  if (mimeType === "audio/x-wav") return "audio/wav";
  if (mimeType === "audio/x-m4a" || mimeType === "audio/mp4") return "audio/m4a";
  if (mimeType === "audio/mp3") return "audio/mp3";
  return mimeType;
}

function removeWrappingCodeFence(value: string): string {
  const match = value.match(/^```(?:text)?\s*([\s\S]*?)\s*```$/i);
  return (match?.[1] ?? value).trim();
}

