import { describe, expect, it } from "vitest";
import { parseProduct } from "../off";

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
