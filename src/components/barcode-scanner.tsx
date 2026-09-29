"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CameraView } from "@/components/camera-view";
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
  autoOpen = false,
}: {
  targetBase?: string;
  onCode?: (code: string) => void;
  /** "tile" draws a large card for the add page. */
  variant?: "button" | "tile";
  /** Opens the camera right away, e.g. when coming from the quick menu. */
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [manual, setManual] = useState("");

  const go = (code: string) => {
    setOpen(false);
    if (onCode) {
      setManual("");
      onCode(code);
    } else {
      router.push(`/barcode/${encodeURIComponent(code)}${targetBase}`);
    }
  };

  const submitManual = () => {
    if (/^\d{8,14}$/.test(manual.trim())) go(manual.trim());
  };

  const detect = (video: HTMLVideoElement) => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
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
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  };

  const trigger =
    variant === "tile" ? (
      <button type="button" className="card flex flex-col items-start gap-3 p-4 text-left transition-transform active:scale-[0.97]" onClick={() => setOpen(true)}>
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon name="barcode" size={26} />
        </span>
        <span>
          <span className="block text-h3">Barcode scannen</span>
          <span className="block text-caption muted">Mit Kamera oder Nummer</span>
        </span>
      </button>
    ) : (
      <button type="button" className="btn-secondary w-full" onClick={() => setOpen(true)}>
        <Icon name="barcode" size={20} />
        Barcode scannen
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <CameraView frame="wide" hint="Barcode in den Rahmen halten" onClose={() => setOpen(false)} onVideo={detect}>
          {/* Not a <form>: the scanner may sit inside another form (recipe editor). */}
          <div className="flex gap-2">
            <input
              className="input h-button bg-white/15 text-body text-white placeholder:text-white/70"
              inputMode="numeric"
              placeholder="Oder Barcode eingeben"
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
            <button type="button" className="btn-primary h-button" onClick={submitManual}>
              OK
            </button>
          </div>
        </CameraView>
      )}
    </>
  );
}
