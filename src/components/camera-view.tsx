"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

export type CameraFrame = "wide" | "square" | "tall";

// Größe des scharfen Rahmens in der Mitte; alles außen herum wird unscharf.
const FRAMES: Record<CameraFrame, { width: string; height: string }> = {
  wide: { width: "min(84vw, 420px)", height: "min(52vw, 260px)" },
  square: { width: "min(86vw, 70vh, 480px)", height: "min(86vw, 70vh, 480px)" },
  tall: { width: "min(72vw, 48vh, 400px)", height: "min(108vw, 72vh, 600px)" },
};

type Props = {
  frame: CameraFrame;
  hint: string;
  onClose: () => void;
  /** Called with the live video while it runs, e.g. to detect barcodes. */
  onVideo?: (video: HTMLVideoElement) => (() => void) | void;
  /** Shows a shutter button; the photo is cropped to the frame. */
  onCapture?: (photo: Blob) => void;
  /** Extra controls under the frame (manual input, gallery button …). */
  children?: React.ReactNode;
};

/** Full-screen camera with a sharp frame in the middle and a blurred surrounding. */
export function CameraView({ frame, hint, onClose, onVideo, onCapture, children }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let cleanup: (() => void) | void;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || stopped) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play();
        setReady(true);
        cleanup = onVideo?.(video);
      } catch {
        if (!stopped) setError("Die Kamera konnte nicht gestartet werden. Erlaube den Kamerazugriff in den Browser-Einstellungen.");
      }
    })();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      stopped = true;
      cleanup?.();
      stream?.getTracks().forEach((t) => t.stop());
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const box = frameRef.current;
    if (!video || !box || !onCapture || !video.videoWidth) return;
    // Das Video füllt den Bildschirm (object-cover); den Rahmen auf Videopixel umrechnen.
    const view = video.getBoundingClientRect();
    const rect = box.getBoundingClientRect();
    const scale = Math.max(view.width / video.videoWidth, view.height / video.videoHeight);
    const offsetX = (view.width - video.videoWidth * scale) / 2;
    const offsetY = (view.height - video.videoHeight * scale) / 2;
    const sx = Math.max(0, (rect.left - view.left - offsetX) / scale);
    const sy = Math.max(0, (rect.top - view.top - offsetY) / scale);
    const sw = Math.min(video.videoWidth - sx, rect.width / scale);
    const sh = Math.min(video.videoHeight - sy, rect.height / scale);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    canvas.getContext("2d")!.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    navigator.vibrate?.(30);
    canvas.toBlob((blob) => blob && onCapture(blob), "image/jpeg", 0.9);
  };

  const size = FRAMES[frame];
  const blur = "bg-black/45 backdrop-blur-md";

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black text-white" role="dialog" aria-modal="true" aria-label="Kamera">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />

      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `1fr ${size.width} 1fr`, gridTemplateRows: `1fr ${size.height} 1fr` }}>
        <div className={`col-span-3 ${blur}`} />
        <div className={blur} />
        <div ref={frameRef} className="relative">
          {(["left-0 top-0 border-l-4 border-t-4 rounded-tl-card", "right-0 top-0 border-r-4 border-t-4 rounded-tr-card", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-card", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-card"] as const).map((c) => (
            <span key={c} aria-hidden className={`absolute h-9 w-9 border-white ${c}`} />
          ))}
          {onVideo && ready && <span aria-hidden className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-white/80" />}
        </div>
        <div className={blur} />
        <div className={`col-span-3 ${blur}`} />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50" aria-label="Kamera schließen">
          <Icon name="remove" />
        </button>
        <p className="rounded-full bg-black/50 px-3 py-1.5 text-label">{hint}</p>
        <span className="w-11" />
      </div>

      <div className="absolute inset-x-0 bottom-0 space-y-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {error && <p className="rounded-button bg-black/70 px-3 py-2 text-center text-label">{error}</p>}
        {onCapture && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={capture}
              disabled={!ready}
              className="h-18 w-18 rounded-full border-4 border-white bg-white/30 transition-transform active:scale-90 disabled:opacity-40"
              aria-label="Foto aufnehmen"
            />
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
