import { afterEach, describe, expect, it, vi } from "vitest";
import { parseProduct, searchProducts } from "../off";

describe("parseProduct", () => {
  it("prefers German names and reads per-100g nutrients", () => {
    const food = parseProduct({
      code: "3017624010701",
      product_name: "Nutella",
      product_name_de: "Nutella Nuss-Nougat-Creme",
      brands: "Ferrero, Nutella",
      serving_quantity: "15",
      serving_size: "15 g",
      nutriments: {
        "energy-kcal_100g": 539,
        proteins_100g: 6.3,
        carbohydrates_100g: 57.5,
        sugars_100g: 56.3,
        fat_100g: 30.9,
        salt_100g: 0.107,
      },
    });
    expect(food).toMatchObject({
      barcode: "3017624010701",
      name: "Nutella Nuss-Nougat-Creme",
      brand: "Ferrero",
      kcal: 539,
      protein: 6.3,
      carbs: 57.5,
      fat: 30.9,
      fiber: null,
      servingGrams: 15,
      servingLabel: "15 g",
    });
  });

  it("falls back to kJ when kcal is missing", () => {
    const food = parseProduct({ code: "123456", product_name: "Apfel", nutriments: { energy_100g: 218 } });
    expect(food?.kcal).toBeCloseTo(52.1, 1);
    expect(food?.protein).toBe(0);
  });

  it("rejects products without name or energy", () => {
    expect(parseProduct({ code: "123456", nutriments: { "energy-kcal_100g": 100 } })).toBeNull();
    expect(parseProduct({ code: "123456", product_name: "X", nutriments: {} })).toBeNull();
    expect(parseProduct({ code: "123456", product_name: "X", nutriments: { "energy-kcal_100g": 5000 } })).toBeNull();
  });
});

describe("micronutrients", () => {
  it("converts Open Food Facts grams into mg and µg", () => {
    const food = parseProduct({
      code: "4008452011006",
      product_name: "Vollmilch",
      nutriments: { "energy-kcal_100g": 64, "calcium_100g": 0.12, "vitamin-b12_100g": 0.0000004, "vitamin-c_100g": "0" },
    });
    expect(food?.micros).toEqual({ calcium: 120, vitaminB12: 0.4, vitaminC: 0 });
  });
});

describe("searchProducts", () => {
  const hit = { code: "123456789", product_name: "Haferflocken", brands: ["Kölln"], nutriments: { "energy-kcal_100g": 370 } };
  afterEach(() => vi.unstubAllGlobals());

  it("uses the fast search first", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("search.openfoodfacts.org/search?q=hafer");
      return Response.json({ hits: [hit, hit] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await searchProducts("hafer");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ name: "Haferflocken", brand: "Kölln", kcal: 370 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back to the old search and retries it once", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let legacyCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("search.openfoodfacts.org")) return new Response("down", { status: 503 });
        legacyCalls++;
        if (legacyCalls === 1) throw new Error("timeout");
        return Response.json({ products: [hit] });
      }),
    );
    const r = await searchProducts("hafer");
    expect(legacyCalls).toBe(2);
    expect(r[0].barcode).toBe("123456789");
  });
});
