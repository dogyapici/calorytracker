"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };

async function createDetector(): Promise<Detector> {
  const formats = ["ean_13", "ean_8", "upc_a", "upc_e"];
  const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (Native) return new Native({ formats });
  // iOS Safari and Firefox have no native BarcodeDetector; fall back to the ZXing WebAssembly build.
  const { BarcodeDetector } = await import("barcode-detector/ponyfill");
  return new BarcodeDetector({ formats: formats as never[] });
}

/**
 * Scans EAN/UPC barcodes with the camera. By default it navigates to the barcode page;
 * pass `onCode` to handle the code in place instead (e.g. in the recipe editor).
 */
export function BarcodeScanner({
  targetBase = "",
  onCode,
  variant = "button",
}: {
  targetBase?: string;
  onCode?: (code: string) => void;
  /** "tile" draws a large card for the add page; the open scanner then spans the whole grid row. */
  variant?: "button" | "tile";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const go = (code: string) => {
    if (onCode) {
      setOpen(false);
      setManual("");
      onCode(code);
    } else {
      router.push(`/barcode/${encodeURIComponent(code)}${targetBase}`);
    }
  };

  const submitManual = () => {
    if (/^\d{8,14}$/.test(manual.trim())) go(manual.trim());
  };

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

  const start = () => {
    setError(null);
    setOpen(true);
  };

  if (!open && variant === "tile") {
    return (
      <button type="button" className="card flex flex-col items-start gap-3 p-4 text-left transition-transform active:scale-[0.97]" onClick={start}>
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon name="barcode" size={26} />
        </span>
        <span>
          <span className="block text-h3">Barcode scannen</span>
          <span className="block text-caption muted">Mit Kamera oder Nummer</span>
        </span>
      </button>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary w-full" onClick={start}>
        <Icon name="barcode" size={20} />
        Barcode scannen
      </button>
    );
  }

  return (
    <div className={`card space-y-3 ${variant === "tile" ? "order-last col-span-2 animate-enter" : ""}`}>
      <div className="relative overflow-hidden rounded-button bg-inverse-surface">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-danger/80" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {/* Not a <form>: the scanner may sit inside another form (recipe editor). */}
      <div className="flex gap-2">
        <input
          className="input"
          inputMode="numeric"
          placeholder="Barcode eingeben"
          aria-label="Barcode eingeben"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitManual();
            }
          }}
        />
        <button type="button" className="btn-secondary" onClick={submitManual}>
          OK
        </button>
      </div>
      <button type="button" className="btn w-full muted" onClick={() => setOpen(false)}>
        Schließen
      </button>
    </div>
  );
}
