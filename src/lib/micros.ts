/**
 * Vitamins and minerals. Values are stored per 100 g (foods) or per entry, in the unit given here.
 * References are rounded adult intake values of the German Nutrition Society (DGE); where they
 * differ by sex, the midpoint is used.
 */
export const MICROS = [
  { key: "vitaminA", off: "vitamin-a", label: "Vitamin A", unit: "µg", reference: 900 },
  { key: "vitaminD", off: "vitamin-d", label: "Vitamin D", unit: "µg", reference: 20 },
  { key: "vitaminE", off: "vitamin-e", label: "Vitamin E", unit: "mg", reference: 13 },
  { key: "vitaminC", off: "vitamin-c", label: "Vitamin C", unit: "mg", reference: 100 },
  { key: "vitaminB1", off: "vitamin-b1", label: "Vitamin B1", unit: "mg", reference: 1.1 },
  { key: "vitaminB2", off: "vitamin-b2", label: "Vitamin B2", unit: "mg", reference: 1.2 },
  { key: "vitaminB6", off: "vitamin-b6", label: "Vitamin B6", unit: "mg", reference: 1.5 },
  { key: "vitaminB12", off: "vitamin-b12", label: "Vitamin B12", unit: "µg", reference: 4 },
  { key: "folate", off: "vitamin-b9", label: "Folat", unit: "µg", reference: 300 },
  { key: "calcium", off: "calcium", label: "Calcium", unit: "mg", reference: 1000 },
  { key: "iron", off: "iron", label: "Eisen", unit: "mg", reference: 12 },
  { key: "magnesium", off: "magnesium", label: "Magnesium", unit: "mg", reference: 350 },
  { key: "zinc", off: "zinc", label: "Zink", unit: "mg", reference: 10 },
  { key: "potassium", off: "potassium", label: "Kalium", unit: "mg", reference: 4000 },
] as const;

export type MicroKey = (typeof MICROS)[number]["key"];
export type Micros = Partial<Record<MicroKey, number>>;

/** Daily guidance for the "other nutrients" that are on almost every label. */
export const EXTRA_LIMITS = {
  fiber: { label: "Ballaststoffe", min: 30 },
  sugar: { label: "Zucker", max: 50 },
  saturatedFat: { label: "Gesättigte Fettsäuren", maxShareOfKcal: 0.1 },
  salt: { label: "Salz", max: 6 },
} as const;

const UNIT_FROM_GRAMS = { mg: 1_000, µg: 1_000_000 } as const;

/** Reads vitamins/minerals from Open Food Facts nutriments (which are normalized to grams per 100 g). */
export function parseOffMicros(nutriments: Record<string, unknown>): Micros {
  const out: Micros = {};
  for (const m of MICROS) {
    const raw = nutriments[`${m.off}_100g`];
    const n = typeof raw === "string" ? Number(raw) : raw;
    if (typeof n === "number" && Number.isFinite(n) && n >= 0) {
      out[m.key] = Math.round(n * UNIT_FROM_GRAMS[m.unit] * 1000) / 1000;
    }
  }
  return out;
}

export function scaleMicros(micros: Micros | null | undefined, factor: number): Micros {
  const out: Micros = {};
  for (const [k, v] of Object.entries(micros ?? {})) out[k as MicroKey] = (v as number) * factor;
  return out;
}

export function sumMicros(list: (Micros | null | undefined)[]): Micros {
  const out: Micros = {};
  for (const micros of list) {
    for (const [k, v] of Object.entries(micros ?? {})) {
      out[k as MicroKey] = (out[k as MicroKey] ?? 0) + (v as number);
    }
  }
  return out;
}
