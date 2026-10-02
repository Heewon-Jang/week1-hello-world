// Server-side only: uses the secret GEMINI_API_KEY.
// Models are tried in order; busy models (429/5xx) fall through to the next.
const MODELS = (process.env.GEMINI_MODEL || "gemini-3.8-flash,gemini-3.5-flash,gemini-flash-latest")
  .split(",")
  .map((model) => model.trim());

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

class RetryableError extends Error {}

async function generate(parts: Part[], generationConfig?: object) {
  let lastError: Error = new Error("No Gemini models configured.");

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await generateWith(model, parts, generationConfig);
      } catch (error) {
        if (!(error instanceof RetryableError)) throw error;
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function generateWith(model: string, parts: Part[], generationConfig?: object) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts }], generationConfig }),
    }
  );
  const json = await res.json();

  if (!res.ok) {
    const message = json.error?.message ?? `Gemini request failed (${res.status}).`;
    // Overloaded, rate limited, or unavailable to this key: try again / next model.
    if (res.status === 429 || res.status >= 500 || res.status === 404) {
      throw new RetryableError(message);
    }
    throw new Error(message);
  }

  const text: string | undefined = json.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("");
  if (!text) {
    throw new RetryableError("Gemini returned an empty response.");
  }
  return text.trim();
}

// Step 1 of the prompt chain: image -> plain text description.
export function describeImage(base64: string, mimeType: string) {
  return generate([
    { inline_data: { mime_type: mimeType, data: base64 } },
    {
      text:
        "Describe this image in 3-5 sentences. Cover who or what is in it, " +
        "what is happening, the setting, facial expressions and any text " +
        "visible in the image. Be specific and literal; do not try to be funny.",
    },
  ]);
}

// Step 2 of the prompt chain: description -> funny captions.
export async function writeCaptions(description: string, count = 5) {
  const text = await generate(
    [
      {
        text:
          `You write captions for a meme site for Columbia University students. ` +
          `The audience is chronically online college students who live in the ` +
          `dorms and are still figuring out New York City. Write ${count} short, ` +
          `funny captions (under 120 characters each) for an image described below. ` +
          `Vary the style: relatable student life, NYC observations, internet ` +
          `slang, deadpan. Keep it clever, not mean, and never punch down.\n\n` +
          `Image description:\n${description}`,
      },
    ],
    {
      responseMimeType: "application/json",
      responseSchema: { type: "ARRAY", items: { type: "STRING" } },
    }
  );

  const captions = (JSON.parse(text) as unknown[])
    .map((caption) => String(caption).trim())
    .filter(Boolean)
    .slice(0, count);
  if (!captions.length) {
    throw new Error("Gemini didn't return any captions.");
  }
  return captions;
}
