import { parseOffMicros, type Micros } from "./micros";

/**
 * Open Food Facts client. Their API asks for a descriptive User-Agent and allows
 * roughly 10 searches and 100 product lookups per minute per IP, so searches run
 * only on submit and every picked product is cached in our own `foods` table.
 */

const OFF_BASE = process.env.OFF_BASE_URL ?? "https://world.openfoodfacts.org";
const USER_AGENT = `Kalorientracker/1.0 (${process.env.OFF_CONTACT ?? "private use"})`;
const FIELDS = [
  "code",
  "product_name",
  "product_name_de",
  "generic_name_de",
  "brands",
  "nutriments",
  "serving_quantity",
  "serving_size",
  "image_front_small_url",
].join(",");

export type OffFood = {
  barcode: string;
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  sugar: number | null;
  fat: number;
  saturatedFat: number | null;
  fiber: number | null;
  salt: number | null;
  servingGrams: number | null;
  servingLabel: string | null;
  imageUrl: string | null;
  micros: Micros;
};

type RawProduct = Record<string, unknown> & { nutriments?: Record<string, unknown> };

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

function str(value: unknown): string | null {
  if (Array.isArray(value)) value = value.join(", ");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Converts a raw Open Food Facts product into our shape, or null if it lacks usable energy data. */
export function parseProduct(raw: RawProduct): OffFood | null {
  const n = raw.nutriments ?? {};
  const barcode = str(raw.code);
  const name = str(raw.product_name_de) ?? str(raw.product_name) ?? str(raw.generic_name_de);
  if (!barcode || !name) return null;

  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === null) {
    const kj = num(n["energy-kj_100g"]) ?? num(n["energy_100g"]);
    if (kj !== null) kcal = kj / 4.184;
  }
  if (kcal === null || kcal > 950) return null;

  const servingGrams = num(raw.serving_quantity);
  return {
    barcode,
    name,
    brand: str(raw.brands)?.split(",")[0]?.trim() ?? null,
    kcal: Math.round(kcal * 10) / 10,
    protein: num(n["proteins_100g"]) ?? 0,
    carbs: num(n["carbohydrates_100g"]) ?? 0,
    sugar: num(n["sugars_100g"]),
    fat: num(n["fat_100g"]) ?? 0,
    saturatedFat: num(n["saturated-fat_100g"]),
    fiber: num(n["fiber_100g"]),
    salt: num(n["salt_100g"]),
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : null,
    servingLabel: str(raw.serving_size),
    imageUrl: str(raw.image_front_small_url),
    micros: parseOffMicros(n),
  };
}

async function offFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    next: { revalidate: 60 * 60 * 24 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts antwortet mit ${res.status}`);
  return res.json();
}

export async function fetchProduct(barcode: string): Promise<OffFood | null> {
  if (!/^\d{4,14}$/.test(barcode)) return null;
  const data = (await offFetch(`${OFF_BASE}/api/v2/product/${barcode}.json?fields=${FIELDS}`)) as {
    status?: number;
    product?: RawProduct;
  } | null;
  if (!data || data.status !== 1 || !data.product) return null;
  return parseProduct({ code: barcode, ...data.product });
}

export async function searchProducts(query: string, pageSize = 24): Promise<OffFood[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(pageSize),
    fields: FIELDS,
    lc: "de",
    sort_by: "unique_scans_n",
  });
  const data = (await offFetch(`${OFF_BASE}/cgi/search.pl?${params}`)) as { products?: RawProduct[] } | null;
  const seen = new Set<string>();
  const out: OffFood[] = [];
  for (const raw of data?.products ?? []) {
    const food = parseProduct(raw);
    if (food && !seen.has(food.barcode)) {
      seen.add(food.barcode);
      out.push(food);
    }
  }
  return out;
}
