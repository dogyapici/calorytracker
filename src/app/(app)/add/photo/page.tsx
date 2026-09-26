import Link from "next/link";
import { Icon } from "@/components/icons";
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
      <header className="flex items-center gap-3">
        <Link href={`/add?day=${day}&meal=${meal.key}`} className="btn-secondary px-3" aria-label="Zurück">
          <Icon name="back" />
        </Link>
        <h1 className="text-h1">
          <span aria-hidden className="mr-1.5">📸</span>
          Foto schätzen
        </h1>
      </header>
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
