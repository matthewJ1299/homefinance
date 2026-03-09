import { auth } from "@/lib/auth";
import {
  getSharedListRepository,
  getSharedListItemRepository,
} from "@/lib/repositories";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ListDetail } from "@/components/shared-lists/list-detail";
import { ListSwitcher } from "@/components/shared-lists/list-switcher";

interface ListPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: ListPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const id = Number((await params).id);
  if (Number.isNaN(id)) notFound();
  const listRepo = getSharedListRepository();
  const itemRepo = getSharedListItemRepository();
  const [list, lists, items] = await Promise.all([
    listRepo.findById(id),
    listRepo.findAll(),
    itemRepo.findByListId(id),
  ]);
  if (!list) notFound();
  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/lists"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Lists
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-semibold">{list.name}</h1>
        </div>
        <ListSwitcher lists={lists} currentList={list} />
      </div>
      <ListDetail list={list} items={items} />
    </div>
  );
}
