/** Largest photo we store after the browser has downscaled it. */
export const MAX_PHOTO_BYTES = 1_500_000;

const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

/**
 * Decodes a `data:image/...;base64,` URL from the weight form. The stored type comes from the
 * file's own bytes, not from what the client claims, so nothing but real images is ever served.
 */
export function decodePhoto(dataUrl: string): { mimeType: string; data: Buffer } | { error: string } {
  const match = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return { error: "Das Foto konnte nicht gelesen werden." };
  const data = Buffer.from(match[1], "base64");
  if (data.length === 0) return { error: "Das Foto ist leer." };
  if (data.length > MAX_PHOTO_BYTES) return { error: "Das Foto ist zu groß." };
  const kind = SIGNATURES.find((s) => s.test(data));
  if (!kind) return { error: "Bitte wähle ein Foto im Format JPEG, PNG oder WebP." };
  return { mimeType: kind.mime, data };
}
