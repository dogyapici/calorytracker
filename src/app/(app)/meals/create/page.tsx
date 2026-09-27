import { PageHeader } from "@/components/page-header";
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
      <PageHeader back={`/meals?day=${day}&meal=${meal}`} eyebrow="Mahlzeiten" title="Neue Mahlzeit" />
      <MealEditor initialItems={[]} day={day} mealKey={meal} />
    </div>
  );
}
