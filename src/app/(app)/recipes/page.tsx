import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FoodList } from "@/components/food-list";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { fmt, MEALS } from "@/lib/nutrition";
import { getRecipes } from "@/lib/queries";

export const metadata = { title: "Rezepte" };

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const user = await requireUser();
  const sp = await searchParams;
  const day = dayOrToday(sp.day);
  const meal = MEALS.find((m) => m.key === sp.meal)?.key ?? "dinner";
  const ctx = `?day=${day}&meal=${meal}`;
  const recipes = await getRecipes(user.id);

  return (
    <div className="space-y-4">
      <PageHeader back={`/add${ctx}`} eyebrow="Eigene Rezepte" title="Rezepte" />
      <Link href={`/recipes/new${ctx}`} className="btn-primary w-full">
        + Neues Rezept
      </Link>
      {recipes.length ? (
        <FoodList
          items={recipes.map((r) => ({
            key: `r${r.id}`,
            href: `/food/${r.id}${ctx}`,
            name: r.name,
            brand: null,
            kcal: r.kcal,
            badge: r.servingGrams ? `${fmt((r.kcal * r.servingGrams) / 100)} kcal pro Portion` : undefined,
          }))}
        />
      ) : (
        <p className="card text-sm muted">
          Noch keine Rezepte. Lege Gerichte an, die du öfter kochst. Danach trägst du eine Portion mit einem Tipp ein.
        </p>
      )}
    </div>
  );
}
