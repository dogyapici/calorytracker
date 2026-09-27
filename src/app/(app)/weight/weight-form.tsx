"use client";

import { useActionState, useState } from "react";
import { logWeight, type FormState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { Collapse } from "@/components/collapse";
import { Icon } from "@/components/icons";
import { PhotoPicker } from "@/components/photo-picker";
import { shrink } from "@/lib/shrink-image";

const MEASURES = [
  ["waistCm", "Taille (cm)"],
  ["hipCm", "Hüfte (cm)"],
  ["chestCm", "Brust (cm)"],
  ["armCm", "Oberarm (cm)"],
  ["thighCm", "Oberschenkel (cm)"],
  ["bodyFatPct", "Körperfett (%)"],
] as const;

export function WeightForm({ today, lastKg }: { today: string; lastKg: number | null }) {
  const [photo, setPhoto] = useState("");
  const [measuresOpen, setMeasuresOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A successful save clears the form, including the photo preview.
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await logWeight(prev, formData);
    if (result?.ok) setPhoto("");
    return result;
  }, undefined);

  const onFile = async (file: Blob | undefined) => {
    setPhotoError(null);
    if (!file) return setPhoto("");
    setBusy(true);
    try {
      setPhoto(await shrink(file));
    } catch {
      setPhotoError("Dieses Foto konnte nicht geöffnet werden. Versuche ein anderes.");
      setPhoto("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-h3">Gewicht eintragen</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="kg">Gewicht (kg)</label>
          <input className="input text-lg tabular-nums" id="kg" name="kg" defaultValue={state?.values?.kg} inputMode="decimal" placeholder={lastKg ? String(lastKg).replace(".", ",") : "z. B. 75,5"} required />
        </div>
        <div>
          <label className="label" htmlFor="day">Datum</label>
          <input className="input" id="day" name="day" type="date" defaultValue={state?.values?.day ?? today} max={today} required />
        </div>
      </div>

      <div className="rounded-button border border-border px-3 py-2">
        <button type="button" onClick={() => setMeasuresOpen(!measuresOpen)} aria-expanded={measuresOpen} className="flex w-full items-center justify-between text-left text-sm font-medium">
          Körpermaße (optional)
          <Icon name="expand" size={20} className={`text-text-secondary transition-transform duration-300 ease-out ${measuresOpen ? "rotate-180" : ""}`} />
        </button>
        <Collapse open={measuresOpen} className="grid grid-cols-2 gap-3 pb-1 pt-3">
          {MEASURES.map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={key}>{label}</label>
              <input className="input tabular-nums" id={key} name={key} inputMode="decimal" defaultValue={state?.values?.[key]} />
            </div>
          ))}
        </Collapse>
      </div>

      <div className="space-y-2">
        <input type="hidden" name="photo" value={photo} />
        <PhotoPicker frame="none" hint="Fortschrittsfoto" takeLabel={photo ? "Neues Foto" : "Foto (optional)"} onPick={onFile} />
        {busy && <p className="text-sm muted">Foto wird vorbereitet…</p>}
        {photoError && <p className="text-sm text-danger">{photoError}</p>}
        {photo && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Vorschau deines Fotos" className="max-h-72 w-full rounded-button object-contain bg-surface-muted" />
            <button
              type="button"
              className="btn absolute right-2 top-2 bg-surface/90 px-2 py-1 text-xs"
              onClick={() => setPhoto("")}
            >
              Entfernen
            </button>
          </div>
        )}
        <p className="text-caption muted">Das Foto sieht nur du. Es wird verkleinert gespeichert, Standortdaten werden entfernt.</p>
      </div>

      <FormMessage state={state} />
      {busy ? (
        <button type="button" className="btn-primary w-full" disabled>
          Eintragen
        </button>
      ) : (
        <SubmitButton>Eintragen</SubmitButton>
      )}
    </form>
  );
}
