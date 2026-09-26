import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { weightPhotos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isIsoDay } from "@/lib/dates";

/** Serves the signed-in user's own progress photo for a day. Nobody else's is reachable. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/photos/[day]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });
  const { day } = await ctx.params;
  if (!isIsoDay(day)) return new Response("Nicht gefunden", { status: 404 });

  const [photo] = await db
    .select({ mimeType: weightPhotos.mimeType, data: weightPhotos.data })
    .from(weightPhotos)
    .where(and(eq(weightPhotos.userId, user.id), eq(weightPhotos.day, day)));
  if (!photo) return new Response("Nicht gefunden", { status: 404 });

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      // Private: never stored by shared caches. URLs carry a version, so a replaced photo gets a new URL.
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
