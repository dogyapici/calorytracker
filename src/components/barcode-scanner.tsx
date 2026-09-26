"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };

async function createDetector(): Promise<Detector> {
  const formats = ["ean_13", "ean_8", "upc_a", "upc_e"];
  const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (Native) return new Native({ formats });
  // iOS Safari and Firefox have no native BarcodeDetector; fall back to the ZXing WebAssembly build.
  const { BarcodeDetector } = await import("barcode-detector/ponyfill");
  return new BarcodeDetector({ formats: formats as never[] });
}

export function BarcodeScanner({ targetBase }: { targetBase: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const go = (code: string) => router.push(`/barcode/${encodeURIComponent(code)}${targetBase}`);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = stream;
        await video.play();
        const detector = await createDetector();
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            const code = codes.find((c) => /^\d{8,14}$/.test(c.rawValue));
            if (code) {
              stopped = true;
              navigator.vibrate?.(80);
              go(code.rawValue);
              return;
            }
          } catch {
            // Frame not ready yet; try again.
          }
          timer = setTimeout(tick, 200);
        };
        tick();
      } catch {
        setError("Kamera konnte nicht gestartet werden. Erlaube den Kamerazugriff oder gib den Barcode unten ein.");
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) {
    return (
      <button type="button" className="btn-secondary w-full" onClick={() => { setError(null); setOpen(true); }}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8" />
        </svg>
        Barcode scannen
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (/^\d{8,14}$/.test(manual.trim())) go(manual.trim());
        }}
      >
        <input
          className="input"
          inputMode="numeric"
          placeholder="Barcode eingeben"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn-secondary">OK</button>
      </form>
      <button type="button" className="btn w-full muted" onClick={() => setOpen(false)}>
        Schließen
      </button>
    </div>
  );
}
