import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { deleteEntry, updateEntry } from "@/app/actions";
import { AmountForm } from "@/components/amount-form";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";

import { PendingButton } from "@/components/form-bits";

export const metadata = { title: "Eintrag bearbeiten" };

export default async function EntryPage({ params }: PageProps<"/entry/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, Number(id) || 0), eq(entries.userId, user.id)));
  if (!entry) notFound();

  // Per-100 g values derived from the snapshot, so the preview matches what will be saved.
  const f = 100 / entry.grams;
  const per100 = { kcal: entry.kcal * f, protein: entry.protein * f, carbs: entry.carbs * f, fat: entry.fat * f };

  return (
    <div className="space-y-4">
      <PageHeader back={`/?day=${entry.day}`} eyebrow="Eintrag bearbeiten" title={entry.name} subtitle={formatDay(entry.day)} />
      <AmountForm
        action={updateEntry}
        per100={per100}
        hidden={{ id: entry.id }}
        initialGrams={entry.grams}
        initialMeal={entry.meal}
        submitLabel="Speichern"
      />
      <form action={deleteEntry}>
        <input type="hidden" name="id" value={entry.id} />
        <PendingButton className="btn-danger w-full">Eintrag löschen</PendingButton>
      </form>
    </div>
  );
}
