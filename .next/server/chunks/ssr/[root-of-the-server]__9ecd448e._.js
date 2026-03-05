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
"[project]/src/lib/services/split.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SplitService",
    ()=>SplitService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/date.ts [app-rsc] (ecmascript)");
;
;
class SplitService {
    expenseRepo;
    allocationRepo;
    settlementRepo;
    userRepo;
    categoryRepo;
    incomeRepo;
    constructor(expenseRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getExpenseRepository"])(), allocationRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSplitAllocationRepository"])(), settlementRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSplitSettlementRepository"])(), userRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUserRepository"])(), categoryRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCategoryRepository"])(), incomeRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getIncomeRepository"])()){
        this.expenseRepo = expenseRepo;
        this.allocationRepo = allocationRepo;
        this.settlementRepo = settlementRepo;
        this.userRepo = userRepo;
        this.categoryRepo = categoryRepo;
        this.incomeRepo = incomeRepo;
    }
    async createSplit(paidByUserId, totalAmountCents, categoryId, note, date, options) {
        const otherUsers = await this.userRepo.findAllExcept(paidByUserId);
        if (otherUsers.length === 0) {
            throw new Error("No other user to split with.");
        }
        const otherUser = otherUsers[0];
        let amountOwed;
        switch(options.type){
            case "equal":
                amountOwed = Math.floor(totalAmountCents / 2);
                break;
            case "full":
                amountOwed = totalAmountCents;
                break;
            case "exact":
                amountOwed = options.otherShareCents;
                break;
        }
        if (amountOwed <= 0) {
            return this.expenseRepo.create({
                userId: paidByUserId,
                categoryId,
                amount: totalAmountCents,
                note,
                date,
                month: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["monthFromDate"])(date)
            });
        }
        const splitGroupId = crypto.randomUUID();
        const month = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["monthFromDate"])(date);
        const { id: expenseId } = await this.expenseRepo.create({
            userId: paidByUserId,
            categoryId,
            amount: totalAmountCents,
            note,
            date,
            month,
            splitGroupId,
            paidByUserId
        });
        try {
            await this.allocationRepo.create(expenseId, otherUser.id, amountOwed);
        } catch (e) {
            await this.expenseRepo.delete(expenseId);
            throw e;
        }
        return {
            id: expenseId
        };
    }
    async getBalance(currentUserId) {
        const allocations = await this.allocationRepo.findAllForBalance();
        const settlements = await this.settlementRepo.findAllForUser(currentUserId);
        const perUserMap = new Map();
        for (const row of allocations){
            if (row.paidByUserId === currentUserId && row.allocationUserId !== currentUserId) {
                const existing = perUserMap.get(row.allocationUserId) ?? {
                    userId: row.allocationUserId,
                    userName: row.allocationUserName,
                    owedToMe: 0,
                    iOwe: 0
                };
                existing.owedToMe += row.amount;
                perUserMap.set(row.allocationUserId, existing);
            } else if (row.allocationUserId === currentUserId) {
                const existing = perUserMap.get(row.paidByUserId) ?? {
                    userId: row.paidByUserId,
                    userName: row.paidByUserName,
                    owedToMe: 0,
                    iOwe: 0
                };
                existing.iOwe += row.amount;
                perUserMap.set(row.paidByUserId, existing);
            }
        }
        for (const s of settlements){
            if (s.recipientUserId === currentUserId) {
                const existing = perUserMap.get(s.payerUserId) ?? {
                    userId: s.payerUserId,
                    userName: s.payerUserName,
                    owedToMe: 0,
                    iOwe: 0
                };
                existing.owedToMe -= s.amount;
                perUserMap.set(s.payerUserId, existing);
            } else {
                const existing = perUserMap.get(s.recipientUserId) ?? {
                    userId: s.recipientUserId,
                    userName: s.recipientUserName,
                    owedToMe: 0,
                    iOwe: 0
                };
                existing.iOwe -= s.amount;
                perUserMap.set(s.recipientUserId, existing);
            }
        }
        let owedToMe = 0;
        let iOwe = 0;
        for (const u of perUserMap.values()){
            if (u.owedToMe > 0) owedToMe += u.owedToMe;
            if (u.iOwe > 0) iOwe += u.iOwe;
        }
        const perUser = Array.from(perUserMap.values());
        return {
            owedToMe,
            iOwe,
            net: owedToMe - iOwe,
            perUser
        };
    }
    async settle(payerUserId, recipientUserId, amountCents, date, payerUserName, recipientUserName) {
        const splitsCategory = await this.categoryRepo.findByName("Splits");
        if (!splitsCategory) {
            throw new Error("Splits category not found. Run db:seed to create it.");
        }
        const month = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["monthFromDate"])(date);
        const { id: expenseId } = await this.expenseRepo.create({
            userId: payerUserId,
            categoryId: splitsCategory.id,
            amount: amountCents,
            note: `Settlement to ${recipientUserName}`,
            date,
            month
        });
        let incomeId = null;
        try {
            const income = await this.incomeRepo.create({
                userId: recipientUserId,
                amount: amountCents,
                type: "ad_hoc",
                description: `Settlement from ${payerUserName}`,
                date,
                month
            });
            incomeId = income.id;
            await this.settlementRepo.create({
                payerUserId,
                recipientUserId,
                amount: amountCents,
                date,
                expenseId,
                incomeId
            });
        } catch (e) {
            await this.expenseRepo.delete(expenseId);
            if (incomeId != null) await this.incomeRepo.delete(incomeId);
            throw e;
        }
    }
    /**
   * Records a settlement for an expense already created (e.g. from dashboard with category Splits).
   * Creates income for the recipient and a settlement record so the splits page shows it and reduces "I owe".
   */ async recordSettlementForExpense(expenseId, payerUserId, amountCents, date, payerUserName, recipientUserName) {
        const otherUsers = await this.userRepo.findAllExcept(payerUserId);
        if (otherUsers.length === 0) {
            throw new Error("No other user to settle with.");
        }
        const recipientUserId = otherUsers[0].id;
        const month = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["monthFromDate"])(date);
        let incomeId = null;
        try {
            const income = await this.incomeRepo.create({
                userId: recipientUserId,
                amount: amountCents,
                type: "ad_hoc",
                description: `Settlement from ${payerUserName}`,
                date,
                month
            });
            incomeId = income.id;
            await this.settlementRepo.create({
                payerUserId,
                recipientUserId,
                amount: amountCents,
                date,
                expenseId,
                incomeId
            });
        } catch (e) {
            if (incomeId != null) await this.incomeRepo.delete(incomeId);
            throw e;
        }
    }
    async getSplitHistory(userId) {
        const expenses = await this.expenseRepo.findSplitExpenses();
        const settlements = await this.settlementRepo.findAllForUser(userId);
        const result = [];
        for (const exp of expenses){
            const allocations = await this.allocationRepo.findByExpenseId(exp.id);
            result.push({
                type: "expense",
                expenseId: exp.id,
                paidByUserId: exp.userId,
                paidByUserName: exp.userName,
                totalAmount: exp.amount,
                categoryId: exp.categoryId,
                categoryName: exp.categoryName,
                date: exp.date,
                note: exp.note,
                allocations: allocations.map((a)=>({
                        userId: a.userId,
                        userName: a.userName,
                        amount: a.amount
                    }))
            });
        }
        for (const s of settlements){
            result.push({
                type: "settlement",
                settlementId: s.id,
                payerUserId: s.payerUserId,
                payerUserName: s.payerUserName,
                recipientUserId: s.recipientUserId,
                recipientUserName: s.recipientUserName,
                amount: s.amount,
                date: s.date
            });
        }
        return result.sort((a, b)=>b.date.localeCompare(a.date));
    }
}
}),
"[project]/src/lib/services/mortgage-calculator.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateTopUp",
    ()=>calculateTopUp,
    "checkConvergenceFeasibility",
    ()=>checkConvergenceFeasibility,
    "generateSchedule",
    ()=>generateSchedule,
    "projectScheduleFromBalance",
    ()=>projectScheduleFromBalance,
    "simulateSchedule",
    ()=>simulateSchedule,
    "standardMonthlyPayment",
    ()=>standardMonthlyPayment
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addMonths.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-rsc] (ecmascript) <locals>");
;
function standardMonthlyPayment(loanAmount, monthlyRate, termMonths) {
    if (monthlyRate <= 0) return Math.ceil(loanAmount / termMonths);
    const r = monthlyRate;
    const n = termMonths;
    const M = loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return Math.round(M);
}
function simulateSchedule(params, M, userBBase, topUp, startDate, getExtraPayment) {
    let balance = params.loanAmount;
    let userATotalPayments = 0;
    let userBTotalPayments = 0;
    const schedule = [];
    let month = 0;
    const [startYear, startMonth] = startDate.slice(0, 7).split("-").map(Number);
    let currentDate = new Date(startYear, startMonth - 1, 1);
    while(balance > 0.5){
        month++;
        const openingBalance = balance;
        const interest = Math.round(balance * params.monthlyRate);
        const extra = getExtraPayment ? getExtraPayment(month) : 0;
        let totalPayment = M + topUp + extra;
        if (totalPayment > balance + interest) {
            totalPayment = balance + interest;
        }
        let userBPay = Math.min(userBBase, totalPayment);
        const userAPay = totalPayment - userBPay;
        const principal = totalPayment - interest;
        balance = openingBalance - principal;
        userATotalPayments += userAPay;
        userBTotalPayments += userBPay;
        const totalContrib = params.userA.deposit + params.userB.deposit + userATotalPayments + userBTotalPayments;
        schedule.push({
            month,
            date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(currentDate, "yyyy-MM"),
            openingBalance,
            interest,
            principal,
            totalPayment,
            userAPayment: userAPay,
            userBPayment: userBPay,
            userACumulativeEquityPct: totalContrib > 0 ? (params.userA.deposit + userATotalPayments) / totalContrib : 0.5,
            userBCumulativeEquityPct: totalContrib > 0 ? (params.userB.deposit + userBTotalPayments) / totalContrib : 0.5,
            closingBalance: Math.max(0, Math.round(balance))
        });
        currentDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(currentDate, 1);
        if (month > params.termMonths * 2) break;
    }
    return {
        userATotalPayments,
        userBTotalPayments,
        schedule,
        months: month
    };
}
function calculateTopUp(params, startDate, targetEquityUserA = 0.5) {
    const M = standardMonthlyPayment(params.loanAmount, params.monthlyRate, params.termMonths);
    const userBBase = Math.min(Math.round(params.userB.baseSplitPct * M), params.userB.monthlyCap ?? Infinity);
    const resultAtZero = simulateSchedule(params, M, userBBase, 0, startDate);
    const totalContribZero = params.userA.deposit + params.userB.deposit + resultAtZero.userATotalPayments + resultAtZero.userBTotalPayments;
    const userAEquityAtZero = totalContribZero > 0 ? (params.userA.deposit + resultAtZero.userATotalPayments) / totalContribZero : 0.5;
    if (userAEquityAtZero >= targetEquityUserA - 0.001) {
        return 0;
    }
    let lo = 0;
    let hi = M * 5;
    for(let i = 0; i < 100; i++){
        const T = Math.round((lo + hi) / 2);
        const result = simulateSchedule(params, M, userBBase, T, startDate);
        const totalContrib = params.userA.deposit + params.userB.deposit + result.userATotalPayments + result.userBTotalPayments;
        const userAEquity = totalContrib > 0 ? (params.userA.deposit + result.userATotalPayments) / totalContrib : 0.5;
        if (userAEquity < targetEquityUserA) {
            lo = T;
        } else {
            hi = T;
        }
        if (hi - lo <= 1) break;
    }
    return Math.round((lo + hi) / 2);
}
function generateSchedule(params, startDate, targetEquityUserA = 0.5) {
    const M = standardMonthlyPayment(params.loanAmount, params.monthlyRate, params.termMonths);
    const userBBase = Math.min(Math.round(params.userB.baseSplitPct * M), params.userB.monthlyCap ?? Infinity);
    const topUp = calculateTopUp(params, startDate, targetEquityUserA);
    const result = simulateSchedule(params, M, userBBase, topUp, startDate);
    const totalContrib = params.userA.deposit + params.userB.deposit + result.userATotalPayments + result.userBTotalPayments;
    const userAFinal = totalContrib > 0 ? (params.userA.deposit + result.userATotalPayments) / totalContrib : 0.5;
    const userBFinal = totalContrib > 0 ? (params.userB.deposit + result.userBTotalPayments) / totalContrib : 0.5;
    const lastRow = result.schedule[result.schedule.length - 1];
    const payoffDate = lastRow ? lastRow.date : startDate;
    return {
        monthlyBasePayment: M,
        monthlyTopUp: topUp,
        projectedMonths: result.months,
        projectedPayoffDate: payoffDate,
        schedule: result.schedule,
        convergenceAchieved: Math.abs(userAFinal - targetEquityUserA) < 0.01,
        userAFinalEquityPct: userAFinal,
        userBFinalEquityPct: userBFinal
    };
}
function checkConvergenceFeasibility(params, startDate) {
    const M = standardMonthlyPayment(params.loanAmount, params.monthlyRate, params.termMonths);
    const result = simulateSchedule(params, M, 0, M * 3, startDate);
    const totalContrib = params.userA.deposit + params.userB.deposit + result.userATotalPayments + result.userBTotalPayments;
    const bestPct = totalContrib > 0 ? (params.userA.deposit + result.userATotalPayments) / totalContrib : 0.5;
    return {
        feasible: bestPct >= 0.5,
        bestAchievablePct: bestPct
    };
}
function projectScheduleFromBalance(options) {
    const { params, startBalance, startMonth, startDate, M, userBBase, topUp, initialUserATotal, initialUserBTotal, getExtraPayment, maxMonths = params.termMonths * 2 } = options;
    let balance = startBalance;
    let userATotalPayments = initialUserATotal;
    let userBTotalPayments = initialUserBTotal;
    const schedule = [];
    const [startYear, startMonthNum] = startDate.slice(0, 7).split("-").map(Number);
    let currentDate = new Date(startYear, startMonthNum - 1, 1);
    currentDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(currentDate, startMonth - 1);
    let month = startMonth - 1;
    const maxMonth = startMonth + maxMonths;
    while(balance > 0.5 && month < maxMonth){
        month++;
        const openingBalance = balance;
        const interest = Math.round(balance * params.monthlyRate);
        const extra = getExtraPayment ? getExtraPayment(month) : 0;
        let totalPayment = M + topUp + extra;
        if (totalPayment > balance + interest) {
            totalPayment = balance + interest;
        }
        let userBPay = Math.min(userBBase, totalPayment);
        const userAPay = totalPayment - userBPay;
        const principal = totalPayment - interest;
        balance = openingBalance - principal;
        userATotalPayments += userAPay;
        userBTotalPayments += userBPay;
        const totalContrib = params.userA.deposit + params.userB.deposit + userATotalPayments + userBTotalPayments;
        schedule.push({
            month,
            date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(currentDate, "yyyy-MM"),
            openingBalance,
            interest,
            principal,
            totalPayment,
            userAPayment: userAPay,
            userBPayment: userBPay,
            userACumulativeEquityPct: totalContrib > 0 ? (params.userA.deposit + userATotalPayments) / totalContrib : 0.5,
            userBCumulativeEquityPct: totalContrib > 0 ? (params.userB.deposit + userBTotalPayments) / totalContrib : 0.5,
            closingBalance: Math.max(0, Math.round(balance))
        });
        currentDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(currentDate, 1);
    }
    return {
        schedule,
        userATotalPayments,
        userBTotalPayments,
        months: month
    };
}
}),
"[project]/src/lib/services/mortgage.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MortgageService",
    ()=>MortgageService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2d$calculator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/mortgage-calculator.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addMonths.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-rsc] (ecmascript) <locals>");
;
;
;
class MortgageService {
    repo;
    constructor(repo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMortgageRepository"])()){
        this.repo = repo;
    }
    async getConfig() {
        const config = await this.repo.getActiveConfig();
        if (!config) {
            return {
                config: null,
                userConfigs: []
            };
        }
        const userConfigs = await this.repo.getUserConfigs(config.id);
        return {
            config,
            userConfigs
        };
    }
    async saveConfig(data) {
        const existing = await this.repo.getActiveConfig();
        const config = await this.repo.upsertConfig({
            propertyValue: data.propertyValue,
            loanAmount: data.loanAmount,
            annualInterestRate: data.annualInterestRate,
            loanTermMonths: data.loanTermMonths,
            startDate: data.startDate,
            targetEquityUserAPct: data.targetEquityUserAPct ?? 0.5
        });
        for (const u of data.users){
            await this.repo.upsertUserConfig(config.id, u.userId, {
                initialDeposit: u.initialDeposit,
                baseSplitPct: u.baseSplitPct,
                monthlyCap: u.monthlyCap ?? null
            });
        }
        const scheduleResult = await this.getScheduleInternal(config.id);
        if (scheduleResult) {
            await this.repo.saveSnapshot({
                mortgageId: config.id,
                triggerEvent: existing ? "config_update" : "initial",
                scheduleJson: JSON.stringify(scheduleResult.schedule),
                projectedPayoffDate: scheduleResult.projectedPayoffDate,
                projectedMonths: scheduleResult.projectedMonths,
                monthlyTopup: scheduleResult.monthlyTopUp,
                userAFinalEquityPct: scheduleResult.userAFinalEquityPct,
                userBFinalEquityPct: scheduleResult.userBFinalEquityPct
            });
        }
        return config;
    }
    buildParams(config, userConfigs) {
        const sorted = [
            ...userConfigs
        ].sort((a, b)=>b.baseSplitPct - a.baseSplitPct);
        const userA = sorted[0];
        const userB = sorted[1];
        if (!userA || !userB) {
            throw new Error("Need exactly two user configs");
        }
        const monthlyRate = config.annualInterestRate / 12;
        const params = {
            loanAmount: config.loanAmount,
            monthlyRate,
            termMonths: config.loanTermMonths,
            propertyValue: config.propertyValue,
            userA: {
                deposit: userA.initialDeposit,
                baseSplitPct: userA.baseSplitPct,
                monthlyCap: userA.monthlyCap
            },
            userB: {
                deposit: userB.initialDeposit,
                baseSplitPct: userB.baseSplitPct,
                monthlyCap: userB.monthlyCap
            }
        };
        return {
            params,
            userAId: userA.userId,
            userBId: userB.userId
        };
    }
    async getScheduleInternal(mortgageId) {
        const config = await this.repo.getActiveConfig();
        if (!config || config.id !== mortgageId) return null;
        const userConfigs = await this.repo.getUserConfigs(mortgageId);
        if (userConfigs.length < 2) return null;
        const { params, userAId, userBId } = this.buildParams(config, userConfigs);
        const payments = await this.repo.getPayments(mortgageId);
        const extraByMonth = new Map();
        for (const p of payments.filter((x)=>x.isExtraPayment)){
            extraByMonth.set(p.monthNumber, (extraByMonth.get(p.monthNumber) ?? 0) + p.amount);
        }
        const getExtraPayment = (monthNumber)=>extraByMonth.get(monthNumber) ?? 0;
        const targetEquityUserA = config.targetEquityUserAPct ?? 0.5;
        const monthsWithPayments = [
            ...new Set(payments.map((p)=>p.monthNumber))
        ].sort((a, b)=>a - b);
        const maxPaidMonth = monthsWithPayments.length > 0 ? Math.max(...monthsWithPayments) : 0;
        for (const monthNum of monthsWithPayments){
            await this.recalcPrincipalInterestForMonth(mortgageId, monthNum, config, payments);
        }
        if (maxPaidMonth === 0) {
            return await this.getScheduleFullProjection(config, params, userAId, userBId, userConfigs, getExtraPayment, targetEquityUserA);
        }
        const actualRows = this.buildActualRowsFromPayments(payments, config.loanAmount, config.startDate, userAId, userBId, params);
        const totalPrincipalPaid = payments.reduce((s, p)=>s + p.principalPortion, 0);
        const remainingBalance = config.loanAmount - totalPrincipalPaid;
        const [startYear, startMonthNum] = config.startDate.slice(0, 7).split("-").map(Number);
        const firstUnpaidDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(new Date(startYear, startMonthNum - 1, 1), maxPaidMonth);
        const firstUnpaidDateStr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(firstUnpaidDate, "yyyy-MM");
        const remainingTermMonths = Math.max(1, config.loanTermMonths - maxPaidMonth);
        const paramsRemaining = {
            ...params,
            loanAmount: remainingBalance,
            termMonths: remainingTermMonths
        };
        const M = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2d$calculator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["standardMonthlyPayment"])(remainingBalance, params.monthlyRate, remainingTermMonths);
        const topUp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2d$calculator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["calculateTopUp"])(paramsRemaining, firstUnpaidDateStr, targetEquityUserA);
        const userBBase = Math.min(Math.round(params.userB.baseSplitPct * M), params.userB.monthlyCap ?? Infinity);
        const lastActual = actualRows[actualRows.length - 1];
        const initialUserATotal = lastActual ? payments.filter((p)=>p.monthNumber <= maxPaidMonth && p.userId === userAId).reduce((s, p)=>s + p.amount, 0) : 0;
        const initialUserBTotal = lastActual ? payments.filter((p)=>p.monthNumber <= maxPaidMonth && p.userId === userBId).reduce((s, p)=>s + p.amount, 0) : 0;
        const projected = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2d$calculator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["projectScheduleFromBalance"])({
            params: paramsRemaining,
            startBalance: remainingBalance,
            startMonth: maxPaidMonth + 1,
            startDate: firstUnpaidDateStr,
            M,
            userBBase,
            topUp,
            initialUserATotal,
            initialUserBTotal,
            getExtraPayment,
            maxMonths: remainingTermMonths * 2
        });
        const schedule = [
            ...actualRows,
            ...projected.schedule
        ];
        const lastRow = schedule[schedule.length - 1];
        const monthlyPaymentUserA = M - userBBase + topUp;
        const monthlyPaymentUserB = userBBase;
        const userAName = userConfigs.find((c)=>c.userId === userAId)?.userName ?? "User A";
        const userBName = userConfigs.find((c)=>c.userId === userBId)?.userName ?? "User B";
        return {
            monthlyBasePayment: M,
            monthlyTopUp: topUp,
            projectedMonths: projected.months,
            projectedPayoffDate: lastRow?.date ?? config.startDate,
            schedule,
            convergenceAchieved: Math.abs((lastRow?.userACumulativeEquityPct ?? 0.5) - targetEquityUserA) < 0.01,
            userAFinalEquityPct: lastRow?.userACumulativeEquityPct ?? 0.5,
            userBFinalEquityPct: lastRow?.userBCumulativeEquityPct ?? 0.5,
            monthlyPaymentUserA,
            monthlyPaymentUserB,
            targetEquityUserAPct: targetEquityUserA,
            equitySummary: {
                userA: {
                    name: userAName,
                    deposit: params.userA.deposit,
                    totalPayments: projected.userATotalPayments,
                    equityPct: lastRow?.userACumulativeEquityPct ?? 0.5
                },
                userB: {
                    name: userBName,
                    deposit: params.userB.deposit,
                    totalPayments: projected.userBTotalPayments,
                    equityPct: lastRow?.userBCumulativeEquityPct ?? 0.5
                }
            }
        };
    }
    buildActualRowsFromPayments(payments, loanAmount, startDate, userAId, userBId, params) {
        const byMonth = new Map();
        const [startYear, startMonthNum] = startDate.slice(0, 7).split("-").map(Number);
        for (const monthNum of [
            ...new Set(payments.map((p)=>p.monthNumber))
        ].sort((a, b)=>a - b)){
            const inMonth = payments.filter((p)=>p.monthNumber === monthNum);
            const totalPayment = inMonth.reduce((s, p)=>s + p.amount, 0);
            const principal = inMonth.reduce((s, p)=>s + p.principalPortion, 0);
            const interest = inMonth.reduce((s, p)=>s + p.interestPortion, 0);
            const userAPay = inMonth.filter((p)=>p.userId === userAId).reduce((s, p)=>s + p.amount, 0);
            const userBPay = inMonth.filter((p)=>p.userId === userBId).reduce((s, p)=>s + p.amount, 0);
            const monthStart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMonths"])(new Date(startYear, startMonthNum - 1, 1), monthNum - 1);
            byMonth.set(monthNum, {
                totalPayment,
                principal,
                interest,
                userAPay,
                userBPay,
                date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(monthStart, "yyyy-MM")
            });
        }
        const sortedMonths = [
            ...byMonth.keys()
        ].sort((a, b)=>a - b);
        const rows = [];
        let balance = loanAmount;
        let userATotal = params.userA.deposit;
        let userBTotal = params.userB.deposit;
        for (const monthNum of sortedMonths){
            const m = byMonth.get(monthNum);
            const openingBalance = balance;
            balance = openingBalance - m.principal;
            userATotal += m.userAPay;
            userBTotal += m.userBPay;
            const totalContrib = userATotal + userBTotal;
            rows.push({
                month: monthNum,
                date: m.date,
                openingBalance,
                interest: m.interest,
                principal: m.principal,
                totalPayment: m.totalPayment,
                userAPayment: m.userAPay,
                userBPayment: m.userBPay,
                userACumulativeEquityPct: totalContrib > 0 ? userATotal / totalContrib : 0.5,
                userBCumulativeEquityPct: totalContrib > 0 ? userBTotal / totalContrib : 0.5,
                closingBalance: Math.max(0, Math.round(balance))
            });
        }
        return rows;
    }
    async getScheduleFullProjection(config, params, userAId, userBId, userConfigs, getExtraPayment, targetEquityUserA) {
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2d$calculator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["generateSchedule"])(params, config.startDate, targetEquityUserA);
        const M = result.monthlyBasePayment;
        const userBBase = Math.min(Math.round(params.userB.baseSplitPct * M), params.userB.monthlyCap ?? Infinity);
        const monthlyPaymentUserA = M - userBBase + result.monthlyTopUp;
        const monthlyPaymentUserB = userBBase;
        const withExtras = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2d$calculator$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["simulateSchedule"])(params, M, userBBase, result.monthlyTopUp, config.startDate, getExtraPayment);
        const userAName = userConfigs.find((c)=>c.userId === userAId)?.userName ?? "User A";
        const userBName = userConfigs.find((c)=>c.userId === userBId)?.userName ?? "User B";
        const lastRow = withExtras.schedule[withExtras.schedule.length - 1];
        return {
            ...result,
            schedule: withExtras.schedule,
            projectedMonths: withExtras.months,
            projectedPayoffDate: lastRow?.date ?? config.startDate,
            monthlyPaymentUserA,
            monthlyPaymentUserB,
            targetEquityUserAPct: targetEquityUserA,
            equitySummary: {
                userA: {
                    name: userAName,
                    deposit: params.userA.deposit,
                    totalPayments: withExtras.userATotalPayments,
                    equityPct: lastRow?.userACumulativeEquityPct ?? 0.5
                },
                userB: {
                    name: userBName,
                    deposit: params.userB.deposit,
                    totalPayments: withExtras.userBTotalPayments,
                    equityPct: lastRow?.userBCumulativeEquityPct ?? 0.5
                }
            }
        };
    }
    async getSchedule() {
        const config = await this.repo.getActiveConfig();
        if (!config) return null;
        return this.getScheduleInternal(config.id);
    }
    async getPayments(mortgageId) {
        return this.repo.getPayments(mortgageId);
    }
    /**
   * Recomputes principal/interest for all payments in a given month so the schedule
   * reflects actual amounts paid. Called after recording a payment or when building actuals.
   * @param paymentsOptional - If provided (e.g. from getScheduleInternal), avoids refetching.
   */ async recalcPrincipalInterestForMonth(mortgageId, monthNumber, config, paymentsOptional) {
        const payments = paymentsOptional ?? await this.repo.getPayments(mortgageId);
        const inMonth = payments.filter((p)=>p.monthNumber === monthNumber);
        if (inMonth.length === 0) return;
        const totalAmount = inMonth.reduce((s, p)=>s + p.amount, 0);
        const monthlyRate = config.annualInterestRate / 12;
        const principalPaidBeforeThisMonth = payments.filter((p)=>p.monthNumber < monthNumber).reduce((s, p)=>s + p.principalPortion, 0);
        const balanceAtStart = config.loanAmount - principalPaidBeforeThisMonth;
        const interestForMonth = Math.min(Math.round(balanceAtStart * monthlyRate), totalAmount);
        const principalForMonth = totalAmount - interestForMonth;
        let assignedPrincipal = 0;
        for(let i = 0; i < inMonth.length; i++){
            const p = inMonth[i];
            const principalPortion = i === inMonth.length - 1 ? principalForMonth - assignedPrincipal : Math.round(principalForMonth * (p.amount / totalAmount));
            assignedPrincipal += principalPortion;
            const interestPortion = p.amount - principalPortion;
            p.principalPortion = principalPortion;
            p.interestPortion = interestPortion;
            await this.repo.updatePaymentPrincipalInterest(p.id, principalPortion, interestPortion);
        }
    }
    /** Record a regular mortgage payment (e.g. from an expense with Mortgage category). */ async recordPaymentFromExpense(userId, amount, paymentDate, note) {
        const config = await this.repo.getActiveConfig();
        if (!config) return false;
        const [y, m] = config.startDate.slice(0, 7).split("-").map(Number);
        const paymentD = new Date(paymentDate + "T12:00:00");
        const startD = new Date(y, m - 1, 1);
        const monthNumber = Math.max(1, (paymentD.getFullYear() - startD.getFullYear()) * 12 + (paymentD.getMonth() - startD.getMonth()) + 1);
        await this.repo.insertPayment({
            mortgageId: config.id,
            userId,
            paymentDate,
            monthNumber,
            amount,
            principalPortion: amount,
            interestPortion: 0,
            isExtraPayment: false,
            note
        });
        await this.recalcPrincipalInterestForMonth(config.id, monthNumber, config);
        return true;
    }
    async recordExtraPayment(userId, amount, paymentDate, note) {
        const config = await this.repo.getActiveConfig();
        if (!config) return null;
        const startDate = config.startDate;
        const [y, m] = startDate.slice(0, 7).split("-").map(Number);
        const paymentD = new Date(paymentDate + "T12:00:00");
        const startD = new Date(y, m - 1, 1);
        const monthNumber = Math.max(1, (paymentD.getFullYear() - startD.getFullYear()) * 12 + (paymentD.getMonth() - startD.getMonth()) + 1);
        const id = await this.repo.insertPayment({
            mortgageId: config.id,
            userId,
            paymentDate,
            monthNumber,
            amount,
            principalPortion: amount,
            interestPortion: 0,
            isExtraPayment: true,
            note
        });
        const scheduleResult = await this.getScheduleInternal(config.id);
        if (scheduleResult) {
            await this.repo.saveSnapshot({
                mortgageId: config.id,
                triggerEvent: "extra_payment",
                triggerPaymentId: id,
                scheduleJson: JSON.stringify(scheduleResult.schedule),
                projectedPayoffDate: scheduleResult.projectedPayoffDate,
                projectedMonths: scheduleResult.projectedMonths,
                monthlyTopup: scheduleResult.monthlyTopUp,
                userAFinalEquityPct: scheduleResult.userAFinalEquityPct,
                userBFinalEquityPct: scheduleResult.userBFinalEquityPct
            });
        }
        return this.getSchedule();
    }
}
}),
"[project]/src/lib/validators/expense.schema.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createExpenseSchema",
    ()=>createExpenseSchema,
    "updateExpenseSchema",
    ()=>updateExpenseSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
;
const createExpenseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    categoryId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    amount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    note: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional().nullable(),
    date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
const updateExpenseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    categoryId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().optional(),
    amount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().optional(),
    note: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional().nullable(),
    date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
}),
"[project]/src/lib/validators/split.schema.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createSplitExpenseSchema",
    ()=>createSplitExpenseSchema,
    "settleSplitSchema",
    ()=>settleSplitSchema,
    "splitTypeSchema",
    ()=>splitTypeSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
;
const splitTypeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "equal",
    "full",
    "exact"
]);
const createSplitExpenseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    categoryId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    totalAmountCents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    note: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional().nullable(),
    date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/),
    splitType: splitTypeSchema,
    myShareCents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).optional(),
    otherShareCents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).optional()
}).refine((data)=>{
    if (data.splitType !== "exact") return true;
    const my = data.myShareCents ?? 0;
    const other = data.otherShareCents ?? 0;
    return my + other === data.totalAmountCents;
}, {
    message: "My share + other share must equal total amount",
    path: [
        "myShareCents"
    ]
});
const settleSplitSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    recipientUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    amountCents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
}),
"[project]/src/lib/utils/currency.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatRand",
    ()=>formatRand,
    "fromMinorUnits",
    ()=>fromMinorUnits,
    "toMinorUnits",
    ()=>toMinorUnits
]);
function toMinorUnits(rands) {
    return Math.round(rands * 100);
}
function fromMinorUnits(cents) {
    return cents / 100;
}
function formatRand(cents) {
    const rands = cents / 100;
    return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(rands);
}
}),
"[project]/src/lib/actions/expense.actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"4062349d4b4f45421215db29d2fc0d2dd804bf3108":"addSplitExpense","40a0ce76c8c6902ea7ce59f66844471418c24daf93":"deleteExpense","40c822db22e7d87ae8a699269570099aa430a6dd07":"addExpense","60453d5a9905c8f47870b8ae711796ab4883f0ed67":"updateExpense"},"",""] */ __turbopack_context__.s([
    "addExpense",
    ()=>addExpense,
    "addSplitExpense",
    ()=>addSplitExpense,
    "deleteExpense",
    ()=>deleteExpense,
    "updateExpense",
    ()=>updateExpense
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/expense.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$split$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/split.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/mortgage.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$expense$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/validators/expense.schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$split$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/validators/split.schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
async function addExpense(formData) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    const userId = Number(session.user.id);
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$expense$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createExpenseSchema"].safeParse(formData);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.message
        };
    }
    const userRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUserRepository"])();
    const userRow = await userRepo.findById(userId);
    if (!userRow) {
        return {
            success: false,
            error: "Session expired. Please sign in again."
        };
    }
    const categoryRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCategoryRepository"])();
    const category = await categoryRepo.findById(parsed.data.categoryId);
    if (!category) {
        return {
            success: false,
            error: "Invalid category. Please refresh the page."
        };
    }
    const isSplitsSettlement = category.name === "Splits";
    if (isSplitsSettlement) {
        const splitService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$split$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SplitService"]();
        const balance = await splitService.getBalance(userId);
        const otherUsers = await userRepo.findAllExcept(userId);
        if (otherUsers.length === 0) {
            return {
                success: false,
                error: "No other user to settle with."
            };
        }
        const recipient = otherUsers[0];
        const perUser = balance.perUser.find((u)=>u.userId === recipient.id);
        const iOwe = perUser?.iOwe ?? 0;
        if (iOwe <= 0) {
            return {
                success: false,
                error: "You do not owe anything to settle."
            };
        }
        if (parsed.data.amount > iOwe) {
            return {
                success: false,
                error: `You only owe ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(iOwe)}. Enter at most that amount to settle.`
            };
        }
        const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseService"]();
        const { id } = await service.create(userId, parsed.data);
        const payer = await userRepo.findById(userId);
        if (!payer) {
            await service.delete(id);
            return {
                success: false,
                error: "User not found."
            };
        }
        try {
            await splitService.recordSettlementForExpense(id, userId, parsed.data.amount, parsed.data.date, payer.name, recipient.name);
        } catch (err) {
            await service.delete(id);
            return {
                success: false,
                error: err instanceof Error ? err.message : "Failed to record settlement."
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/expenses");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/splits");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/income");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/budget");
        return {
            success: true,
            id
        };
    }
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseService"]();
    const { id } = await service.create(userId, parsed.data);
    let warning;
    if (category.name.toLowerCase().trim() === "mortgage") {
        const mortgageService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageService"]();
        const recorded = await mortgageService.recordPaymentFromExpense(userId, parsed.data.amount, parsed.data.date, parsed.data.note ?? null);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/mortgage");
        if (!recorded) {
            warning = "Expense saved. Mortgage is not set up yet, so this payment was not recorded on the Mortgage page. Set up your mortgage first, then add the expense again to record it.";
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/expenses");
    return {
        success: true,
        id,
        warning
    };
}
async function updateExpense(id, formData) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$expense$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateExpenseSchema"].safeParse(formData);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.message
        };
    }
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseService"]();
    await service.update(id, Number(session.user.id), parsed.data);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/expenses");
    return {
        success: true
    };
}
async function deleteExpense(id) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    const expenseRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getExpenseRepository"])();
    const expense = await expenseRepo.findById(id);
    if (!expense) {
        return {
            success: false,
            error: "Expense not found."
        };
    }
    if (expense.splitGroupId) {
        await expenseRepo.deleteBySplitGroupId(expense.splitGroupId);
    } else {
        const settlementRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSplitSettlementRepository"])();
        const settlement = await settlementRepo.findByExpenseId(id);
        if (settlement) {
            if (settlement.incomeId != null) {
                const incomeRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getIncomeRepository"])();
                await incomeRepo.delete(settlement.incomeId);
            }
            await settlementRepo.delete(settlement.id);
        }
        const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseService"]();
        await service.delete(id);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/expenses");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/splits");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/income");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/budget");
    return {
        success: true
    };
}
async function addSplitExpense(formData) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$split$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createSplitExpenseSchema"].safeParse(formData);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.message
        };
    }
    const userId = Number(session.user.id);
    const userRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUserRepository"])();
    const userRow = await userRepo.findById(userId);
    if (!userRow) {
        return {
            success: false,
            error: "Session expired. Please sign in again."
        };
    }
    const categoryRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCategoryRepository"])();
    const categoryRow = await categoryRepo.findById(parsed.data.categoryId);
    if (!categoryRow) {
        return {
            success: false,
            error: "Invalid category. Please refresh the page."
        };
    }
    const splitService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$split$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SplitService"]();
    try {
        const options = parsed.data.splitType === "exact" ? {
            type: "exact",
            myShareCents: parsed.data.myShareCents,
            otherShareCents: parsed.data.otherShareCents
        } : parsed.data.splitType === "full" ? {
            type: "full"
        } : {
            type: "equal"
        };
        const { id } = await splitService.createSplit(userId, parsed.data.totalAmountCents, parsed.data.categoryId, parsed.data.note ?? null, parsed.data.date, options);
        if (categoryRow.name.toLowerCase().trim() === "mortgage") {
            const mortgageService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageService"]();
            await mortgageService.recordPaymentFromExpense(userId, parsed.data.totalAmountCents, parsed.data.date, parsed.data.note ?? null);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/mortgage");
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/expenses");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/splits");
        return {
            success: true,
            id
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to create split expense."
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    addExpense,
    updateExpense,
    deleteExpense,
    addSplitExpense
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(addExpense, "40c822db22e7d87ae8a699269570099aa430a6dd07", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateExpense, "60453d5a9905c8f47870b8ae711796ab4883f0ed67", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteExpense, "40a0ce76c8c6902ea7ce59f66844471418c24daf93", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(addSplitExpense, "4062349d4b4f45421215db29d2fc0d2dd804bf3108", null);
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
"[project]/src/lib/validators/income.schema.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createIncomeSchema",
    ()=>createIncomeSchema,
    "updateIncomeSchema",
    ()=>updateIncomeSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
;
const createIncomeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    amount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "salary",
        "ad_hoc"
    ]),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional().nullable(),
    date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
const updateIncomeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    amount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().optional(),
    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "salary",
        "ad_hoc"
    ]).optional(),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional().nullable(),
    date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
}),
"[project]/src/lib/actions/income.actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"409fa4df5a2b1f2535740a5211bce0525eef992953":"addIncome","40b78a12442ef1205510180602711caab0c7cba6d0":"deleteIncome","60825aedef4a99bf7e0ac4cd3f216b8b1b4338e7f5":"updateIncome"},"",""] */ __turbopack_context__.s([
    "addIncome",
    ()=>addIncome,
    "deleteIncome",
    ()=>deleteIncome,
    "updateIncome",
    ()=>updateIncome
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$income$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/income.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$income$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/validators/income.schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
async function addIncome(formData) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$income$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createIncomeSchema"].safeParse(formData);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.message
        };
    }
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$income$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IncomeService"]();
    const { id } = await service.create(Number(session.user.id), parsed.data);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/income");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/budget");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/summary");
    return {
        success: true,
        id
    };
}
async function updateIncome(id, formData) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$income$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateIncomeSchema"].safeParse(formData);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.message
        };
    }
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$income$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IncomeService"]();
    await service.update(id, parsed.data);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/income");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/budget");
    return {
        success: true
    };
}
async function deleteIncome(id) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$income$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IncomeService"]();
    await service.delete(id);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/income");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/budget");
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    addIncome,
    updateIncome,
    deleteIncome
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(addIncome, "409fa4df5a2b1f2535740a5211bce0525eef992953", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateIncome, "60825aedef4a99bf7e0ac4cd3f216b8b1b4338e7f5", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteIncome, "40b78a12442ef1205510180602711caab0c7cba6d0", null);
}),
"[project]/.next-internal/server/app/(app)/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/lib/actions/expense.actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE2 => \"[project]/src/lib/actions/income.actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$expense$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/actions/expense.actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$income$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/actions/income.actions.ts [app-rsc] (ecmascript)");
;
;
;
;
}),
"[project]/.next-internal/server/app/(app)/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/lib/actions/expense.actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE2 => \"[project]/src/lib/actions/income.actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00b01c9369bedf31201292072164b5c2535c7a203f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["$$RSC_SERVER_ACTION_0"],
    "4062349d4b4f45421215db29d2fc0d2dd804bf3108",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$expense$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addSplitExpense"],
    "409fa4df5a2b1f2535740a5211bce0525eef992953",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$income$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addIncome"],
    "40c822db22e7d87ae8a699269570099aa430a6dd07",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$expense$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addExpense"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$app$292f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$src$2f$lib$2f$actions$2f$expense$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE2__$3d3e$__$225b$project$5d2f$src$2f$lib$2f$actions$2f$income$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(app)/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/lib/actions/expense.actions.ts [app-rsc] (ecmascript)", ACTIONS_MODULE2 => "[project]/src/lib/actions/income.actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$expense$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/actions/expense.actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$income$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/actions/income.actions.ts [app-rsc] (ecmascript)");
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
"[project]/src/components/expenses/quick-add-form.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "QuickAddForm",
    ()=>QuickAddForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const QuickAddForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call QuickAddForm() from the server but QuickAddForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/expenses/quick-add-form.tsx <module evaluation>", "QuickAddForm");
}),
"[project]/src/components/expenses/quick-add-form.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "QuickAddForm",
    ()=>QuickAddForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const QuickAddForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call QuickAddForm() from the server but QuickAddForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/expenses/quick-add-form.tsx", "QuickAddForm");
}),
"[project]/src/components/expenses/quick-add-form.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$quick$2d$add$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/expenses/quick-add-form.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$quick$2d$add$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/expenses/quick-add-form.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$quick$2d$add$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/expenses/expense-item.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExpenseItem",
    ()=>ExpenseItem
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-rsc] (ecmascript)");
;
;
;
function ExpenseItem({ expense, showOwner = false, className }) {
    const initial = expense.userName.slice(0, 1).toUpperCase();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cn"])("flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium",
                        title: expense.userName,
                        children: initial
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expense-item.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0",
                        children: [
                            showOwner && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-muted-foreground block truncate",
                                children: expense.userName
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/expense-item.tsx",
                                lineNumber: 29,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium text-sm block truncate",
                                children: expense.categoryName
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/expense-item.tsx",
                                lineNumber: 31,
                                columnNumber: 11
                            }, this),
                            expense.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-muted-foreground truncate block",
                                children: expense.note
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/expense-item.tsx",
                                lineNumber: 33,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/expenses/expense-item.tsx",
                        lineNumber: 27,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/expenses/expense-item.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "shrink-0 font-medium",
                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(expense.amount)
            }, void 0, false, {
                fileName: "[project]/src/components/expenses/expense-item.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/expenses/expense-item.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/expenses/expense-list.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExpenseList",
    ()=>ExpenseList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$item$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/expense-item.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-rsc] (ecmascript) <locals>");
;
;
;
function ExpenseList({ expenses, showOwner = false, className }) {
    const byDate = expenses.reduce((acc, e)=>{
        (acc[e.date] ??= []).push(e);
        return acc;
    }, {});
    const dates = Object.keys(byDate).sort((a, b)=>b.localeCompare(a));
    if (dates.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-muted-foreground text-sm py-6 text-center",
            role: "status",
            children: "No expenses this month."
        }, void 0, false, {
            fileName: "[project]/src/components/expenses/expense-list.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className ?? "",
        children: dates.map((date)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-xs font-medium text-muted-foreground mb-2",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(date + "T12:00:00"), "EEEE, d MMMM")
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expense-list.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-0",
                        children: byDate[date].map((expense)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$item$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseItem"], {
                                expense: expense,
                                showOwner: showOwner
                            }, expense.id, false, {
                                fileName: "[project]/src/components/expenses/expense-list.tsx",
                                lineNumber: 35,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expense-list.tsx",
                        lineNumber: 33,
                        columnNumber: 11
                    }, this)
                ]
            }, date, true, {
                fileName: "[project]/src/components/expenses/expense-list.tsx",
                lineNumber: 29,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/expenses/expense-list.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/expenses/expense-list-pagination.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "ExpenseListPagination",
    ()=>ExpenseListPagination
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ExpenseListPagination = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ExpenseListPagination() from the server but ExpenseListPagination is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/expenses/expense-list-pagination.tsx <module evaluation>", "ExpenseListPagination");
}),
"[project]/src/components/expenses/expense-list-pagination.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "ExpenseListPagination",
    ()=>ExpenseListPagination
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ExpenseListPagination = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ExpenseListPagination() from the server but ExpenseListPagination is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/expenses/expense-list-pagination.tsx", "ExpenseListPagination");
}),
"[project]/src/components/expenses/expense-list-pagination.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2d$pagination$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/expenses/expense-list-pagination.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2d$pagination$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/expenses/expense-list-pagination.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2d$pagination$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/income/income-quick-add.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "IncomeQuickAdd",
    ()=>IncomeQuickAdd
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const IncomeQuickAdd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call IncomeQuickAdd() from the server but IncomeQuickAdd is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/income/income-quick-add.tsx <module evaluation>", "IncomeQuickAdd");
}),
"[project]/src/components/income/income-quick-add.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "IncomeQuickAdd",
    ()=>IncomeQuickAdd
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const IncomeQuickAdd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call IncomeQuickAdd() from the server but IncomeQuickAdd is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/income/income-quick-add.tsx", "IncomeQuickAdd");
}),
"[project]/src/components/income/income-quick-add.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$income$2f$income$2d$quick$2d$add$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/income/income-quick-add.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$income$2f$income$2d$quick$2d$add$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/income/income-quick-add.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$income$2f$income$2d$quick$2d$add$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/income/income-list.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IncomeList",
    ()=>IncomeList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-rsc] (ecmascript) <locals>");
;
;
;
function IncomeList({ entries, className }) {
    if (entries.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-muted-foreground text-sm py-6 text-center",
            role: "status",
            children: "No income this month."
        }, void 0, false, {
            fileName: "[project]/src/components/income/income-list.tsx",
            lineNumber: 14,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
        className: `divide-y divide-border ${className ?? ""}`,
        children: entries.map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                className: "py-3 flex items-center justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium capitalize",
                                children: entry.type.replace("_", " ")
                            }, void 0, false, {
                                fileName: "[project]/src/components/income/income-list.tsx",
                                lineNumber: 25,
                                columnNumber: 13
                            }, this),
                            entry.description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm text-muted-foreground block",
                                children: entry.description
                            }, void 0, false, {
                                fileName: "[project]/src/components/income/income-list.tsx",
                                lineNumber: 27,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-muted-foreground",
                                children: [
                                    entry.userName,
                                    " - ",
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(entry.date + "T12:00:00"), "d MMM")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/income/income-list.tsx",
                                lineNumber: 29,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/income/income-list.tsx",
                        lineNumber: 24,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-medium",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(entry.amount)
                    }, void 0, false, {
                        fileName: "[project]/src/components/income/income-list.tsx",
                        lineNumber: 33,
                        columnNumber: 11
                    }, this)
                ]
            }, entry.id, true, {
                fileName: "[project]/src/components/income/income-list.tsx",
                lineNumber: 23,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/income/income-list.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/ui/collapsible-section.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CollapsibleSection",
    ()=>CollapsibleSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-rsc] (ecmascript) <export default as ChevronDown>");
;
;
function CollapsibleSection({ title, defaultOpen = false, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("details", {
        open: defaultOpen,
        className: "group rounded-lg border border-border bg-card",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("summary", {
                className: "flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground [&::-webkit-details-marker]:hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/collapsible-section.tsx",
                        lineNumber: 20,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                        className: "h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/collapsible-section.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/collapsible-section.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-t border-border px-4 py-3",
                children: children
            }, void 0, false, {
                fileName: "[project]/src/components/ui/collapsible-section.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/collapsible-section.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/(app)/dashboard/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/expense.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$income$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/income.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$split$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/split.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/date.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$month$2d$navigator$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/month-navigator.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$quick$2d$add$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/quick-add-form.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/expense-list.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2d$pagination$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/expense-list-pagination.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$income$2f$income$2d$quick$2d$add$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/income/income-quick-add.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$income$2f$income$2d$list$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/income/income-list.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2d$section$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/collapsible-section.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const EXPENSE_PAGE_SIZE = 15;
async function DashboardPage({ searchParams }) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) return null;
    const userId = Number(session.user.id);
    const { month: monthParam, page: pageParam } = await searchParams;
    const month = monthParam ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCurrentMonth"])();
    const page = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);
    const categoryRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCategoryRepository"])();
    const userRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUserRepository"])();
    const expenseService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$expense$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseService"]();
    const incomeService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$income$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IncomeService"]();
    const [categories, otherUsers, expensePage, incomeResult, splitBalance] = await Promise.all([
        categoryRepo.findAll(),
        userRepo.findAllExcept(userId),
        expenseService.getByMonthPaginated(month, page, EXPENSE_PAGE_SIZE, userId),
        incomeService.getByMonth(month),
        new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$split$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SplitService"]().getBalance(userId)
    ]);
    const otherUserName = otherUsers[0]?.name;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "p-4 space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$month$2d$navigator$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MonthNavigator"], {}, void 0, false, {
                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            splitBalance.net !== 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                    href: "/splits",
                    className: "block rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm hover:bg-accent/50",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-muted-foreground",
                            children: "Split balance: "
                        }, void 0, false, {
                            fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                            lineNumber: 53,
                            columnNumber: 13
                        }, this),
                        splitBalance.net > 0 ? `You are owed ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(splitBalance.net)}` : `You owe ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(-splitBalance.net)}`
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                    lineNumber: 49,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                lineNumber: 48,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "sr-only",
                        children: "Quick add expense"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 61,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$quick$2d$add$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["QuickAddForm"], {
                        categories: categories,
                        userId: userId,
                        otherUserName: otherUserName
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 62,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2d$section$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CollapsibleSection"], {
                title: "Recent expenses",
                defaultOpen: true,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseList"], {
                        expenses: expensePage.expenses
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 65,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2d$pagination$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExpenseListPagination"], {
                        month: month,
                        page: expensePage.page,
                        totalPages: expensePage.totalPages,
                        total: expensePage.total,
                        pageSize: EXPENSE_PAGE_SIZE
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 66,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2d$section$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CollapsibleSection"], {
                title: "Income this month",
                defaultOpen: false,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-muted-foreground mb-2",
                        children: [
                            "Total: ",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(incomeResult.totals.overall),
                            ". Add income below to budget it."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$income$2f$income$2d$list$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IncomeList"], {
                                entries: [
                                    ...incomeResult.entries
                                ].sort((a, b)=>b.date.localeCompare(a.date))
                            }, void 0, false, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$income$2f$income$2d$quick$2d$add$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IncomeQuickAdd"], {
                                month: month
                            }, void 0, false, {
                                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                                lineNumber: 82,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                        lineNumber: 78,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/dashboard/page.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(app)/dashboard/page.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/(app)/dashboard/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(app)/dashboard/page.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__9ecd448e._.js.map