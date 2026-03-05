module.exports = [
"[project]/.next-internal/server/app/page/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
}),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/sql.js [external] (sql.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("sql.js", () => require("sql.js"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[project]/src/lib/db/index.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "all",
    ()=>all,
    "get",
    ()=>get,
    "getDb",
    ()=>getDb,
    "initDb",
    ()=>initDb,
    "lastInsertId",
    ()=>lastInsertId,
    "run",
    ()=>run,
    "saveDb",
    ()=>saveDb,
    "startPersistLoop",
    ()=>startPersistLoop
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$sql$2e$js__$5b$external$5d$__$28$sql$2e$js$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/sql.js [external] (sql.js, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
;
;
;
const dbPath = process.env.DB_PATH ?? __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), "data", "sqlite.db");
let sqlJsDb = null;
const dir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(dbPath);
if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(dir)) {
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdirSync(dir, {
        recursive: true
    });
}
async function initDb() {
    if (sqlJsDb) return;
    const SQL = await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$sql$2e$js__$5b$external$5d$__$28$sql$2e$js$2c$__cjs$29$__["default"])();
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(dbPath)) {
        const buf = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(dbPath);
        sqlJsDb = new SQL.Database(new Uint8Array(buf));
    } else {
        sqlJsDb = new SQL.Database();
    }
    sqlJsDb.run("PRAGMA foreign_keys = ON;");
    sqlJsDb.run("PRAGMA journal_mode = WAL;");
}
function saveDb() {
    if (!sqlJsDb) return;
    const data = sqlJsDb.export();
    const buf = Buffer.from(data);
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(dbPath, buf);
}
function getDb() {
    if (!sqlJsDb) {
        throw new Error("Database not initialized. Call initDb() before using getDb().");
    }
    return sqlJsDb;
}
function run(sql, params = []) {
    getDb().run(sql, params);
}
function lastInsertId() {
    const db = getDb();
    const stmt = db.prepare("SELECT last_insert_rowid() AS id");
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row.id;
}
function get(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const hasRow = stmt.step();
    const row = hasRow ? stmt.getAsObject() : null;
    stmt.free();
    return row;
}
function all(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while(stmt.step()){
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}
function startPersistLoop(intervalMs = 60_000) {
    setInterval(()=>{
        try {
            saveDb();
        } catch (e) {
            console.error("Failed to persist DB:", e);
        }
    }, intervalMs);
}
}),
"[project]/src/lib/repositories/sqlite/category.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CategoryRepository",
    ()=>CategoryRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/index.ts [app-rsc] (ecmascript)");
;
function toCategory(r, includeIsActive = false) {
    const base = {
        id: r.id,
        name: r.name,
        groupName: r.group_name,
        icon: r.icon,
        sortOrder: r.sort_order,
        costType: r.cost_type,
        defaultAmount: r.default_amount
    };
    if (includeIsActive && r.is_active !== undefined) {
        return {
            ...base,
            isActive: r.is_active === 1
        };
    }
    return base;
}
class CategoryRepository {
    async findAll() {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT id, name, group_name, icon, sort_order, cost_type, default_amount FROM categories WHERE is_active = 1 ORDER BY cost_type DESC, sort_order, name");
        return rows.map((r)=>toCategory(r));
    }
    async findAllIncludingInactive() {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT id, name, group_name, icon, sort_order, is_active, cost_type, default_amount FROM categories ORDER BY is_active DESC, cost_type DESC, sort_order, name");
        return rows.map((r)=>toCategory(r, true));
    }
    async findById(id) {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id, name, group_name, icon, sort_order, cost_type, default_amount FROM categories WHERE id = ?", [
            id
        ]);
        return row ? toCategory(row) : null;
    }
    async findByName(name) {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id, name, group_name, icon, sort_order, cost_type, default_amount FROM categories WHERE name = ?", [
            name
        ]);
        return row ? toCategory(row) : null;
    }
    async create(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("INSERT INTO categories (name, group_name, icon, sort_order, cost_type, default_amount) VALUES (?, ?, ?, ?, ?, ?)", [
            data.name,
            data.groupName,
            data.icon ?? null,
            data.sortOrder ?? 0,
            data.costType ?? "variable",
            data.defaultAmount ?? null
        ]);
        const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lastInsertId"])();
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id, name, group_name, icon, sort_order, cost_type, default_amount FROM categories WHERE id = ?", [
            id
        ]);
        return toCategory(row);
    }
    async update(id, data) {
        const updates = [];
        const params = [];
        if (data.name !== undefined) {
            updates.push("name = ?");
            params.push(data.name);
        }
        if (data.groupName !== undefined) {
            updates.push("group_name = ?");
            params.push(data.groupName);
        }
        if (data.isActive !== undefined) {
            updates.push("is_active = ?");
            params.push(data.isActive ? 1 : 0);
        }
        if (data.sortOrder !== undefined) {
            updates.push("sort_order = ?");
            params.push(data.sortOrder);
        }
        if (data.costType !== undefined) {
            updates.push("cost_type = ?");
            params.push(data.costType);
        }
        if (data.defaultAmount !== undefined) {
            updates.push("default_amount = ?");
            params.push(data.defaultAmount);
        }
        if (updates.length === 0) return;
        params.push(id);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`, params);
    }
    async delete(id) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("DELETE FROM categories WHERE id = ?", [
            id
        ]);
    }
    async isInUse(id) {
        const expense = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id FROM expenses WHERE category_id = ? LIMIT 1", [
            id
        ]);
        if (expense) return true;
        const budget = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id FROM budgets WHERE category_id = ? LIMIT 1", [
            id
        ]);
        if (budget) return true;
        const transfer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id FROM budget_transfers WHERE from_category_id = ? OR to_category_id = ? LIMIT 1", [
            id,
            id
        ]);
        return !!transfer;
    }
}
}),
"[project]/src/lib/repositories/sqlite/expense.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExpenseRepository",
    ()=>ExpenseRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/index.ts [app-rsc] (ecmascript)");
;
const SELECT_EXPENSE_DETAILS = `
  SELECT e.id, e.user_id AS userId, u.name AS userName, e.category_id AS categoryId, c.name AS categoryName,
         e.amount, e.note, e.date, e.created_at AS createdAt, e.split_group_id AS splitGroupId, e.paid_by_user_id AS paidByUserId
  FROM expenses e
  INNER JOIN users u ON e.user_id = u.id
  INNER JOIN categories c ON e.category_id = c.id
`;
function toExpenseWithDetails(r) {
    return {
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        amount: r.amount,
        note: r.note,
        date: r.date,
        createdAt: r.createdAt,
        splitGroupId: r.splitGroupId,
        paidByUserId: r.paidByUserId
    };
}
class ExpenseRepository {
    async findByMonth(month, userId) {
        const sql = userId != null ? `${SELECT_EXPENSE_DETAILS} WHERE e.month = ? AND e.user_id = ? ORDER BY e.date, e.created_at` : `${SELECT_EXPENSE_DETAILS} WHERE e.month = ? ORDER BY e.date, e.created_at`;
        const params = userId != null ? [
            month,
            userId
        ] : [
            month
        ];
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])(sql, params);
        return rows.map(toExpenseWithDetails);
    }
    async findByMonthPaginated(month, limit, offset, userId) {
        const base = userId != null ? `${SELECT_EXPENSE_DETAILS} WHERE e.month = ? AND e.user_id = ?` : `${SELECT_EXPENSE_DETAILS} WHERE e.month = ?`;
        const params = userId != null ? [
            month,
            userId,
            limit,
            offset
        ] : [
            month,
            limit,
            offset
        ];
        const sql = `${base} ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?`;
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])(sql, params);
        return rows.map(toExpenseWithDetails);
    }
    async countByMonth(month, userId) {
        const sql = userId != null ? "SELECT COUNT(id) AS c FROM expenses WHERE month = ? AND user_id = ?" : "SELECT COUNT(id) AS c FROM expenses WHERE month = ?";
        const params = userId != null ? [
            month,
            userId
        ] : [
            month
        ];
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])(sql, params);
        return row?.c ?? 0;
    }
    async getSpendingByCategoryForMonths(months, userId) {
        if (months.length === 0) return {};
        const placeholders = months.map(()=>"?").join(",");
        const sql = userId != null ? `SELECT category_id, SUM(amount) AS total FROM expenses WHERE user_id = ? AND month IN (${placeholders}) GROUP BY category_id` : `SELECT category_id, SUM(amount) AS total FROM expenses WHERE month IN (${placeholders}) GROUP BY category_id`;
        const params = userId != null ? [
            userId,
            ...months
        ] : months;
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])(sql, params);
        const result = {};
        for (const r of rows){
            result[r.category_id] = r.total;
        }
        return result;
    }
    async findById(id) {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])(`${SELECT_EXPENSE_DETAILS} WHERE e.id = ?`, [
            id
        ]);
        return row ? toExpenseWithDetails(row) : null;
    }
    async create(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("INSERT INTO expenses (user_id, category_id, amount, note, date, month, split_group_id, paid_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
            data.userId,
            data.categoryId,
            data.amount,
            data.note ?? null,
            data.date,
            data.month,
            data.splitGroupId ?? null,
            data.paidByUserId ?? null
        ]);
        return {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lastInsertId"])()
        };
    }
    async update(id, data) {
        const updates = [];
        const params = [];
        if (data.categoryId != null) {
            updates.push("category_id = ?");
            params.push(data.categoryId);
        }
        if (data.amount != null) {
            updates.push("amount = ?");
            params.push(data.amount);
        }
        if (data.note !== undefined) {
            updates.push("note = ?");
            params.push(data.note);
        }
        if (data.date != null) {
            updates.push("date = ?");
            params.push(data.date);
        }
        if (data.month != null) {
            updates.push("month = ?");
            params.push(data.month);
        }
        if (updates.length === 0) return;
        params.push(id);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`UPDATE expenses SET ${updates.join(", ")} WHERE id = ?`, params);
    }
    async delete(id) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("DELETE FROM expenses WHERE id = ?", [
            id
        ]);
    }
    async deleteBySplitGroupId(splitGroupId) {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id FROM expenses WHERE split_group_id = ? LIMIT 1", [
            splitGroupId
        ]);
        if (!row) return;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("DELETE FROM split_allocations WHERE expense_id = ?", [
            row.id
        ]);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("DELETE FROM expenses WHERE id = ?", [
            row.id
        ]);
    }
    async findSplitExpenses() {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])(`${SELECT_EXPENSE_DETAILS} WHERE e.split_group_id IS NOT NULL ORDER BY e.date DESC, e.created_at DESC`);
        return rows.map(toExpenseWithDetails);
    }
}
}),
"[project]/src/lib/repositories/sqlite/income.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IncomeRepository",
    ()=>IncomeRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/index.ts [app-rsc] (ecmascript)");
;
const SELECT_INCOME_ENTRY = `
  SELECT i.id, i.user_id AS userId, u.name AS userName, i.amount, i.type, i.description, i.date
  FROM income i
  INNER JOIN users u ON i.user_id = u.id
`;
function toIncomeEntry(r) {
    return {
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        amount: r.amount,
        type: r.type,
        description: r.description,
        date: r.date
    };
}
class IncomeRepository {
    async findByMonth(month, userId) {
        const sql = userId != null ? `${SELECT_INCOME_ENTRY} WHERE i.month = ? AND i.user_id = ? ORDER BY i.date` : `${SELECT_INCOME_ENTRY} WHERE i.month = ? ORDER BY i.date`;
        const params = userId != null ? [
            month,
            userId
        ] : [
            month
        ];
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])(sql, params);
        return rows.map(toIncomeEntry);
    }
    async findById(id) {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])(`${SELECT_INCOME_ENTRY} WHERE i.id = ?`, [
            id
        ]);
        return row ? toIncomeEntry(row) : null;
    }
    async create(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("INSERT INTO income (user_id, amount, type, description, date, month) VALUES (?, ?, ?, ?, ?, ?)", [
            data.userId,
            data.amount,
            data.type,
            data.description ?? null,
            data.date,
            data.month
        ]);
        return {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lastInsertId"])()
        };
    }
    async update(id, data) {
        const updates = [];
        const params = [];
        if (data.amount != null) {
            updates.push("amount = ?");
            params.push(data.amount);
        }
        if (data.type != null) {
            updates.push("type = ?");
            params.push(data.type);
        }
        if (data.description !== undefined) {
            updates.push("description = ?");
            params.push(data.description);
        }
        if (data.date != null) {
            updates.push("date = ?");
            params.push(data.date);
        }
        if (data.month != null) {
            updates.push("month = ?");
            params.push(data.month);
        }
        if (updates.length === 0) return;
        params.push(id);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`UPDATE income SET ${updates.join(", ")} WHERE id = ?`, params);
    }
    async delete(id) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("DELETE FROM income WHERE id = ?", [
            id
        ]);
    }
}
}),
"[project]/src/lib/repositories/sqlite/user.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UserRepository",
    ()=>UserRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/index.ts [app-rsc] (ecmascript)");
;
function toSummary(r) {
    return {
        id: r.id,
        name: r.name
    };
}
function toUserForAuth(r) {
    return {
        id: r.id,
        email: r.email,
        name: r.name,
        passwordHash: r.password_hash
    };
}
class UserRepository {
    async findAll() {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT id, name FROM users ORDER BY id");
        return rows.map(toSummary);
    }
    async findAllExcept(userId) {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT id, name FROM users WHERE id != ? ORDER BY id", [
            userId
        ]);
        return rows.map(toSummary);
    }
    async findById(id) {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id, name FROM users WHERE id = ?", [
            id
        ]);
        return row ? toSummary(row) : null;
    }
    async findByEmailForAuth(email) {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id, name, email, password_hash FROM users WHERE email = ?", [
            email
        ]);
        return row ? toUserForAuth(row) : null;
    }
}
}),
"[project]/src/lib/repositories/sqlite/split-allocation.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SplitAllocationRepository",
    ()=>SplitAllocationRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/index.ts [app-rsc] (ecmascript)");
;
class SplitAllocationRepository {
    async create(expenseId, userId, amount) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("INSERT INTO split_allocations (expense_id, user_id, amount) VALUES (?, ?, ?)", [
            expenseId,
            userId,
            amount
        ]);
        return {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lastInsertId"])()
        };
    }
    async findByExpenseId(expenseId) {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT sa.id, sa.expense_id AS expense_id, sa.user_id AS user_id, sa.amount, u.name FROM split_allocations sa INNER JOIN users u ON sa.user_id = u.id WHERE sa.expense_id = ?", [
            expenseId
        ]);
        return rows.map((r)=>({
                id: r.id,
                expenseId: r.expense_id,
                userId: r.user_id,
                amount: r.amount,
                userName: r.name
            }));
    }
    async findAllForBalance() {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT sa.amount, e.paid_by_user_id, sa.user_id AS allocation_user_id FROM split_allocations sa INNER JOIN expenses e ON sa.expense_id = e.id WHERE e.paid_by_user_id IS NOT NULL");
        const result = [];
        for (const r of rows){
            const payer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT name FROM users WHERE id = ?", [
                r.paid_by_user_id
            ]);
            const allocUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT name FROM users WHERE id = ?", [
                r.allocation_user_id
            ]);
            result.push({
                amount: r.amount,
                paidByUserId: r.paid_by_user_id,
                paidByUserName: payer?.name ?? "?",
                allocationUserId: r.allocation_user_id,
                allocationUserName: allocUser?.name ?? "?"
            });
        }
        return result;
    }
    async deleteByExpenseId(expenseId) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("DELETE FROM split_allocations WHERE expense_id = ?", [
            expenseId
        ]);
    }
}
}),
"[project]/src/lib/repositories/sqlite/split-settlement.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SplitSettlementRepository",
    ()=>SplitSettlementRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/index.ts [app-rsc] (ecmascript)");
;
class SplitSettlementRepository {
    async create(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("INSERT INTO split_settlements (payer_user_id, recipient_user_id, amount, date, expense_id, income_id) VALUES (?, ?, ?, ?, ?, ?)", [
            data.payerUserId,
            data.recipientUserId,
            data.amount,
            data.date,
            data.expenseId ?? null,
            data.incomeId ?? null
        ]);
        return {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lastInsertId"])()
        };
    }
    async findAllForUser(userId) {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])(`SELECT ss.id, ss.payer_user_id, ss.recipient_user_id, ss.amount, ss.date, ss.expense_id, ss.income_id,
              p.name AS payer_name, r.name AS recipient_name
       FROM split_settlements ss
       INNER JOIN users p ON ss.payer_user_id = p.id
       INNER JOIN users r ON ss.recipient_user_id = r.id
       WHERE ss.payer_user_id = ? OR ss.recipient_user_id = ?`, [
            userId,
            userId
        ]);
        return rows.map((r)=>({
                id: r.id,
                payerUserId: r.payer_user_id,
                recipientUserId: r.recipient_user_id,
                amount: r.amount,
                date: r.date,
                expenseId: r.expense_id,
                incomeId: r.income_id,
                payerUserName: r.payer_name,
                recipientUserName: r.recipient_name
            }));
    }
    async findByExpenseId(expenseId) {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id, payer_user_id, recipient_user_id, amount, date, expense_id, income_id FROM split_settlements WHERE expense_id = ? LIMIT 1", [
            expenseId
        ]);
        if (!row) return null;
        return {
            id: row.id,
            payerUserId: row.payer_user_id,
            recipientUserId: row.recipient_user_id,
            amount: row.amount,
            date: row.date,
            expenseId: row.expense_id,
            incomeId: row.income_id
        };
    }
    async delete(id) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("DELETE FROM split_settlements WHERE id = ?", [
            id
        ]);
    }
}
}),
"[project]/src/lib/repositories/sqlite/budget.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BudgetRepository",
    ()=>BudgetRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/index.ts [app-rsc] (ecmascript)");
;
class BudgetRepository {
    async getAllocationsForMonth(month, userId) {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT category_id, allocated_amount FROM budgets WHERE month = ? AND user_id = ?", [
            month,
            userId
        ]);
        return rows.map((r)=>({
                categoryId: r.category_id,
                allocatedAmount: r.allocated_amount
            }));
    }
    async getAllocationsForMonths(months, userId) {
        if (months.length === 0) return [];
        const placeholders = months.map(()=>"?").join(",");
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])(`SELECT category_id, allocated_amount, month FROM budgets WHERE user_id = ? AND month IN (${placeholders})`, [
            userId,
            ...months
        ]);
        return rows.map((r)=>({
                categoryId: r.category_id,
                allocatedAmount: r.allocated_amount,
                month: r.month
            }));
    }
    async upsertAllocation(categoryId, month, amount, userId) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`INSERT INTO budgets (user_id, category_id, month, allocated_amount) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, category_id, month) DO UPDATE SET allocated_amount = excluded.allocated_amount, updated_at = datetime('now')`, [
            userId,
            categoryId,
            month,
            amount
        ]);
    }
    async getTransfersForMonth(month, userId) {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT id, from_category_id, to_category_id, month, amount, user_id, reason, created_at FROM budget_transfers WHERE month = ? AND user_id = ? ORDER BY created_at", [
            month,
            userId
        ]);
        return rows.map((r)=>({
                id: r.id,
                fromCategoryId: r.from_category_id,
                toCategoryId: r.to_category_id,
                month: r.month,
                amount: r.amount,
                userId: r.user_id,
                reason: r.reason,
                createdAt: r.created_at
            }));
    }
    async createTransfer(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("INSERT INTO budget_transfers (from_category_id, to_category_id, month, amount, user_id, reason) VALUES (?, ?, ?, ?, ?, ?)", [
            data.fromCategoryId,
            data.toCategoryId,
            data.month,
            data.amount,
            data.userId,
            data.reason ?? null
        ]);
    }
}
}),
"[project]/src/lib/repositories/sqlite/mortgage.repository.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MortgageRepository",
    ()=>MortgageRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db/index.ts [app-rsc] (ecmascript)");
;
function toConfigRow(r) {
    return {
        id: r.id,
        propertyValue: r.property_value,
        loanAmount: r.loan_amount,
        annualInterestRate: r.annual_interest_rate,
        loanTermMonths: r.loan_term_months,
        startDate: r.start_date,
        targetEquityUserAPct: r.target_equity_user_a_pct ?? 0.5
    };
}
class MortgageRepository {
    async getActiveConfig() {
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id, property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct FROM mortgage_configs WHERE is_active = 1 LIMIT 1");
        return row ? toConfigRow(row) : null;
    }
    async getUserConfigs(mortgageId) {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])(`SELECT muc.user_id, u.name, muc.initial_deposit, muc.base_split_pct, muc.monthly_cap
       FROM mortgage_user_configs muc INNER JOIN users u ON muc.user_id = u.id WHERE muc.mortgage_id = ?`, [
            mortgageId
        ]);
        return rows.map((r)=>({
                userId: r.user_id,
                userName: r.name,
                initialDeposit: r.initial_deposit,
                baseSplitPct: r.base_split_pct,
                monthlyCap: r.monthly_cap
            }));
    }
    async upsertConfig(data) {
        const existing = await this.getActiveConfig();
        if (existing) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`UPDATE mortgage_configs SET property_value = ?, loan_amount = ?, annual_interest_rate = ?, loan_term_months = ?, start_date = ?, target_equity_user_a_pct = ? WHERE id = ?`, [
                data.propertyValue,
                data.loanAmount,
                data.annualInterestRate,
                data.loanTermMonths,
                data.startDate,
                data.targetEquityUserAPct ?? 0.5,
                existing.id
            ]);
            return {
                ...existing,
                ...data
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`INSERT INTO mortgage_configs (property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct) VALUES (?, ?, ?, ?, ?, ?)`, [
            data.propertyValue,
            data.loanAmount,
            data.annualInterestRate,
            data.loanTermMonths,
            data.startDate,
            data.targetEquityUserAPct ?? 0.5
        ]);
        const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lastInsertId"])();
        const row = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["get"])("SELECT id, property_value, loan_amount, annual_interest_rate, loan_term_months, start_date, target_equity_user_a_pct FROM mortgage_configs WHERE id = ?", [
            id
        ]);
        return toConfigRow(row);
    }
    async upsertUserConfig(mortgageId, userId, data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`INSERT INTO mortgage_user_configs (mortgage_id, user_id, initial_deposit, base_split_pct, monthly_cap) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (mortgage_id, user_id) DO UPDATE SET initial_deposit = excluded.initial_deposit, base_split_pct = excluded.base_split_pct, monthly_cap = excluded.monthly_cap`, [
            mortgageId,
            userId,
            data.initialDeposit,
            data.baseSplitPct,
            data.monthlyCap ?? null
        ]);
    }
    async getPayments(mortgageId) {
        const rows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["all"])("SELECT id, mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note, created_at FROM mortgage_payments WHERE mortgage_id = ? ORDER BY month_number", [
            mortgageId
        ]);
        return rows.map((r)=>({
                id: r.id,
                mortgageId: r.mortgage_id,
                userId: r.user_id,
                paymentDate: r.payment_date,
                monthNumber: r.month_number,
                amount: r.amount,
                principalPortion: r.principal_portion,
                interestPortion: r.interest_portion,
                isExtraPayment: r.is_extra_payment === 1,
                note: r.note,
                createdAt: r.created_at
            }));
    }
    async insertPayment(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`INSERT INTO mortgage_payments (mortgage_id, user_id, payment_date, month_number, amount, principal_portion, interest_portion, is_extra_payment, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            data.mortgageId,
            data.userId,
            data.paymentDate,
            data.monthNumber,
            data.amount,
            data.principalPortion,
            data.interestPortion,
            data.isExtraPayment ? 1 : 0,
            data.note ?? null
        ]);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lastInsertId"])();
    }
    async updatePaymentPrincipalInterest(paymentId, principalPortion, interestPortion) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])("UPDATE mortgage_payments SET principal_portion = ?, interest_portion = ? WHERE id = ?", [
            principalPortion,
            interestPortion,
            paymentId
        ]);
    }
    async saveSnapshot(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["run"])(`INSERT INTO mortgage_schedule_snapshots (mortgage_id, trigger_event, trigger_payment_id, schedule_json, projected_payoff_date, projected_months, monthly_topup, user_a_final_equity_pct, user_b_final_equity_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            data.mortgageId,
            data.triggerEvent,
            data.triggerPaymentId ?? null,
            data.scheduleJson,
            data.projectedPayoffDate,
            data.projectedMonths,
            data.monthlyTopup,
            data.userAFinalEquityPct,
            data.userBFinalEquityPct
        ]);
    }
}
}),
"[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getBudgetRepository",
    ()=>getBudgetRepository,
    "getCategoryRepository",
    ()=>getCategoryRepository,
    "getExpenseRepository",
    ()=>getExpenseRepository,
    "getIncomeRepository",
    ()=>getIncomeRepository,
    "getMortgageRepository",
    ()=>getMortgageRepository,
    "getSplitAllocationRepository",
    ()=>getSplitAllocationRepository,
    "getSplitSettlementRepository",
    ()=>getSplitSettlementRepository,
    "getUserRepository",
    ()=>getUserRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$category$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/sqlite/category.repository.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$expense$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/sqlite/expense.repository.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$income$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/sqlite/income.repository.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$user$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/sqlite/user.repository.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$split$2d$allocation$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/sqlite/split-allocation.repository.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$split$2d$settlement$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/sqlite/split-settlement.repository.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$budget$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/sqlite/budget.repository.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$mortgage$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/sqlite/mortgage.repository.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
let categoryRepo = null;
let expenseRepo = null;
let incomeRepo = null;
let userRepo = null;
let splitAllocationRepo = null;
let splitSettlementRepo = null;
let budgetRepo = null;
let mortgageRepo = null;
function getCategoryRepository() {
    if (!categoryRepo) categoryRepo = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$category$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CategoryRepository"]();
    return categoryRepo;
}
function getExpenseRepository() {
    if (!expenseRepo) expenseRepo = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$expense$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseRepository"]();
    return expenseRepo;
}
function getIncomeRepository() {
    if (!incomeRepo) incomeRepo = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$income$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IncomeRepository"]();
    return incomeRepo;
}
function getUserRepository() {
    if (!userRepo) userRepo = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$user$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["UserRepository"]();
    return userRepo;
}
function getSplitAllocationRepository() {
    if (!splitAllocationRepo) splitAllocationRepo = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$split$2d$allocation$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SplitAllocationRepository"]();
    return splitAllocationRepo;
}
function getSplitSettlementRepository() {
    if (!splitSettlementRepo) splitSettlementRepo = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$split$2d$settlement$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SplitSettlementRepository"]();
    return splitSettlementRepo;
}
function getBudgetRepository() {
    if (!budgetRepo) budgetRepo = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$budget$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BudgetRepository"]();
    return budgetRepo;
}
function getMortgageRepository() {
    if (!mortgageRepo) mortgageRepo = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$sqlite$2f$mortgage$2e$repository$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageRepository"]();
    return mortgageRepo;
}
}),
"[project]/src/lib/auth.config.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authConfig",
    ()=>authConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/credentials.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
;
;
;
const authConfig = {
    pages: {
        signIn: "/login"
    },
    callbacks: {
        authorized ({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnApp = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/expenses") || nextUrl.pathname.startsWith("/income") || nextUrl.pathname.startsWith("/budget") || nextUrl.pathname.startsWith("/mortgage") || nextUrl.pathname.startsWith("/summary") || nextUrl.pathname.startsWith("/categories");
            if (isOnApp && !isLoggedIn) {
                return false;
            }
            if (auth?.user && nextUrl.pathname === "/login") {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }
            return true;
        },
        jwt ({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        session ({ session, token }) {
            if (session.user) {
                session.user.id = String(token.id);
                session.user.email = token.email;
                session.user.name = token.name;
            }
            return session;
        }
    },
    providers: [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])({
            name: "credentials",
            credentials: {
                email: {
                    label: "Email",
                    type: "email"
                },
                password: {
                    label: "Password",
                    type: "password"
                }
            },
            async authorize (credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const { initDb } = await __turbopack_context__.A("[project]/src/lib/db/index.ts [app-rsc] (ecmascript, async loader)");
                await initDb();
                const userRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUserRepository"])();
                const user = await userRepo.findByEmailForAuth(credentials.email);
                if (!user) return null;
                const match = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].compare(credentials.password, user.passwordHash);
                if (!match) return null;
                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.name
                };
            }
        })
    ]
};
}),
"[project]/src/lib/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "handlers",
    ()=>handlers,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.config.ts [app-rsc] (ecmascript)");
;
;
const { handlers, auth, signIn, signOut } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])({
    ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["authConfig"],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60
    },
    trustHost: true
});
}),
"[project]/src/app/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
;
;
async function HomePage() {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (session?.user) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/dashboard");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login");
}
}),
"[project]/src/app/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/page.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__cb324e93._.js.map