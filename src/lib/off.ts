import { parseOffMicros, type Micros } from "./micros";

/**
 * Open Food Facts client. Their API asks for a descriptive User-Agent and allows
 * roughly 10 searches and 100 product lookups per minute per IP, so searches run
 * only on submit and every picked product is cached in our own `foods` table.
 *
 * Search uses their fast search service (Search-a-licious) first. The old
 * cgi/search.pl is often slow on the first request for a term and only answers
 * on a second try, so it is the fallback, retried once.
 */

const OFF_BASE = process.env.OFF_BASE_URL ?? "https://world.openfoodfacts.org";
const OFF_SEARCH_BASE = process.env.OFF_SEARCH_URL ?? "https://search.openfoodfacts.org";
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

async function offFetch(url: string, timeout = 12_000): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(timeout),
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

function uniqueFoods(products: RawProduct[] | undefined): OffFood[] {
  const seen = new Set<string>();
  const out: OffFood[] = [];
  for (const raw of products ?? []) {
    const food = parseProduct(raw);
    if (food && !seen.has(food.barcode)) {
      seen.add(food.barcode);
      out.push(food);
    }
  }
  return out;
}

async function searchFast(query: string, pageSize: number): Promise<OffFood[]> {
  const params = new URLSearchParams({ q: query, langs: "de", page_size: String(pageSize), fields: FIELDS });
  const data = (await offFetch(`${OFF_SEARCH_BASE}/search?${params}`, 8_000)) as { hits?: RawProduct[] } | null;
  if (!data || !Array.isArray(data.hits)) throw new Error("Unerwartete Antwort der Suche");
  return uniqueFoods(data.hits);
}

async function searchLegacy(query: string, pageSize: number): Promise<OffFood[]> {
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
  const url = `${OFF_BASE}/cgi/search.pl?${params}`;
  const data = (await offFetch(url, 15_000).catch(() => offFetch(url, 15_000))) as { products?: RawProduct[] } | null;
  return uniqueFoods(data?.products);
}

const fold = (text: string) =>
  text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Open Food Facts also returns products that match only one word of the query or
 * only in fields we don't show. We re-rank by how well name and brand match:
 * all words present first, then name starting with the query, then shorter names.
 * Products that contain none of the words are dropped if better ones exist.
 */
export function rankFoods<T extends { name: string; brand: string | null }>(query: string, foods: T[]): T[] {
  const words = fold(query).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
  if (!words.length) return foods;
  const phrase = words.join(" ");
  const scored = foods.map((food, index) => {
    const name = fold(food.name);
    const text = `${name} ${fold(food.brand ?? "")}`;
    const hits = words.filter((w) => text.includes(w)).length;
    let score = hits * 10 + (hits === words.length ? 100 : 0);
    if (name.startsWith(phrase)) score += 30;
    else if (name.includes(phrase)) score += 15;
    score += words.filter((w) => new RegExp(`(^|[^\\p{L}])${w}`, "u").test(name)).length * 5;
    score -= Math.min(name.length, 80) / 10;
    return { food, hits, score, index };
  });
  const best = Math.max(...scored.map((s) => s.hits));
  return scored
    .filter((s) => s.hits > 0 || best === 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((s) => s.food);
}

export async function searchProducts(query: string, pageSize = 24): Promise<OffFood[]> {
  // Mehr holen als angezeigt, damit nach dem Umsortieren die passendsten oben stehen.
  const fetchSize = pageSize * 2;
  let found: OffFood[] = [];
  try {
    found = await searchFast(query, fetchSize);
  } catch (e) {
    console.warn("OFF fast search failed, falling back", e instanceof Error ? e.message : e);
  }
  if (!found.length) found = await searchLegacy(query, fetchSize);
  return rankFoods(query, found).slice(0, pageSize);
}
