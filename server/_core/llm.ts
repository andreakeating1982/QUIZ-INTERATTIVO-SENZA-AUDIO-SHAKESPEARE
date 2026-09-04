/**
 * LLM helper using Easy-Peasy.AI API
 *
 * Uses the Easy-Peasy.AI text generation API with 50+ templates.
 * API key is available as EASY_PEASY_API_KEY in .env
 *
 * Example usage:
 *   const result = await generateText({
 *     preset: "custom-generator",
 *     keywords: "Write a product description for a smart watch",
 *     tone: "professional",
 *   });
 *   console.log(result[0].name); // Generated text
 */

const EASY_PEASY_API_URL = "https://easy-peasy.ai";

export type GenerateTextParams = {
  /** Template name (e.g., "custom-generator", "blog-post", "email-generation") */
  preset: string;
  /** Main input text or topic (max 5000 chars) */
  keywords: string;
  /** Desired tone (e.g., professional, friendly, funny) */
  tone?: string;
  /** Output length: "Short", "Medium", or "Long" */
  length?: "Short" | "Medium" | "Long";
  /** Number of outputs to generate (default: 1) */
  outputs?: number;
  /** Output language (default: English) */
  language?: string;
  /** Use advanced AI model (default: false) */
  shouldUseGPT4?: boolean;
  /** Additional context fields (vary by template) */
  extra1?: string;
  extra2?: string;
  extra3?: string;
};

export type GenerateTextResult = {
  id: number;
  name: string;
};

/**
 * Generate text content using Easy-Peasy.AI templates.
 *
 * Discover available templates with listPresets().
 */
export async function generateText(
  params: GenerateTextParams
): Promise<GenerateTextResult[]> {
  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "EASY_PEASY_API_KEY is not configured. Add it to your .env file."
    );
  }

  const response = await fetch(`${EASY_PEASY_API_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Text generation failed: ${response.status} ${response.statusText}${errorText ? ` – ${errorText}` : ""}`
    );
  }

  return (await response.json()) as GenerateTextResult[];
}

export type Preset = {
  slug: string;
  title: string;
  description: string;
  category: string;
  isFree: boolean;
};

/**
 * List available text generation templates (presets).
 *
 * Optional category filter: Social Media, Content, Business, HR, Marketing,
 * Resume, Education, Project Management, Tools, Other.
 */
export async function listPresets(
  category?: string
): Promise<{ presets: Preset[]; total: number; categories: string[] }> {
  const apiKey = process.env.EASY_PEASY_API_KEY;
  if (!apiKey) {
    throw new Error("EASY_PEASY_API_KEY is not configured.");
  }

  const url = new URL(`${EASY_PEASY_API_URL}/api/presets`);
  if (category) url.searchParams.set("category", category);

  const response = await fetch(url, {
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to list presets: ${response.status}`);
  }

  return response.json();
}
