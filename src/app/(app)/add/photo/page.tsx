import { PageHeader } from "@/components/page-header";
import { aiEnabled } from "@/lib/ai-estimate";
import { requireUser } from "@/lib/auth";
import { dayOrToday } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { PhotoEstimate } from "./photo-estimate";

export const metadata = { title: "Foto schätzen" };

export default async function PhotoEstimatePage({ searchParams }: PageProps<"/add/photo">) {
  await requireUser();
  const { day: dayParam, meal: mealParam } = await searchParams;
  const day = dayOrToday(typeof dayParam === "string" ? dayParam : null);
  const meal = MEALS.find((m) => m.key === mealParam) ?? MEALS[0];

  return (
    <div className="space-y-4">
      <PageHeader back={`/add?day=${day}&meal=${meal.key}`} eyebrow={`${meal.emoji} ${meal.label}`} title="Foto schätzen" />
      {aiEnabled() ? (
        <>
          <p className="text-label muted">Fotografiere deine Mahlzeit und schreib dazu, was man nicht sieht. Die KI schätzt Mengen und Nährwerte, du prüfst und trägst ein.</p>
          <PhotoEstimate day={day} meal={meal.key} />
        </>
      ) : (
        <p className="card text-label muted">Die KI ist noch nicht eingerichtet. Dafür fehlt der kostenlose Schlüssel GEMINI_API_KEY in den Einstellungen von Vercel.</p>
      )}
    </div>
  );
}
