import { BottomNav } from "@/components/nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <main className="mx-auto max-w-2xl px-gutter pb-32 pt-[max(1rem,env(safe-area-inset-top))]">{children}</main>
      <BottomNav />
    </>
  );
}
