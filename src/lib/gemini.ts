/**
 * Intelligent Gemini API Client with Automated Model Rotation Fallbacks
 * When a model runs out of credits, is rate-limited (429), or encounters quota exhaustions (403),
 * it silently hot-swaps to the next best fallback model in sequence.
 */

const MODEL_ROTATION_ORDER = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',

];

interface FetchGeminiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  generationConfig?: any;
  contents?: any[];
  systemInstruction?: any;
  tools?: any[];
}

export async function fetchGeminiWithFallback(
  apiKey: string,
  payload: {
    contents?: any[];
    systemInstruction?: any;
    tools?: any[];
    generationConfig?: any;
  },
  options: Omit<FetchGeminiOptions, 'contents' | 'systemInstruction' | 'tools' | 'generationConfig'> = {}
): Promise<Response> {
  let lastError: any = null;

  for (const model of MODEL_ROTATION_ORDER) {
    try {
      console.log(`🤖 [Neural Engine] Attempting Gemini request using model: ${model}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        body: JSON.stringify(payload)
      });

      // 429 = Rate Limit / Quota Exhausted, 403 = Forbidden / Quota Exhausted
      if (response.status === 429 || response.status === 403) {
        const clonedResponse = response.clone();
        const errJson = await clonedResponse.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || '';

        const isQuotaExhausted =
          response.status === 429 ||
          errMsg.toLowerCase().includes('exhausted') ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('limit');

        if (isQuotaExhausted) {
          console.warn(`⚠️ Model ${model} returned quota or rate limit error (${response.status}): ${errMsg}. Rotating to fallback model...`);
          lastError = new Error(errMsg || `Status ${response.status}`);
          continue; // Try the next model in rotation
        }
      }

      // If we got a 200 or an unresolvable API error (like a bad request 400), return the response immediately
      return response;
    } catch (err: any) {
      console.warn(`⚠️ Network connection error using model ${model}:`, err);
      lastError = err;
    }
  }

  // If all models in the rotation failed, throw the final accumulated error
  throw lastError || new Error('All Gemini model fallbacks exhausted.');
}
