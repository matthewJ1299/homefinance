import { auth } from "@/lib/auth";
import {
  getSharedListRepository,
  getSharedListItemRepository,
} from "@/lib/repositories";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ListVisibility } from "@/lib/repositories/interfaces/shared-list.repository";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import { MyListsOverview } from "@/components/shared-lists/my-lists-overview";

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
  const itemRepo = getSharedListItemRepository();

  const resolved = await searchParams;
  const scope = parseScope(resolved?.scope);
  const lists = await repo.findAll({ visibility: scope });

  if (lists.length === 0) {
    return (
      <div className="p-4 space-y-6 pb-24">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-semibold tracking-tight">My lists</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/lists?scope=shared"
              className={[
                "text-sm font-medium rounded-full px-3 py-1.5 transition-colors cursor-pointer",
                scope === "shared"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              Shared
            </Link>
            <Link
              href="/lists?scope=personal"
              className={[
                "text-sm font-medium rounded-full px-3 py-1.5 transition-colors cursor-pointer",
                scope === "personal"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              Personal
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          No {scope === "shared" ? "shared" : "personal"} lists yet. Add one in{" "}
          <Link href="/settings" className="text-primary underline hover:no-underline cursor-pointer">
            Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  const itemsByListId: Record<number, SharedListItem[]> = {};
  await Promise.all(
    lists.map(async (list) => {
      itemsByListId[list.id] = await itemRepo.findByListId(list.id);
    })
  );

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">My lists</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/lists?scope=shared"
            className={[
              "text-sm font-medium rounded-full px-3 py-1.5 transition-colors cursor-pointer",
              scope === "shared"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            Shared
          </Link>
          <Link
            href="/lists?scope=personal"
            className={[
              "text-sm font-medium rounded-full px-3 py-1.5 transition-colors cursor-pointer",
              scope === "personal"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            Personal
          </Link>
        </div>
      </div>

      <MyListsOverview lists={lists} itemsByListId={itemsByListId} scope={scope} />
    </div>
  );
}
