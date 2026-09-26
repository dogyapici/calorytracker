import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <>
      <LoginForm />
      <p className="mt-6 text-center text-sm muted">
        Noch kein Konto?{" "}
        <Link href="/register" className="font-semibold text-primary">
          Mit Einladungscode registrieren
        </Link>
      </p>
    </>
  );
}
