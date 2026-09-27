import { PageHeader } from "@/components/page-header";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { CustomFoodForm } from "./custom-food-form";

export const metadata = { title: "Eigenes Lebensmittel" };

export default async function NewFoodPage({ searchParams }: PageProps<"/foods/new">) {
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "snack";
  return (
    <div className="space-y-4">
      <PageHeader back={`/add?day=${day}&meal=${meal}`} eyebrow="Neu anlegen" title="Eigenes Lebensmittel" />
      <CustomFoodForm day={day} meal={meal} />
    </div>
  );
}
