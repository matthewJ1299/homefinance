import { auth } from "@/lib/auth";
import {
  getSharedListRepository,
  getSharedListItemRepository,
} from "@/lib/repositories";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ListDetail } from "@/components/shared-lists/list-detail";
import { ListSwitcher } from "@/components/shared-lists/list-switcher";
import { notesByItemIdForUser } from "@/lib/shared-lists/load-item-notes";

interface ListPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: ListPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = Number(session.user.id);
  const id = Number((await params).id);
  if (Number.isNaN(id)) notFound();
  const listRepo = getSharedListRepository();
  const itemRepo = getSharedListItemRepository();
  const [list, items] = await Promise.all([
    listRepo.findById(id),
    itemRepo.findByListId(id),
  ]);
  if (!list) notFound();
  const notesByItemId = await notesByItemIdForUser(userId, items);
  const lists = await listRepo.findAll({ visibility: list.visibility });
  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/lists?scope=${list.visibility}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Lists
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-semibold">{list.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/lists?scope=shared"
            className={[
              "text-sm font-medium rounded-md px-2 py-1 hover:bg-accent",
              list.visibility === "shared"
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
              list.visibility === "personal"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Personal
          </Link>
        </div>
        <ListSwitcher lists={lists} currentList={list} />
      </div>
      <ListDetail list={list} items={items} notesByItemId={notesByItemId} />
    </div>
  );
}
