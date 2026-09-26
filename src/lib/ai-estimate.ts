import "server-only";
import { z } from "zod";

// Schätzt Lebensmittel, Mengen und Nährwerte auf einem Mahlzeit-Foto.
// Standard ist Google Gemini (kostenloses Kontingent, GEMINI_API_KEY).
// Alternativ Claude von Anthropic (ANTHROPIC_API_KEY, kostenpflichtig).
// Sind beide Schlüssel gesetzt, gewinnt Gemini. Ohne Schlüssel ist die Funktion aus.

export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";

type Provider = "gemini" | "claude";

function provider(): Provider | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}

export function aiEnabled() {
  return provider() !== null;
}

const num = z.number().finite().min(0);

const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  grams: num.max(5000),
  kcal: num.max(10000),
  protein: num.max(1000),
  carbs: num.max(1000),
  fat: num.max(1000),
  sugar: num.max(1000).nullish(),
  fiber: num.max(1000).nullish(),
  saturatedFat: num.max(1000).nullish(),
  salt: num.max(100).nullish(),
});

export const estimateSchema = z.object({
  items: z.array(itemSchema).max(15),
  confidence: z.enum(["niedrig", "mittel", "hoch"]),
  note: z.string().max(400).optional(),
});

export type MealEstimate = z.infer<typeof estimateSchema>;
export type EstimatedItem = z.infer<typeof itemSchema>;

const nutrient = { type: "number", minimum: 0 };

const JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Ein Eintrag pro erkennbarem Lebensmittel oder Bestandteil, höchstens 15.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Kurzer deutscher Name, z. B. „Spaghetti, gekocht“" },
          grams: { ...nutrient, description: "Geschätzte Menge in Gramm (Getränke: ml)" },
          kcal: { ...nutrient, description: "Kilokalorien für diese Menge" },
          protein: { ...nutrient, description: "Eiweiß in g für diese Menge" },
          carbs: { ...nutrient, description: "Kohlenhydrate in g für diese Menge" },
          fat: { ...nutrient, description: "Fett in g für diese Menge" },
          sugar: { ...nutrient, description: "davon Zucker in g, falls sinnvoll schätzbar" },
          fiber: { ...nutrient, description: "Ballaststoffe in g, falls sinnvoll schätzbar" },
          saturatedFat: { ...nutrient, description: "gesättigte Fettsäuren in g, falls sinnvoll schätzbar" },
          salt: { ...nutrient, description: "Salz in g, falls sinnvoll schätzbar" },
        },
        required: ["name", "grams", "kcal", "protein", "carbs", "fat"],
      },
    },
    confidence: { type: "string", enum: ["niedrig", "mittel", "hoch"], description: "Wie sicher die Schätzung insgesamt ist" },
    note: { type: "string", description: "Optional ein kurzer Hinweis auf Deutsch, z. B. was unsicher war. Höchstens ein Satz." },
  },
  required: ["items", "confidence"],
};

const TOOL = {
  name: "mahlzeit_erfassen",
  description: "Erfasst die geschätzten Lebensmittel der Mahlzeit mit Menge und Nährwerten für genau diese Menge.",
  input_schema: JSON_SCHEMA,
};

// Gemini erwartet das Schema im OpenAPI-Format mit großgeschriebenen Typen.
// Untergrenzen lassen wir weg, die prüft estimateSchema ohnehin.
function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([k]) => k !== "minimum")
      .map(([k, v]) => [k, k === "type" && typeof v === "string" ? v.toUpperCase() : toGeminiSchema(v)]),
  );
}

const SYSTEM = `Du bist eine erfahrene Ernährungsberaterin. Du bekommst ein Foto einer Mahlzeit und manchmal einen Kommentar der Person.
Erkenne die einzelnen Lebensmittel, schätze realistisch die Menge in Gramm (Teller, Besteck und Verpackungen helfen beim Maßstab) und gib die Nährwerte für genau diese Menge an.
Der Kommentar hat Vorrang vor dem Foto, z. B. bei Mengen, Zutaten oder Zubereitung. Denke an versteckte Kalorien wie Öl, Butter, Soßen und Dressings.
Wenn auf dem Foto kein Essen zu sehen ist, gib eine leere Liste zurück und erkläre es im Hinweis. Antworte ausschließlich in der vorgegebenen Struktur.`;

export class AiError extends Error {}

type Photo = { image: Buffer; mimeType: string; comment: string };

const BUSY = "Die KI ist gerade ausgelastet. Versuche es gleich noch einmal.";
const FAILED = "Die Schätzung hat nicht geklappt. Versuche es noch einmal.";
const UNREACHABLE = "Die KI ist gerade nicht erreichbar. Versuche es gleich noch einmal.";

const commentText = (comment: string) => (comment ? `Kommentar der Person: ${comment}` : "Kein Kommentar.");

export async function estimateMeal(photo: Photo): Promise<MealEstimate> {
  const p = provider();
  if (!p) throw new AiError("Die KI ist noch nicht eingerichtet.");
  const raw = p === "gemini" ? await askGemini(photo) : await askClaude(photo);
  const parsed = estimateSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("AI estimate unparseable", p, JSON.stringify(raw).slice(0, 2000));
    throw new AiError(FAILED);
  }
  return parsed.data;
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new AiError(UNREACHABLE);
  }
  if (!res.ok) {
    console.error("AI estimate failed", res.status, await res.text().catch(() => ""));
    throw new AiError(res.status === 429 || res.status === 503 || res.status === 529 ? BUSY : FAILED);
  }
  return res;
}

async function askGemini({ image, mimeType, comment }: Photo): Promise<unknown> {
  const base = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const res = await post(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": process.env.GEMINI_API_KEY! }, {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: commentText(comment) }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: toGeminiSchema(JSON_SCHEMA), temperature: 0.2 },
  });
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!text) {
    console.error("AI estimate empty", JSON.stringify(body).slice(0, 2000));
    throw new AiError(FAILED);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function askClaude({ image, mimeType, comment }: Photo): Promise<unknown> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const base = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";

  const content: unknown[] = [{ type: "image", source: { type: "base64", media_type: mimeType, data: image.toString("base64") } }];
  content.push({ type: "text", text: commentText(comment) });

  const res = await post(`${base}/v1/messages`, { "x-api-key": key, "anthropic-version": "2023-06-01" }, {
    model: process.env.AI_MODEL || DEFAULT_CLAUDE_MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content }],
  });
  const body = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
  return body.content?.find((c) => c.type === "tool_use" && c.name === TOOL.name)?.input;
}
