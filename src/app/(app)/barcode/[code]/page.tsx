import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { fetchProduct } from "@/lib/off";
import { findFoodByBarcode, upsertOffFood } from "@/lib/queries";

export const metadata = { title: "Barcode" };

export default async function BarcodePage({ params, searchParams }: PageProps<"/barcode/[code]">) {
  await requireUser();
  const { code } = await params;
  const sp = await searchParams;
  const ctx = `?${new URLSearchParams({ day: dayOrToday(sp.day), meal: typeof sp.meal === "string" ? sp.meal : "snack" })}`;

  let foodId = (await findFoodByBarcode(code))?.id;
  let failed = false;
  if (!foodId) {
    try {
      const product = await fetchProduct(code);
      if (product) foodId = (await upsertOffFood(product)).id;
    } catch {
      failed = true;
    }
  }
  if (foodId) redirect(`/food/${foodId}${ctx}`);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Barcode {code}</h1>
      <p className="card text-sm">
        {failed
          ? "Open Food Facts ist gerade nicht erreichbar. Versuche es gleich noch einmal."
          : "Dieses Produkt ist nicht in Open Food Facts oder hat keine Nährwerte. Du kannst es selbst anlegen."}
      </p>
      <Link href={`/foods/new${ctx}`} className="btn-primary w-full">
        Eigenes Lebensmittel anlegen
      </Link>
      <Link href={`/add${ctx}`} className="btn-secondary w-full">
        Zurück zur Suche
      </Link>
    </div>
  );
}
