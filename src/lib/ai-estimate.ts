import "server-only";
import { z } from "zod";

// Schätzt Lebensmittel, Mengen und Nährwerte auf einem Mahlzeit-Foto mit
// Claude (Anthropic Messages API). Ohne ANTHROPIC_API_KEY ist die Funktion aus.

export const DEFAULT_AI_MODEL = "claude-sonnet-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
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

const TOOL = {
  name: "mahlzeit_erfassen",
  description: "Erfasst die geschätzten Lebensmittel der Mahlzeit mit Menge und Nährwerten für genau diese Menge.",
  input_schema: {
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
  },
};

const SYSTEM = `Du bist eine erfahrene Ernährungsberaterin. Du bekommst ein Foto einer Mahlzeit und manchmal einen Kommentar der Person.
Erkenne die einzelnen Lebensmittel, schätze realistisch die Menge in Gramm (Teller, Besteck und Verpackungen helfen beim Maßstab) und gib die Nährwerte für genau diese Menge an.
Der Kommentar hat Vorrang vor dem Foto, z. B. bei Mengen, Zutaten oder Zubereitung. Denke an versteckte Kalorien wie Öl, Butter, Soßen und Dressings.
Wenn auf dem Foto kein Essen zu sehen ist, gib eine leere Liste zurück und erkläre es im Hinweis. Antworte ausschließlich über das Werkzeug.`;

export class AiError extends Error {}

export async function estimateMeal({ image, mimeType, comment }: { image: Buffer; mimeType: string; comment: string }): Promise<MealEstimate> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("Die KI ist noch nicht eingerichtet.");
  const base = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";

  const content: unknown[] = [{ type: "image", source: { type: "base64", media_type: mimeType, data: image.toString("base64") } }];
  content.push({ type: "text", text: comment ? `Kommentar der Person: ${comment}` : "Kein Kommentar." });

  let res: Response;
  try {
    res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new AiError("Die KI ist gerade nicht erreichbar. Versuche es gleich noch einmal.");
  }
  if (!res.ok) {
    console.error("AI estimate failed", res.status, await res.text().catch(() => ""));
    throw new AiError(res.status === 429 || res.status === 529 ? "Die KI ist gerade ausgelastet. Versuche es gleich noch einmal." : "Die Schätzung hat nicht geklappt. Versuche es noch einmal.");
  }

  const body = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
  const call = body.content?.find((c) => c.type === "tool_use" && c.name === TOOL.name);
  const parsed = estimateSchema.safeParse(call?.input);
  if (!parsed.success) {
    console.error("AI estimate unparseable", JSON.stringify(body).slice(0, 2000));
    throw new AiError("Die Schätzung hat nicht geklappt. Versuche es noch einmal.");
  }
  return parsed.data;
}
