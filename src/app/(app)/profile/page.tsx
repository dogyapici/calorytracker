import { logout } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getLatestWeight, getProfile } from "@/lib/queries";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ProfileForm } from "./profile-form";
import { TrackingGoalsForm } from "./tracking-goals-form";

import { PendingButton } from "@/components/form-bits";

export const metadata = { title: "Profil & Ziele" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const [profile, weight] = await Promise.all([getProfile(user.id), getLatestWeight(user.id)]);

  return (
    <div className="space-y-4">
      <h1 className="text-h1">Profil & Ziele</h1>
      {welcome && (
        <p className="card border-primary text-sm">
          Willkommen, {user.name}! 👋 Trage deine Daten ein und lass dir dein Kalorienziel berechnen.
        </p>
      )}
      <ProfileForm name={user.name} profile={profile} weightKg={weight?.kg ?? null} />
      <TrackingGoalsForm kcalTarget={profile.kcalTarget} mealSplit={profile.mealSplit} waterTargetMl={profile.waterTargetMl} />
      <ThemeSwitcher />
      <div className="card flex items-center justify-between">
        <p className="text-sm muted">Angemeldet als {user.email}</p>
        <form action={logout}>
          <PendingButton className="btn-secondary">Abmelden</PendingButton>
        </form>
      </div>
    </div>
  );
}
