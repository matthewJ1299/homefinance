module.exports = [
"[project]/src/lib/utils/date.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatMonth",
    ()=>formatMonth,
    "getCurrentMonth",
    ()=>getCurrentMonth,
    "isValidMonth",
    ()=>isValidMonth,
    "monthFromDate",
    ()=>monthFromDate,
    "nextMonth",
    ()=>nextMonth,
    "prevMonth",
    ()=>prevMonth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/subMonths.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addMonths.js [app-rsc] (ecmascript)");
;
function getCurrentMonth() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(), "yyyy-MM");
}
function formatMonth(month) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, "MMMM yyyy");
}
function prevMonth(month) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["subMonths"])(d, 1), "yyyy-MM");
}
function nextMonth(month) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(d, 1), "yyyy-MM");
}
function monthFromDate(date) {
    return date.slice(0, 7);
}
function isValidMonth(month) {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) return false;
    const [, y, m] = match.map(Number);
    return m >= 1 && m <= 12 && y >= 2000 && y <= 2100;
}
}),
"[project]/src/lib/services/income.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IncomeService",
    ()=>IncomeService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/date.ts [app-rsc] (ecmascript)");
;
;
class IncomeService {
    repo;
    constructor(repo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getIncomeRepository"])()){
        this.repo = repo;
    }
    async getByMonth(month, userId) {
        const entries = await this.repo.findByMonth(month, userId);
        const totals = {
            overall: 0,
            byUser: {},
            salary: 0,
            adHoc: 0
        };
        for (const e of entries){
            totals.overall += e.amount;
            totals.byUser[e.userId] = (totals.byUser[e.userId] ?? 0) + e.amount;
            if (e.type === "salary") totals.salary += e.amount;
            else totals.adHoc += e.amount;
        }
        return {
            entries,
            totals
        };
    }
    async create(userId, data) {
        const month = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["monthFromDate"])(data.date);
        return this.repo.create({
            userId,
            amount: data.amount,
            type: data.type,
            description: data.description,
            date: data.date,
            month
        });
    }
    async update(id, data) {
        const payload = {
            ...data
        };
        if (data.date) payload.month = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["monthFromDate"])(data.date);
        await this.repo.update(id, payload);
    }
    async delete(id) {
        await this.repo.delete(id);
    }
}
}),
"[project]/src/lib/services/expense.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExpenseService",
    ()=>ExpenseService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/date.ts [app-rsc] (ecmascript)");
;
;
class ExpenseService {
    repo;
    constructor(repo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getExpenseRepository"])()){
        this.repo = repo;
    }
    async getSpendingByCategoryForMonths(months, userId) {
        return this.repo.getSpendingByCategoryForMonths(months, userId);
    }
    async getByMonthPaginated(month, page, pageSize, userId) {
        const total = await this.repo.countByMonth(month, userId);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * pageSize;
        const expenses = await this.repo.findByMonthPaginated(month, pageSize, offset, userId);
        return {
            expenses,
            total,
            page: safePage,
            pageSize,
            totalPages
        };
    }
    async getByMonth(month, userId) {
        const expenses = await this.repo.findByMonth(month, userId);
        const totals = {
            overall: 0,
            byUser: {},
            byCategory: {}
        };
        for (const e of expenses){
            totals.overall += e.amount;
            totals.byUser[e.userId] = (totals.byUser[e.userId] ?? 0) + e.amount;
            totals.byCategory[e.categoryId] = (totals.byCategory[e.categoryId] ?? 0) + e.amount;
        }
        return {
            expenses,
            totals
        };
    }
    async create(userId, data) {
        const month = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["monthFromDate"])(data.date);
        return this.repo.create({
            userId,
            categoryId: data.categoryId,
            amount: data.amount,
            note: data.note,
            date: data.date,
            month
        });
    }
    async update(id, userId, data) {
        const payload = {
            ...data
        };
        if (data.date) payload.month = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["monthFromDate"])(data.date);
        await this.repo.update(id, payload);
    }
    async delete(id) {
        await this.repo.delete(id);
    }
}
}),
"[project]/src/lib/services/budget.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BudgetService",
    ()=>BudgetService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$income$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/income.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/expense.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/date.ts [app-rsc] (ecmascript)");
;
;
;
;
;
/** Max months to look back when resolving carried-over allocations. */ const CARRY_OVER_MONTHS = 12;
class BudgetService {
    budgetRepo;
    incomeService;
    expenseService;
    categoryRepo;
    constructor(budgetRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getBudgetRepository"])(), incomeService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$income$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IncomeService"](), expenseService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseService"](), categoryRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCategoryRepository"])()){
        this.budgetRepo = budgetRepo;
        this.incomeService = incomeService;
        this.expenseService = expenseService;
        this.categoryRepo = categoryRepo;
    }
    async getOverview(month, userId) {
        const monthsToLoad = [
            month
        ];
        let m = month;
        for(let i = 0; i < CARRY_OVER_MONTHS; i++){
            m = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prevMonth"])(m);
            monthsToLoad.push(m);
        }
        const [incomeResult, expenseResult, allocationsForMonths, transfers, categories] = await Promise.all([
            this.incomeService.getByMonth(month, userId),
            this.expenseService.getByMonth(month, userId),
            this.budgetRepo.getAllocationsForMonths(monthsToLoad, userId),
            this.budgetRepo.getTransfersForMonth(month, userId),
            this.categoryRepo.findAll()
        ]);
        const totalIncome = incomeResult.totals.overall;
        const totalExpenses = expenseResult.totals.overall;
        const balance = totalIncome - totalExpenses;
        const allocationMap = this.resolveEffectiveAllocations(month, monthsToLoad, allocationsForMonths, categories);
        await this.persistMissingAllocationsForMonth(month, allocationMap, categories, userId);
        const spentByCategory = expenseResult.totals.byCategory;
        const categoryMeta = new Map(categories.map((c)=>[
                c.id,
                c
            ]));
        let totalAllocated = 0;
        const categoryRows = categories.map((cat)=>{
            const allocated = allocationMap.get(cat.id) ?? 0;
            const spent = spentByCategory[cat.id] ?? 0;
            totalAllocated += allocated;
            const remaining = allocated - spent;
            const spentByUser = {};
            for (const e of expenseResult.expenses){
                if (e.categoryId === cat.id) {
                    spentByUser[e.userId] = (spentByUser[e.userId] ?? 0) + e.amount;
                }
            }
            return {
                categoryId: cat.id,
                categoryName: cat.name,
                groupName: cat.groupName,
                costType: cat.costType ?? "variable",
                allocated,
                spent,
                remaining,
                isOverspent: remaining < 0,
                spentByUser
            };
        });
        const unallocated = totalIncome - totalAllocated;
        const isBalanced = unallocated === 0;
        const transferDisplays = await Promise.all(transfers.map(async (t)=>{
            const fromCat = categoryMeta.get(t.fromCategoryId);
            const toCat = categoryMeta.get(t.toCategoryId);
            return {
                id: t.id,
                fromCategoryName: fromCat?.name ?? "?",
                toCategoryName: toCat?.name ?? "?",
                amount: t.amount,
                userName: String(t.userId),
                reason: t.reason,
                createdAt: t.createdAt
            };
        }));
        const userNames = await this.getUserNamesForTransfers(transfers.map((t)=>t.userId));
        transferDisplays.forEach((t, i)=>{
            t.userName = userNames[i] ?? String(transfers[i].userId);
        });
        return {
            month,
            totalIncome,
            totalExpenses,
            balance,
            totalAllocated,
            unallocated,
            isBalanced,
            categories: categoryRows,
            transfers: transferDisplays
        };
    }
    /**
   * Resolves effective allocation per category: current month if set, else latest previous month
   * (carry-over), else for fixed categories with defaultAmount use that.
   */ resolveEffectiveAllocations(currentMonth, monthsNewestFirst, allocations, categories) {
        const byCategoryAndMonth = new Map();
        for (const a of allocations){
            byCategoryAndMonth.set(`${a.categoryId}:${a.month}`, a.allocatedAmount);
        }
        const categoryMeta = new Map(categories.map((c)=>[
                c.id,
                c
            ]));
        const result = new Map();
        for (const cat of categories){
            let amount = 0;
            for (const month of monthsNewestFirst){
                const key = `${cat.id}:${month}`;
                const value = byCategoryAndMonth.get(key);
                if (value !== undefined) {
                    amount = value;
                    break;
                }
            }
            if (amount === 0 && cat.costType === "fixed" && cat.defaultAmount != null && cat.defaultAmount > 0) {
                amount = cat.defaultAmount;
            }
            result.set(cat.id, amount);
        }
        return result;
    }
    /** Persist allocation rows for the current month where we have effective amount but no row yet. */ async persistMissingAllocationsForMonth(month, allocationMap, categories, userId) {
        const existing = await this.budgetRepo.getAllocationsForMonth(month, userId);
        const existingCategoryIds = new Set(existing.map((a)=>a.categoryId));
        for (const cat of categories){
            const amount = allocationMap.get(cat.id) ?? 0;
            if (amount > 0 && !existingCategoryIds.has(cat.id)) {
                await this.budgetRepo.upsertAllocation(cat.id, month, amount, userId);
            }
        }
    }
    async getUserNamesForTransfers(userIds) {
        const { all } = await __turbopack_context__.A("[project]/src/lib/db/index.ts [app-rsc] (ecmascript, async loader)");
        const unique = [
            ...new Set(userIds)
        ];
        if (unique.length === 0) return [];
        const placeholders = unique.map(()=>"?").join(",");
        const rows = all(`SELECT id, name FROM users WHERE id IN (${placeholders})`, unique);
        const map = new Map(rows.map((r)=>[
                r.id,
                r.name
            ]));
        return userIds.map((id)=>map.get(id) ?? "?");
    }
    async setAllocation(categoryId, month, amount, userId) {
        await this.budgetRepo.upsertAllocation(categoryId, month, amount, userId);
    }
    /** Number of past months to use for historical spending weights. */ static AUTO_ALLOCATE_HISTORY_MONTHS = 6;
    /**
   * Distributes the unallocated remainder across categories that already have an allocation.
   * If historical spending data exists, uses those proportions; otherwise splits evenly.
   */ async autoAllocate(month, userId) {
        const overview = await this.getOverview(month, userId);
        const remainder = overview.unallocated;
        if (remainder <= 0) {
            return {
                success: true,
                updated: 0
            };
        }
        const categoriesWithAllocation = overview.categories.filter((c)=>c.allocated > 0);
        const recipients = categoriesWithAllocation.length > 0 ? categoriesWithAllocation : overview.categories;
        if (recipients.length === 0) {
            return {
                success: false,
                error: "No categories to allocate to"
            };
        }
        const historicalMonths = [];
        let m = month;
        for(let i = 0; i < BudgetService.AUTO_ALLOCATE_HISTORY_MONTHS; i++){
            m = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prevMonth"])(m);
            historicalMonths.push(m);
        }
        const historicalByCategory = await this.expenseService.getSpendingByCategoryForMonths(historicalMonths, userId);
        const totalHistorical = recipients.reduce((sum, c)=>sum + (historicalByCategory[c.categoryId] ?? 0), 0);
        const weights = recipients.map((c)=>{
            const w = totalHistorical > 0 ? (historicalByCategory[c.categoryId] ?? 0) / totalHistorical : 1 / recipients.length;
            return {
                categoryId: c.categoryId,
                weight: w
            };
        });
        const increments = new Map();
        let distributed = 0;
        const ordered = [
            ...weights
        ].sort((a, b)=>b.weight - a.weight);
        for (const { categoryId, weight } of ordered){
            const raw = weight * remainder;
            const inc = Math.floor(raw);
            increments.set(categoryId, inc);
            distributed += inc;
        }
        let leftover = remainder - distributed;
        for (const { categoryId } of ordered){
            if (leftover <= 0) break;
            increments.set(categoryId, (increments.get(categoryId) ?? 0) + 1);
            leftover -= 1;
        }
        for (const cat of overview.categories){
            const inc = increments.get(cat.categoryId) ?? 0;
            if (inc > 0) {
                const newAmount = cat.allocated + inc;
                await this.budgetRepo.upsertAllocation(cat.categoryId, month, newAmount, userId);
            }
        }
        return {
            success: true,
            updated: increments.size
        };
    }
    async transfer(data) {
        const overview = await this.getOverview(data.month, data.userId);
        const fromRow = overview.categories.find((c)=>c.categoryId === data.fromCategoryId);
        const toRow = overview.categories.find((c)=>c.categoryId === data.toCategoryId);
        if (!fromRow || !toRow) return {
            success: false,
            error: "Category not found"
        };
        if (fromRow.remaining < data.amount) {
            return {
                success: false,
                error: "Insufficient funds in source category"
            };
        }
        const newFromAllocated = fromRow.allocated - data.amount;
        const newToAllocated = toRow.allocated + data.amount;
        await this.budgetRepo.upsertAllocation(data.fromCategoryId, data.month, newFromAllocated, data.userId);
        await this.budgetRepo.upsertAllocation(data.toCategoryId, data.month, newToAllocated, data.userId);
        await this.budgetRepo.createTransfer(data);
        return {
            success: true
        };
    }
}
}),
"[project]/src/lib/validators/budget.schema.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "allocateSchema",
    ()=>allocateSchema,
    "transferSchema",
    ()=>transferSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
;
const allocateSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    categoryId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    month: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}$/),
    amount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0)
});
const transferSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    fromCategoryId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    toCategoryId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    month: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}$/),
    amount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    reason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional().nullable()
});
}),
"[project]/src/lib/actions/budget.actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40576df56853ef47ccb985c2370579ea04b426a24c":"autoAllocateBudget","4096fb59d82c4bd7e0feab68dccc445087d147de9e":"transferBudgetFunds","704f8cb5670bb90cb63790a9ef39b727cdbccef81c":"setBudgetAllocation"},"",""] */ __turbopack_context__.s([
    "autoAllocateBudget",
    ()=>autoAllocateBudget,
    "setBudgetAllocation",
    ()=>setBudgetAllocation,
    "transferBudgetFunds",
    ()=>transferBudgetFunds
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$budget$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/budget.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$budget$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/validators/budget.schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
async function setBudgetAllocation(categoryId, month, amount) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) return {
        success: false,
        error: "Unauthorized"
    };
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$budget$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allocateSchema"].safeParse({
        categoryId,
        month,
        amount
    });
    if (!parsed.success) return {
        success: false,
        error: parsed.error.message
    };
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$budget$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BudgetService"]();
    await service.setAllocation(categoryId, month, amount, Number(session.user.id));
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/budget");
    return {
        success: true
    };
}
async function autoAllocateBudget(month) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) return {
        success: false,
        error: "Unauthorized"
    };
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$budget$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allocateSchema"].pick({
        month: true
    }).safeParse({
        month
    });
    if (!parsed.success) return {
        success: false,
        error: parsed.error.message
    };
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$budget$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BudgetService"]();
    const result = await service.autoAllocate(parsed.data.month, Number(session.user.id));
    if (result.success) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/budget");
    return result;
}
async function transferBudgetFunds(data) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) return {
        success: false,
        error: "Unauthorized"
    };
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$budget$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["transferSchema"].safeParse(data);
    if (!parsed.success) return {
        success: false,
        error: parsed.error.message
    };
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$budget$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BudgetService"]();
    const result = await service.transfer({
        ...parsed.data,
        userId: Number(session.user.id)
    });
    if (!result.success) return {
        success: false,
        error: result.error
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/budget");
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    setBudgetAllocation,
    autoAllocateBudget,
    transferBudgetFunds
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(setBudgetAllocation, "704f8cb5670bb90cb63790a9ef39b727cdbccef81c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(autoAllocateBudget, "40576df56853ef47ccb985c2370579ea04b426a24c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(transferBudgetFunds, "4096fb59d82c4bd7e0feab68dccc445087d147de9e", null);
}),
"[project]/.next-internal/server/app/(app)/budget/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/lib/actions/budget.actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$budget$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/actions/budget.actions.ts [app-rsc] (ecmascript)");
;
;
;
;
}),
"[project]/.next-internal/server/app/(app)/budget/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/lib/actions/budget.actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00b01c9369bedf31201292072164b5c2535c7a203f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["$$RSC_SERVER_ACTION_0"],
    "40576df56853ef47ccb985c2370579ea04b426a24c",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$budget$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["autoAllocateBudget"],
    "4096fb59d82c4bd7e0feab68dccc445087d147de9e",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$budget$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["transferBudgetFunds"],
    "704f8cb5670bb90cb63790a9ef39b727cdbccef81c",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$budget$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setBudgetAllocation"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$app$292f$budget$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$src$2f$lib$2f$actions$2f$budget$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(app)/budget/page/actions.js { ACTIONS_MODULE0 => "[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/lib/actions/budget.actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$budget$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/actions/budget.actions.ts [app-rsc] (ecmascript)");
}),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/(app)/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(app)/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/(app)/error.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(app)/error.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/(app)/loading.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(app)/loading.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/components/layout/month-navigator.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "MonthNavigator",
    ()=>MonthNavigator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const MonthNavigator = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call MonthNavigator() from the server but MonthNavigator is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/layout/month-navigator.tsx <module evaluation>", "MonthNavigator");
}),
"[project]/src/components/layout/month-navigator.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "MonthNavigator",
    ()=>MonthNavigator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const MonthNavigator = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call MonthNavigator() from the server but MonthNavigator is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/layout/month-navigator.tsx", "MonthNavigator");
}),
"[project]/src/components/layout/month-navigator.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$month$2d$navigator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/layout/month-navigator.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$month$2d$navigator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/layout/month-navigator.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$month$2d$navigator$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/budget/budget-overview.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "BudgetOverview",
    ()=>BudgetOverview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const BudgetOverview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call BudgetOverview() from the server but BudgetOverview is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/budget/budget-overview.tsx <module evaluation>", "BudgetOverview");
}),
"[project]/src/components/budget/budget-overview.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "BudgetOverview",
    ()=>BudgetOverview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const BudgetOverview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call BudgetOverview() from the server but BudgetOverview is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/budget/budget-overview.tsx", "BudgetOverview");
}),
"[project]/src/components/budget/budget-overview.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$budget$2f$budget$2d$overview$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/budget/budget-overview.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$budget$2f$budget$2d$overview$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/budget/budget-overview.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$budget$2f$budget$2d$overview$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/app/(app)/budget/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BudgetPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$budget$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/budget.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/date.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$month$2d$navigator$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/month-navigator.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$budget$2f$budget$2d$overview$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/budget/budget-overview.tsx [app-rsc] (ecmascript)");
;
;
;
;
;
;
async function BudgetPage({ searchParams }) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) return null;
    const userId = Number(session.user.id);
    const { month: monthParam } = await searchParams;
    const month = monthParam ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCurrentMonth"])();
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$budget$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BudgetService"]();
    const overview = await service.getOverview(month, userId);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "p-4 space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$month$2d$navigator$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MonthNavigator"], {}, void 0, false, {
                fileName: "[project]/src/app/(app)/budget/page.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-xl font-semibold",
                children: "Budget"
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/budget/page.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$budget$2f$budget$2d$overview$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["BudgetOverview"], {
                data: overview
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/budget/page.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(app)/budget/page.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/(app)/budget/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(app)/budget/page.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__72690200._.js.map