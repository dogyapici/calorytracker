"use client";

import { useRef, useState } from "react";
import { CameraView, type CameraFrame } from "@/components/camera-view";
import { Icon } from "@/components/icons";

/**
 * Two ways to add a photo: the full-screen in-app camera (cropped to its frame)
 * or a picture from the gallery.
 */
export function PhotoPicker({
  frame,
  hint,
  takeLabel,
  onPick,
}: {
  frame: CameraFrame;
  hint: string;
  takeLabel: string;
  onPick: (photo: Blob | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const gallery = () => {
    setOpen(false);
    fileRef.current?.click();
  };

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
          <Icon name="camera" size={20} />
          {takeLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={gallery}>
          Aus Galerie
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {open && (
        <CameraView
          frame={frame}
          hint={hint}
          onClose={() => setOpen(false)}
          onCapture={(blob) => {
            setOpen(false);
            onPick(blob);
          }}
        >
          <button type="button" className="mx-auto block rounded-full bg-black/50 px-4 py-2 text-label" onClick={gallery}>
            Stattdessen aus Galerie wählen
          </button>
        </CameraView>
      )}
    </>
  );
}
