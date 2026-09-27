import { PageHeader } from "@/components/page-header";
import { RecipeEditor } from "@/components/recipe-editor";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";

export const metadata = { title: "Neues Rezept" };

export default async function NewRecipePage({ searchParams }: PageProps<"/recipes/new">) {
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "dinner";
  return (
    <div className="space-y-4">
      <PageHeader back={`/recipes?day=${day}&meal=${meal}`} eyebrow="Rezepte" title="Neues Rezept" />
      <RecipeEditor initialIngredients={[]} day={day} meal={meal} />
    </div>
  );
}
