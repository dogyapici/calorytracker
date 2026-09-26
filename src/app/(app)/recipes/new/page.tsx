import Link from "next/link";
import { RecipeEditor } from "@/components/recipe-editor";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { Icon } from "@/components/icons";

export const metadata = { title: "Neues Rezept" };

export default async function NewRecipePage({ searchParams }: PageProps<"/recipes/new">) {
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "dinner";
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={`/recipes?day=${day}&meal=${meal}`} className="btn-secondary px-3" aria-label="Zurück">
          <Icon name="back" />
        </Link>
        <h1 className="text-h1">Neues Rezept</h1>
      </header>
      <RecipeEditor initialIngredients={[]} day={day} meal={meal} />
    </div>
  );
}
