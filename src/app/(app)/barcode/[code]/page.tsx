import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { getOrImportBarcode } from "@/lib/queries";

export const metadata = { title: "Barcode" };

export default async function BarcodePage({ params, searchParams }: PageProps<"/barcode/[code]">) {
  await requireUser();
  const { code } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams({ day: dayOrToday(sp.day), meal: typeof sp.meal === "string" ? sp.meal : "snack" });
  if (typeof sp.q === "string" && sp.q) query.set("q", sp.q.slice(0, 100));
  const ctx = `?${query}`;

  let foodId: number | undefined;
  let failed = false;
  try {
    foodId = (await getOrImportBarcode(code))?.id;
  } catch {
    failed = true;
  }
  if (foodId) redirect(`/food/${foodId}${ctx}`);

  return (
    <div className="space-y-4">
      <PageHeader back={`/add${ctx}`} eyebrow={`Barcode ${code}`} title={failed ? "Gerade nicht erreichbar" : "Produkt nicht gefunden"} />
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
