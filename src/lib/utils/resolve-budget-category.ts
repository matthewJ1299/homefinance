import { getCategoryRepository } from "@/lib/repositories";

export interface CategoryNameCandidate {
  categoryId: number;
  categoryName: string;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Resolve an AI-suggested category name to a category id.
 * Tries exact DB name, then case-insensitive match against known candidates.
 */
export async function resolveBudgetCategoryId(
  categoryName: string,
  candidates: CategoryNameCandidate[]
): Promise<{ categoryId: number; categoryName: string } | null> {
  const trimmed = categoryName.trim();
  if (!trimmed) return null;

  const fromDb = await getCategoryRepository().findByName(trimmed);
  if (fromDb) {
    return { categoryId: fromDb.id, categoryName: fromDb.name };
  }

  const normalized = normalizeName(trimmed);
  const match = candidates.find((c) => normalizeName(c.categoryName) === normalized);
  if (match) {
    return { categoryId: match.categoryId, categoryName: match.categoryName };
  }

  return null;
}
