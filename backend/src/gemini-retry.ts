const RETRY_DELAYS_MS = [700, 1_800];

export async function withGeminiRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === RETRY_DELAYS_MS.length) throw error;

      const delay = RETRY_DELAYS_MS[attempt] ?? 0;
      console.warn(`${label} temporarily unavailable; retrying`, {
        attempt: attempt + 1,
        delay,
        error: safeErrorMessage(error),
      });
      await wait(delay);
    }
  }

  throw lastError;
}

export function isRetryableGeminiError(error: unknown): boolean {
  const value = isRecord(error) ? error : {};
  const status = Number(value.status ?? value.statusCode ?? value.code);
  if ([429, 500, 502, 503, 504].includes(status)) return true;

  const message = safeErrorMessage(error);
  return /(?:429|500|502|503|504|high demand|overload|temporar|unavailable|rate.?limit|timeout)/i.test(message);
}

export function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown Gemini error";
  return `${error.name}: ${error.message}`.slice(0, 500);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
