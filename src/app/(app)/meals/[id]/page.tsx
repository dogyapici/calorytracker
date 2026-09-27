import { PageHeader } from "@/components/page-header";
import { notFound } from "next/navigation";
import { MealEditor } from "@/components/meal-editor";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { getSavedMeals } from "@/lib/queries";

export const metadata = { title: "Mahlzeit bearbeiten" };

export default async function EditMealPage({ params, searchParams }: PageProps<"/meals/[id]">) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const saved = (await getSavedMeals(user.id)).find((m) => m.id === Number(id));
  if (!saved) notFound();
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "breakfast";
  const items = saved.items.map(({ food, grams }) => ({
    foodId: food.id,
    barcode: food.barcode,
    name: food.name,
    brand: food.brand,
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    servingGrams: food.servingGrams,
    grams: String(grams),
  }));
  return (
    <div className="space-y-4">
      <PageHeader back={`/meals?day=${day}&meal=${meal}`} eyebrow="Mahlzeiten" title="Mahlzeit bearbeiten" />
      <MealEditor meal={{ id: saved.id, name: saved.name }} initialItems={items} day={day} mealKey={meal} />
    </div>
  );
}
