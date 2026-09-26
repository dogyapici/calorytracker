import { fmt } from "@/lib/nutrition";

const W = 320;
const H = 160;
const PAD = { top: 12, right: 8, bottom: 22, left: 36 };

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const step = 10 ** Math.floor(Math.log10(span / count));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => span / s <= count) ?? step * 10;
  const start = Math.floor(min / nice) * nice;
  const end = Math.ceil(max / nice) * nice;
  const ticks: number[] = [];
  for (let v = start; v <= end + nice * 0.001; v += nice) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

/** Daily calories as bars with the target as a dashed line. */
export function CalorieBars({ days, target }: { days: { label: string; kcal: number }[]; target: number }) {
  const max = Math.max(target * 1.15, ...days.map((d) => d.kcal), 1);
  const ticks = niceTicks(0, max);
  const top = ticks[ticks.length - 1];
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + ih - (v / top) * ih;
  const slot = iw / days.length;
  const bw = Math.max(2, Math.min(24, slot * 0.7));
  const labelEvery = Math.ceil(days.length / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Kalorien pro Tag">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" />
          <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" className="fill-zinc-500 text-[9px]">
            {fmt(t)}
          </text>
        </g>
      ))}
      {days.map((d, i) => {
        const x = PAD.left + slot * i + (slot - bw) / 2;
        const over = d.kcal > target;
        return (
          <g key={i}>
            <rect x={x} y={y(d.kcal)} width={bw} height={Math.max(0, PAD.top + ih - y(d.kcal))} rx={Math.min(3, bw / 3)} className={over ? "fill-red-400" : "fill-brand-500"}>
              <title>{`${d.label}: ${fmt(d.kcal)} kcal`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="fill-zinc-500 text-[9px]">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
      <line x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} strokeDasharray="4 3" className="stroke-zinc-700 dark:stroke-zinc-300" />
    </svg>
  );
}

/** Weight over time as a line with points. */
export function WeightLine({ points }: { points: { label: string; kg: number }[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points.map((p) => p.kg));
  const max = Math.max(...points.map((p) => p.kg));
  const ticks = niceTicks(Math.floor(min - 1), Math.ceil(max + 1));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * iw;
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const labelEvery = Math.ceil(points.length / 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gewichtsverlauf">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" />
          <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" className="fill-zinc-500 text-[9px]">
            {fmt(t, 1)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-brand-600" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.kg)} r={points.length > 40 ? 1.5 : 3} className="fill-brand-600">
            <title>{`${p.label}: ${fmt(p.kg, 1)} kg`}</title>
          </circle>
          {i % labelEvery === 0 && (
            <text x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-zinc-500 text-[9px]">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
