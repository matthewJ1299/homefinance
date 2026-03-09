import { auth } from "@/lib/auth";
import { getSharedListRepository } from "@/lib/repositories";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const repo = getSharedListRepository();
  const lists = await repo.findAll();
  const defaultList = lists[0];
  if (defaultList) {
    redirect(`/lists/${defaultList.id}`);
  }
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Shared lists</h1>
      <p className="text-sm text-muted-foreground">
        No lists yet. Add one in{" "}
        <Link href="/settings" className="text-primary underline hover:no-underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
