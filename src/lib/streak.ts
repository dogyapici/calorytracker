import { addDays } from "./dates";

/**
 * Streak of consecutive logged days. A streak stays alive through today even if today has no
 * entry yet, so it only breaks once a whole day passes without logging.
 */
export function computeStreak(loggedDays: string[], today: string) {
  const days = new Set(loggedDays);

  let current = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of [...days].sort()) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }

  return { current, longest, loggedToday: days.has(today) };
}
