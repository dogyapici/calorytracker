"use client";

import { useActionState, useRef, useState } from "react";
import { logWeight, type FormState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

const MEASURES = [
  ["waistCm", "Taille (cm)"],
  ["hipCm", "Hüfte (cm)"],
  ["chestCm", "Brust (cm)"],
  ["armCm", "Oberarm (cm)"],
  ["thighCm", "Oberschenkel (cm)"],
  ["bodyFatPct", "Körperfett (%)"],
] as const;

const MAX_SIDE = 1280;

/** Downscales a picked photo to a JPEG data URL so uploads stay small and EXIF data is dropped. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function WeightForm({ today, lastKg }: { today: string; lastKg: number | null }) {
  const [photo, setPhoto] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // A successful save clears the form, including the photo preview.
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await logWeight(prev, formData);
    if (result?.ok) {
      setPhoto("");
      if (fileRef.current) fileRef.current.value = "";
    }
    return result;
  }, undefined);

  const onFile = async (file: File | undefined) => {
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
    <form action={action} className="card space-y-3">
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

      <details className="group rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          Körpermaße (optional)
          <span className="muted transition group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {MEASURES.map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={key}>{label}</label>
              <input className="input tabular-nums" id={key} name={key} inputMode="decimal" defaultValue={state?.values?.[key]} />
            </div>
          ))}
        </div>
      </details>

      <div className="space-y-2">
        <input type="hidden" name="photo" value={photo} />
        <label className="btn-secondary w-full cursor-pointer">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {photo ? "Anderes Foto wählen" : "Foto hinzufügen (optional)"}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {busy && <p className="text-sm muted">Foto wird vorbereitet…</p>}
        {photoError && <p className="text-sm text-red-600">{photoError}</p>}
        {photo && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Vorschau deines Fotos" className="max-h-72 w-full rounded-xl object-contain bg-zinc-100 dark:bg-zinc-800" />
            <button
              type="button"
              className="btn absolute right-2 top-2 bg-white/90 px-2 py-1 text-xs dark:bg-zinc-900/90"
              onClick={() => {
                setPhoto("");
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Entfernen
            </button>
          </div>
        )}
        <p className="text-xs muted">Das Foto sieht nur du. Es wird verkleinert gespeichert, Standortdaten werden entfernt.</p>
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
