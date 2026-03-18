import { auth } from "@/lib/auth";
import { getSharedListRepository } from "@/lib/repositories";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ListVisibility } from "@/lib/repositories/interfaces/shared-list.repository";

function parseScope(raw: unknown): ListVisibility {
  if (raw === "personal") return "personal";
  return "shared";
}

export default async function ListsPage({
  searchParams,
}: {
  searchParams?: Promise<{ scope?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const repo = getSharedListRepository();

  const resolved = await searchParams;
  const scope = parseScope(resolved?.scope);
  const lists = await repo.findAll({ visibility: scope });
  const defaultList = lists[0];
  if (defaultList) {
    redirect(`/lists/${defaultList.id}`);
  }
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Lists</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/lists?scope=shared"
            className={[
              "text-sm font-medium rounded-md px-2 py-1 hover:bg-accent",
              scope === "shared"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Shared
          </Link>
          <Link
            href="/lists?scope=personal"
            className={[
              "text-sm font-medium rounded-md px-2 py-1 hover:bg-accent",
              scope === "personal"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Personal
          </Link>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        No {scope === "shared" ? "shared" : "personal"} lists yet. Add one in{" "}
        <Link href="/settings" className="text-primary underline hover:no-underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
