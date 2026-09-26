import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <>
      <RegisterForm />
      <p className="mt-6 text-center text-sm muted">
        Schon registriert?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Anmelden
        </Link>
      </p>
    </>
  );
}
