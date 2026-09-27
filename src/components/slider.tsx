"use client";

/** Range slider in the app's style: the track fills up to the thumb in `color`. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  color = "var(--ds-primary)",
  onChange,
  ...props
}: { value: number; min: number; max: number; step?: number; color?: string; onChange: (value: number) => void } & Omit<
  React.ComponentProps<"input">,
  "value" | "min" | "max" | "step" | "onChange" | "type"
>) {
  const fill = Number.isFinite(value) ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <input
      {...props}
      type="range"
      className="range"
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : min}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ "--fill": `${fill}%`, "--accent": color } as React.CSSProperties}
    />
  );
}
