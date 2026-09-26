import { logout } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { fmt, GOALS } from "@/lib/nutrition";
import { getLatestWeight, getProfile, getStreak } from "@/lib/queries";
import { Icon } from "@/components/icons";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ProfileForm } from "./profile-form";
import { TrackingGoalsForm } from "./tracking-goals-form";

import { PendingButton } from "@/components/form-bits";

export const metadata = { title: "Profil & Ziele" };

const GOAL_SHORT = { lose: "Abnehmen", maintain: "Halten", gain: "Zunehmen" } as const;

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const [profile, weight, streak] = await Promise.all([getProfile(user.id), getLatestWeight(user.id), getStreak(user.id)]);
  const goal = GOALS.find((g) => g.key === profile.goal);

  const stats = [
    { label: "Tagesziel", value: fmt(profile.kcalTarget), unit: "kcal" },
    { label: "Gewicht", value: weight ? fmt(weight.kg, 1) : "–", unit: weight ? "kg" : "" },
    { label: "Serie", value: fmt(streak.current), unit: streak.current === 1 ? "Tag" : "Tage" },
  ];

  return (
    <div className="space-y-4">
      <section className="card space-y-5">
        <div className="flex items-center gap-4">
          <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-h1 text-on-primary">
            {user.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-h1">{user.name}</h1>
            <p className="truncate text-label muted">{user.email}</p>
            {goal && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-semibold text-primary">
                <Icon name="target" size={14} /> {GOAL_SHORT[profile.goal]}
              </span>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-button bg-surface-muted px-3 py-2.5 text-center">
              <dt className="text-caption muted">{s.label}</dt>
              <dd className="tabular-nums">
                <span className="text-h3">{s.value}</span>
                {s.unit && <span className="ml-0.5 text-caption muted">{s.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {welcome && (
        <p className="card border-primary text-sm">
          Willkommen, {user.name}! 👋 Trage deine Daten ein und lass dir dein Kalorienziel berechnen.
        </p>
      )}

      <h2 className="px-1 pt-2 text-caption font-semibold uppercase tracking-wide text-text-tertiary">Einstellungen</h2>
      <ProfileForm name={user.name} profile={profile} weightKg={weight?.kg ?? null} open={Boolean(welcome)} />
      <TrackingGoalsForm kcalTarget={profile.kcalTarget} mealSplit={profile.mealSplit} waterTargetMl={profile.waterTargetMl} />
      <ThemeSwitcher />

      <form action={logout}>
        <PendingButton className="btn-secondary w-full gap-2 text-danger">
          <Icon name="logout" size={20} /> Abmelden
        </PendingButton>
      </form>
    </div>
  );
}
