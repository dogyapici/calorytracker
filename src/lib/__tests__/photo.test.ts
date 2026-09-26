import { describe, expect, it } from "vitest";
import { decodePhoto, MAX_PHOTO_BYTES } from "../photo";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);

describe("decodePhoto", () => {
  it("accepts a JPEG and detects its type from the bytes", () => {
    const r = decodePhoto(`data:image/png;base64,${jpeg.toString("base64")}`);
    expect(r).toMatchObject({ mimeType: "image/jpeg" });
  });

  it("rejects non-images disguised as images", () => {
    const html = Buffer.from("<script>alert(1)</script>").toString("base64");
    expect(decodePhoto(`data:image/jpeg;base64,${html}`)).toHaveProperty("error");
  });

  it("rejects malformed and oversized input", () => {
    expect(decodePhoto("data:text/html;base64,AAAA")).toHaveProperty("error");
    expect(decodePhoto("not a data url")).toHaveProperty("error");
    const big = Buffer.concat([jpeg, Buffer.alloc(MAX_PHOTO_BYTES)]).toString("base64");
    expect(decodePhoto(`data:image/jpeg;base64,${big}`)).toEqual({ error: "Das Foto ist zu groß." });
  });
});
