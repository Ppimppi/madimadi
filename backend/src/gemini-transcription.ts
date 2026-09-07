import { GoogleGenAI } from "@google/genai";

const DEFAULT_TRANSCRIPTION_MODEL = "gemini-3.5-transcribe";
const TRANSCRIPTION_TIMEOUT_MS = 90_000;

const TRANSCRIPTION_PROMPT = [
  "한국어 말하기 연습 녹음을 발화 그대로 전사하세요.",
  "교정, 요약, 설명, 화자 이름, 제목은 추가하지 말고 전사문만 출력하세요.",
  "특히 어, 음, 엄, 저, 저기, 그, 그러니까, 그니까, 약간, 뭔가, 이제, 있잖아요 같은 머뭇거림과 추임새를 생략하지 마세요.",
  "같은 단어를 반복하거나 문장을 다시 시작한 부분도 실제 발화대로 남기세요.",
  "들리지 않는 표현은 추측해서 만들지 마세요.",
].join(" ");

export class GeminiConfigurationError extends Error {}
export class GeminiTranscriptionError extends Error {}

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
    const interaction = await client.interactions.create(
      {
        model: process.env.GEMINI_TRANSCRIPTION_MODEL?.trim() || DEFAULT_TRANSCRIPTION_MODEL,
        input: [
          { type: "text", text: TRANSCRIPTION_PROMPT },
          {
            type: "audio",
            data: input.audio.toString("base64"),
            mime_type: normalizeMimeType(input.mimeType),
          },
        ],
        store: false,
      },
      { timeout: TRANSCRIPTION_TIMEOUT_MS },
    );

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
    console.error("Gemini transcription request failed", safeErrorMessage(error));
    throw new GeminiTranscriptionError("Gemini transcription request failed");
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

function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown Gemini error";
  return `${error.name}: ${error.message}`.slice(0, 500);
}
