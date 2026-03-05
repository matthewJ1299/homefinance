import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { initDb } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await initDb();
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <AppShell>{children}</AppShell>;
}
