"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn-primary w-full",
  pendingText = "Speichern…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error) return <p className="rounded-button bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>;
  if (state?.ok) return <p className="rounded-button bg-primary-soft px-3 py-2 text-sm text-primary">{state.ok}</p>;
  return null;
}
