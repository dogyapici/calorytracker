import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCustomFood } from "@/app/actions";
import { RecipeEditor } from "@/components/recipe-editor";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { getRecipe } from "@/lib/queries";

export const metadata = { title: "Rezept bearbeiten" };

export default async function EditRecipePage({ params, searchParams }: PageProps<"/recipes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const data = await getRecipe(user.id, Number(id) || 0);
  if (!data) notFound();
  const { recipe, ingredients } = data;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "dinner";

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/food/${recipe.id}?day=${day}&meal=${meal}`} className="btn-secondary px-3" aria-label="Zurück">
          ‹
        </Link>
        <h1 className="text-lg font-bold">Rezept bearbeiten</h1>
      </header>
      <RecipeEditor
        recipe={{ id: recipe.id, name: recipe.name, servings: recipe.recipeServings ?? 1, cookedGrams: recipe.recipeCookedGrams }}
        initialIngredients={ingredients.map(({ food, grams }) => ({
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
        }))}
        day={day}
        meal={meal}
      />
      <form action={deleteCustomFood}>
        <input type="hidden" name="foodId" value={recipe.id} />
        <button className="btn-danger w-full">Rezept löschen</button>
      </form>
    </div>
  );
}
