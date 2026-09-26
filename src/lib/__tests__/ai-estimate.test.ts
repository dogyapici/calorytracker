import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { estimateMeal, estimateSchema } = await import("../ai-estimate");

const item = { name: "Apfel", grams: 150, kcal: 78, protein: 0.4, carbs: 21, fat: 0.3 };

describe("estimateSchema", () => {
  it("accepts a normal estimate with optional extras", () => {
    const r = estimateSchema.safeParse({ items: [{ ...item, fiber: 3.6, salt: null }], confidence: "hoch" });
    expect(r.success).toBe(true);
  });

  it("rejects negative or missing values", () => {
    expect(estimateSchema.safeParse({ items: [{ ...item, kcal: -1 }], confidence: "hoch" }).success).toBe(false);
    expect(estimateSchema.safeParse({ items: [{ name: "x" }], confidence: "hoch" }).success).toBe(false);
    expect(estimateSchema.safeParse({ items: [item], confidence: "sicher" }).success).toBe(false);
  });
});

describe("estimateMeal", () => {
  it("sends the photo and comment and reads the tool call", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.messages[0].content[0].source).toMatchObject({ type: "base64", media_type: "image/jpeg", data: Buffer.from("img").toString("base64") });
      expect(body.messages[0].content[1].text).toContain("mit Öl");
      return new Response(JSON.stringify({ content: [{ type: "tool_use", name: body.tool_choice.name, input: { items: [item], confidence: "mittel" } }] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await estimateMeal({ image: Buffer.from("img"), mimeType: "image/jpeg", comment: "mit Öl" });
    expect(r.items[0].name).toBe("Apfel");
    vi.unstubAllGlobals();
  });

  it("turns API errors into a friendly message", async () => {
    process.env.ANTHROPIC_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("overloaded", { status: 529 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(estimateMeal({ image: Buffer.from("x"), mimeType: "image/png", comment: "" })).rejects.toThrow("ausgelastet");
    vi.unstubAllGlobals();
  });
});
