"use client";

import { useActionState, useState } from "react";
import { addEstimatedItems, estimateMealPhoto, type EstimateState } from "@/app/ai-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { Icon } from "@/components/icons";
import { PhotoPicker } from "@/components/photo-picker";
import type { EstimatedItem } from "@/lib/ai-estimate";
import { fmt, MEALS } from "@/lib/nutrition";
import { shrink } from "@/lib/shrink-image";

const NUTRIENTS = ["kcal", "protein", "carbs", "fat"] as const;
const LABELS = { kcal: "kcal", protein: "Eiweiß", carbs: "Kohlenh.", fat: "Fett" };
const OPTIONAL = ["sugar", "fiber", "saturatedFat", "salt"] as const;

const parse = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// Menge ändern skaliert alle Nährwerte mit, damit die Schätzung stimmig bleibt.
// Die Werte pro Gramm merken wir uns, damit auch eine kurz geleerte Menge (0 g)
// beim Weitertippen wieder richtig rechnet.
type Row = { id: string; item: EstimatedItem; perGram: Partial<Record<(typeof NUTRIENTS)[number] | (typeof OPTIONAL)[number], number>> };

function toRow(item: EstimatedItem, index: number): Row {
  const perGram: Row["perGram"] = {};
  if (item.grams > 0) {
    for (const k of NUTRIENTS) perGram[k] = item[k] / item.grams;
    for (const k of OPTIONAL) if (item[k] != null) perGram[k] = item[k]! / item.grams;
  }
  return { id: `${Date.now()}-${index}`, item, perGram };
}

function withGrams(row: Row, grams: number): Row {
  if (!Object.keys(row.perGram).length) return { ...row, item: { ...row.item, grams } };
  const item: EstimatedItem = { ...row.item, grams };
  for (const k of NUTRIENTS) item[k] = (row.perGram[k] ?? 0) * grams;
  for (const k of OPTIONAL) if (row.perGram[k] != null) item[k] = row.perGram[k]! * grams;
  return { ...row, item };
}

function withNutrient(row: Row, key: (typeof NUTRIENTS)[number], value: number): Row {
  const item = { ...row.item, [key]: value };
  return { ...row, item, perGram: { ...row.perGram, [key]: item.grams > 0 ? value / item.grams : row.perGram[key] } };
}

export function PhotoEstimate({ day, meal }: { day: string; meal: string }) {
  const [photo, setPhoto] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [mealKey, setMealKey] = useState(meal);
  // Kontrolliert, damit der Kommentar nach der Schätzung stehen bleibt (React leert Formulare nach Actions).
  const [comment, setComment] = useState("");

  const [estimate, estimateAction] = useActionState(async (prev: EstimateState, formData: FormData) => {
    const result = await estimateMealPhoto(prev, formData);
    setRows(result?.estimate?.items.map(toRow) ?? null);
    return result;
  }, undefined);
  const [addState, addAction] = useActionState(addEstimatedItems, undefined);

  const onFile = async (file: Blob | undefined) => {
    setPhotoError(null);
    setRows(null);
    if (!file) return setPhoto("");
    try {
      setPhoto(await shrink(file));
    } catch {
      setPhotoError("Dieses Foto konnte nicht geöffnet werden. Versuche ein anderes.");
      setPhoto("");
    }
  };

  const items = rows?.map((r) => r.item) ?? null;
  const update = (idx: number, change: (row: Row) => Row) => setRows((list) => list!.map((r, i) => (i === idx ? change(r) : r)));
  const total = (items ?? []).reduce((s, i) => ({ kcal: s.kcal + i.kcal, protein: s.protein + i.protein, carbs: s.carbs + i.carbs, fat: s.fat + i.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="space-y-4">
      <form action={estimateAction} className="card space-y-3">
        <input type="hidden" name="photo" value={photo} />
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Dein Foto der Mahlzeit" className="max-h-80 w-full rounded-button bg-surface-muted object-contain" />
        ) : null}
        <PhotoPicker frame="square" hint="Mahlzeit in den Rahmen" takeLabel={photo ? "Neues Foto" : "Foto aufnehmen"} onPick={onFile} />
        {photoError && <p className="text-sm text-danger">{photoError}</p>}
        <div>
          <label className="label" htmlFor="comment">
            Kommentar (optional)
          </label>
          <textarea
            className="input min-h-20"
            id="comment"
            name="comment"
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="z. B. „große Portion, mit Olivenöl gebraten, ohne Soße“"
          />
        </div>
        <SubmitButton className="btn-primary h-button w-full" pendingText="KI schätzt …">
          Nährwerte schätzen lassen
        </SubmitButton>
        <FormMessage state={estimate} />
      </form>

      {items && (
        <form action={addAction} className="card animate-enter space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-h3">Schätzung prüfen</h2>
            <span className="text-caption muted">Sicherheit: {estimate?.estimate?.confidence}</span>
          </div>
          {estimate?.estimate?.note && <p className="text-label muted">{estimate.estimate.note}</p>}
          {items.length === 0 ? (
            <p className="text-label muted">Auf dem Foto wurde kein Essen erkannt.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((it, idx) => (
                <li key={rows![idx].id} className="space-y-2 border-t border-border pt-4 first:border-0 first:pt-0">
                  <div className="flex gap-2">
                    <input className="input" aria-label="Name" value={it.name} onChange={(e) => update(idx, (r) => ({ ...r, item: { ...r.item, name: e.target.value } }))} />
                    <div className="relative w-28 shrink-0">
                      <input
                        className="input pr-7 text-right"
                        aria-label={`Menge von ${it.name} in Gramm`}
                        inputMode="decimal"
                        defaultValue={fmt(it.grams)}
                        onChange={(e) => update(idx, (r) => withGrams(r, parse(e.target.value)))}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption muted">g</span>
                    </div>
                    <button
                      type="button"
                      className="btn px-2 text-text-tertiary hover:text-danger"
                      aria-label={`${it.name} entfernen`}
                      onClick={() => setRows((list) => list!.filter((_, i) => i !== idx))}
                    >
                      <Icon name="remove" size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {NUTRIENTS.map((k) => (
                      <label key={`${k}-${it.grams}`} className="block">
                        <span className="text-caption muted">{LABELS[k]}</span>
                        <input
                          className="input px-2 py-1.5 text-label"
                          inputMode="decimal"
                          defaultValue={fmt(it[k], k === "kcal" ? 0 : 1)}
                          onChange={(e) => update(idx, (r) => withNutrient(r, k, parse(e.target.value)))}
                        />
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-2 rounded-button bg-surface-muted p-3 text-center">
                {NUTRIENTS.map((k) => (
                  <div key={k}>
                    <p className="text-h3">{fmt(total[k], k === "kcal" ? 0 : 1)}</p>
                    <p className="text-caption muted">{k === "kcal" ? "kcal" : `g ${LABELS[k]}`}</p>
                  </div>
                ))}
              </div>
              <div>
                <label className="label" htmlFor="meal">
                  Mahlzeit
                </label>
                <select className="input" id="meal" name="meal" value={mealKey} onChange={(e) => setMealKey(e.target.value)}>
                  {MEALS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <input type="hidden" name="day" value={day} />
              <input type="hidden" name="items" value={JSON.stringify(items)} />
              <SubmitButton className="btn-primary h-button w-full" pendingText="Wird eingetragen …">
                {items.length === 1 ? "Eintragen" : `${items.length} Einträge eintragen`}
              </SubmitButton>
              <FormMessage state={addState} />
              <p className="text-caption muted">Die Werte sind eine Schätzung der KI. Prüfe sie kurz, bevor du einträgst.</p>
            </>
          )}
        </form>
      )}
    </div>
  );
}
