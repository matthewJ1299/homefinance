import { auth } from "@/lib/auth";
import { getCategoryRepository } from "@/lib/repositories";
import { CategoriesManage } from "@/components/categories/categories-manage";

export default async function CategoriesPage() {
  await auth();
  const repo = getCategoryRepository();
  const categories = await repo.findAllIncludingInactive();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Manage categories</h1>
      <CategoriesManage categories={categories} />
    </div>
  );
}
