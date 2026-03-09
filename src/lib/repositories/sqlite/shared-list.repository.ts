import { all, get, run, lastInsertId } from "@/lib/db";
import type { SharedList } from "../interfaces/shared-list.repository";
import type {
  ISharedListRepository,
  CreateSharedListInput,
  UpdateSharedListInput,
} from "../interfaces/shared-list.repository";

const SELECT_FIELDS = `
  SELECT id, name, sort_order AS "sortOrder", created_at AS "createdAt"
  FROM shared_lists
`;

interface SharedListRow {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

function toSharedList(r: SharedListRow): SharedList {
  return {
    id: r.id,
    name: r.name,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  };
}

export class SharedListRepository implements ISharedListRepository {
  async findAll(): Promise<SharedList[]> {
    const rows = await all<SharedListRow>(
      `${SELECT_FIELDS} ORDER BY sort_order ASC, id ASC`
    );
    return rows.map(toSharedList);
  }

  async findById(id: number): Promise<SharedList | null> {
    const row = await get<SharedListRow>(`${SELECT_FIELDS} WHERE id = ?`, [
      id,
    ]);
    return row ? toSharedList(row) : null;
  }

  async create(data: CreateSharedListInput): Promise<{ id: number }> {
    await run(
      `INSERT INTO shared_lists (name, sort_order) VALUES (?, ?)`,
      [data.name, data.sortOrder ?? 0]
    );
    return { id: await lastInsertId() };
  }

  async update(id: number, data: UpdateSharedListInput): Promise<void> {
    const updates: string[] = [];
    const params: (string | number)[] = [];
    if (data.name != null) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(data.sortOrder);
    }
    if (updates.length === 0) return;
    params.push(id);
    await run(
      `UPDATE shared_lists SET ${updates.join(", ")} WHERE id = ?`,
      params
    );
  }

  async delete(id: number): Promise<void> {
    await run("DELETE FROM shared_lists WHERE id = ?", [id]);
  }
}
