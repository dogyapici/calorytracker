import Link from "next/link";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { CustomFoodForm } from "./custom-food-form";
import { Icon } from "@/components/icons";

export const metadata = { title: "Eigenes Lebensmittel" };

export default async function NewFoodPage({ searchParams }: PageProps<"/foods/new">) {
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "snack";
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/add?day=${day}&meal=${meal}`} className="btn-secondary px-3" aria-label="Zurück">
          <Icon name="back" />
        </Link>
        <h1 className="text-h1">Eigenes Lebensmittel</h1>
      </header>
      <CustomFoodForm day={day} meal={meal} />
    </div>
  );
}
