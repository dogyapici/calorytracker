import Link from "next/link";
import { Icon } from "@/components/icons";
import { MealEditor } from "@/components/meal-editor";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";

export const metadata = { title: "Neue Mahlzeit" };

export default async function CreateMealPage({ searchParams }: PageProps<"/meals/create">) {
  await requireUser();
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "breakfast";
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/meals?day=${day}&meal=${meal}`} className="btn-secondary px-3" aria-label="Zurück">
          <Icon name="back" />
        </Link>
        <h1 className="text-h1">Neue Mahlzeit</h1>
      </header>
      <MealEditor initialItems={[]} day={day} mealKey={meal} />
    </div>
  );
}
