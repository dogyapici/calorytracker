import { addDays, formatDay } from "./dates";

/** Monday of the week that contains the given day (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

/** ISO 8601 calendar week number of the week starting on the given Monday. */
export function isoWeek(monday: string): number {
  const thursday = new Date(`${addDays(monday, 3)}T12:00:00Z`);
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1, 12);
  return Math.floor((thursday.getTime() - jan1) / (7 * 86_400_000)) + 1;
}

/** "KW 40 · 28.9.–4.10." */
export function weekLabel(monday: string): string {
  const short = { day: "numeric", month: "numeric" } as const;
  return `KW ${isoWeek(monday)} · ${formatDay(monday, short)}–${formatDay(addDays(monday, 6), short)}`;
}

/** The Mondays of the current week and the `count - 1` weeks before it, newest first. */
export function recentWeeks(today: string, count = 26): string[] {
  const current = weekStart(today);
  return Array.from({ length: count }, (_, i) => addDays(current, -7 * i));
}

/** Weeks between two Mondays, so the first logged week is "Woche 1". */
export function weekNumberSince(first: string, monday: string): number {
  return Math.round((Date.parse(`${monday}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / (7 * 86_400_000)) + 1;
}

export type WorkoutLog = { week: string; weightKg: number; reps: number; sets: number | null };

/** Latest week, change against the week before it and the best weight, from logs in any order. */
export function exerciseProgress(logs: WorkoutLog[]) {
  if (!logs.length) return null;
  const sorted = [...logs].sort((a, b) => a.week.localeCompare(b.week));
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const first = sorted[0];
  return {
    first,
    latest,
    previous,
    change: previous ? latest.weightKg - previous.weightKg : null,
    total: sorted.length > 1 ? latest.weightKg - first.weightKg : null,
    best: Math.max(...sorted.map((l) => l.weightKg)),
    weeks: sorted.length,
  };
}

/** Parses "62,5" or "62.5"; NaN for anything that isn't a number. */
export function parseDecimal(text: unknown): number {
  if (typeof text !== "string" || text.trim() === "") return NaN;
  return Number(text.trim().replace(",", "."));
}

// Übungsbibliothek: Vorschläge beim Anlegen, eigene Namen gehen immer auch.
export const MUSCLE_GROUPS = [
  {
    key: "chest",
    label: "Brust",
    match: ["brust", "chest", "push"],
    exercises: [
      "Bankdrücken (Langhantel)",
      "Bankdrücken (Kurzhantel)",
      "Schrägbankdrücken (Langhantel)",
      "Schrägbankdrücken (Kurzhantel)",
      "Negativ-Bankdrücken",
      "Brustpresse (Maschine)",
      "Butterfly (Maschine)",
      "Kurzhantel-Fliegende",
      "Kabelzug-Crossover",
      "Dips (Brust)",
      "Liegestütze",
      "Pullover (Kurzhantel)",
    ],
  },
  {
    key: "back",
    label: "Rücken",
    match: ["rücken", "ruecken", "back", "pull"],
    exercises: [
      "Klimmzüge",
      "Latzug (breit)",
      "Latzug (eng)",
      "Langhantelrudern",
      "Kurzhantelrudern (einarmig)",
      "Kabelrudern (sitzend)",
      "T-Bar-Rudern",
      "Rudermaschine",
      "Kreuzheben",
      "Rack Pulls",
      "Hyperextensions",
      "Überzüge am Kabel",
      "Face Pulls",
      "Shrugs",
    ],
  },
  {
    key: "shoulders",
    label: "Schultern",
    match: ["schulter", "shoulder", "push"],
    exercises: [
      "Schulterdrücken (Langhantel)",
      "Schulterdrücken (Kurzhantel)",
      "Arnold Press",
      "Schulterpresse (Maschine)",
      "Seitheben (Kurzhantel)",
      "Seitheben am Kabel",
      "Frontheben",
      "Reverse Butterfly",
      "Vorgebeugtes Seitheben",
      "Aufrechtes Rudern",
    ],
  },
  {
    key: "biceps",
    label: "Bizeps",
    match: ["arm", "bizeps", "biceps", "pull"],
    exercises: [
      "Langhantel-Curls",
      "SZ-Curls",
      "Kurzhantel-Curls",
      "Hammer Curls",
      "Konzentrationscurls",
      "Scott-Curls",
      "Kabel-Curls",
      "Schrägbank-Curls",
    ],
  },
  {
    key: "triceps",
    label: "Trizeps",
    match: ["arm", "trizeps", "triceps", "push"],
    exercises: [
      "Trizepsdrücken am Kabel",
      "Überkopf-Trizepsdrücken",
      "French Press (SZ)",
      "Enges Bankdrücken",
      "Dips (Trizeps)",
      "Kickbacks",
      "Trizepsmaschine",
    ],
  },
  {
    key: "legs",
    label: "Beine",
    match: ["bein", "leg", "unterkörper", "po", "gesäß"],
    exercises: [
      "Kniebeugen",
      "Frontkniebeugen",
      "Beinpresse",
      "Hackenschmidt",
      "Ausfallschritte",
      "Bulgarian Split Squats",
      "Beinstrecker",
      "Beinbeuger (liegend)",
      "Beinbeuger (sitzend)",
      "Rumänisches Kreuzheben",
      "Hip Thrusts",
      "Abduktoren-Maschine",
      "Adduktoren-Maschine",
      "Wadenheben (stehend)",
      "Wadenheben (sitzend)",
    ],
  },
  {
    key: "abs",
    label: "Bauch",
    match: ["bauch", "abs", "core", "rumpf"],
    exercises: [
      "Crunches",
      "Beinheben (hängend)",
      "Beinheben (liegend)",
      "Kabel-Crunches",
      "Plank",
      "Russian Twists",
      "Ab Roller",
      "Bauchmaschine",
      "Seitstütz",
    ],
  },
  {
    key: "forearms",
    label: "Unterarme",
    match: ["unterarm", "arm", "grip"],
    exercises: ["Handgelenk-Curls", "Reverse Curls", "Farmer's Walk", "Hängen an der Stange"],
  },
] as const;

export const CATEGORY_SUGGESTIONS = [
  "Brusttraining",
  "Rückentraining",
  "Beintraining",
  "Schultern",
  "Arme",
  "Bauch",
  "Push",
  "Pull",
  "Oberkörper",
  "Unterkörper",
];

/** Muscle groups whose exercises fit a category name, best first; all groups when nothing matches. */
export function groupsForCategory(name: string) {
  const n = name.toLowerCase();
  const fitting = MUSCLE_GROUPS.filter((g) => g.match.some((m) => n.includes(m)));
  if (n.includes("oberkörper")) return MUSCLE_GROUPS.filter((g) => g.key !== "legs");
  return fitting.length ? [...fitting, ...MUSCLE_GROUPS.filter((g) => !fitting.includes(g))] : [...MUSCLE_GROUPS];
}
