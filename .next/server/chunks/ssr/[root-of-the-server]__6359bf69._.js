module.exports = [
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
"[project]/src/lib/validators/mortgage.schema.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "extraPaymentSchema",
    ()=>extraPaymentSchema,
    "mortgageConfigSchema",
    ()=>mortgageConfigSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
;
const mortgageConfigSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    propertyValue: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    loanAmount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    annualInterestRate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0.001).max(100),
    loanTermMonths: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    startDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/),
    targetEquityUserAPct: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(1).optional(),
    users: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
        initialDeposit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0),
        baseSplitPct: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(1),
        monthlyCap: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().optional()
    })).length(2)
});
const extraPaymentSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    amount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
    paymentDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional().nullable()
});
}),
"[project]/src/lib/actions/mortgage.actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"403918708e199bb4ab212e31ca0d7a4b5396593893":"recordExtraPayment","40be10abcd9ca97cfa3594f6b5f473e1804a99c37d":"saveMortgageConfig"},"",""] */ __turbopack_context__.s([
    "recordExtraPayment",
    ()=>recordExtraPayment,
    "saveMortgageConfig",
    ()=>saveMortgageConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/mortgage.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$mortgage$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/validators/mortgage.schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
async function saveMortgageConfig(data) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) return {
        success: false,
        error: "Unauthorized"
    };
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$mortgage$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["mortgageConfigSchema"].safeParse(data);
    if (!parsed.success) return {
        success: false,
        error: parsed.error.message
    };
    const config = {
        ...parsed.data
    };
    if (config.annualInterestRate > 1) {
        config.annualInterestRate = config.annualInterestRate / 100;
    }
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageService"]();
    await service.saveConfig(config);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/mortgage");
    return {
        success: true
    };
}
async function recordExtraPayment(data) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user?.id) return {
        success: false,
        error: "Unauthorized"
    };
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$validators$2f$mortgage$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["extraPaymentSchema"].safeParse(data);
    if (!parsed.success) return {
        success: false,
        error: parsed.error.message
    };
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageService"]();
    const result = await service.recordExtraPayment(Number(session.user.id), parsed.data.amount, parsed.data.paymentDate, parsed.data.note);
    if (!result) return {
        success: false,
        error: "No mortgage configured"
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/mortgage");
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    saveMortgageConfig,
    recordExtraPayment
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(saveMortgageConfig, "40be10abcd9ca97cfa3594f6b5f473e1804a99c37d", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(recordExtraPayment, "403918708e199bb4ab212e31ca0d7a4b5396593893", null);
}),
"[project]/.next-internal/server/app/(app)/mortgage/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/lib/actions/mortgage.actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$mortgage$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/actions/mortgage.actions.ts [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/.next-internal/server/app/(app)/mortgage/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/lib/actions/mortgage.actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00b01c9369bedf31201292072164b5c2535c7a203f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["$$RSC_SERVER_ACTION_0"],
    "403918708e199bb4ab212e31ca0d7a4b5396593893",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$mortgage$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["recordExtraPayment"],
    "40be10abcd9ca97cfa3594f6b5f473e1804a99c37d",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$mortgage$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["saveMortgageConfig"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$app$292f$mortgage$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$src$2f$lib$2f$actions$2f$mortgage$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(app)/mortgage/page/actions.js { ACTIONS_MODULE0 => "[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/lib/actions/mortgage.actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$header$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/header.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$mortgage$2e$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/actions/mortgage.actions.ts [app-rsc] (ecmascript)");
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
"[project]/src/components/mortgage/mortgage-setup-form.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "MortgageSetupForm",
    ()=>MortgageSetupForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const MortgageSetupForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call MortgageSetupForm() from the server but MortgageSetupForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/mortgage/mortgage-setup-form.tsx <module evaluation>", "MortgageSetupForm");
}),
"[project]/src/components/mortgage/mortgage-setup-form.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "MortgageSetupForm",
    ()=>MortgageSetupForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const MortgageSetupForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call MortgageSetupForm() from the server but MortgageSetupForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/mortgage/mortgage-setup-form.tsx", "MortgageSetupForm");
}),
"[project]/src/components/mortgage/mortgage-setup-form.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$setup$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/mortgage/mortgage-setup-form.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$setup$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/mortgage-setup-form.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$setup$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/mortgage/mortgage-summary-card.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MortgageSummaryCard",
    ()=>MortgageSummaryCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-rsc] (ecmascript)");
;
;
function MortgageSummaryCard({ monthlyBasePayment, monthlyTopUp, monthlyPaymentUserA, monthlyPaymentUserB, targetEquityUserAPct, projectedPayoffDate, equitySummary, currentBalance, projectedMonths, originalTermMonths }) {
    const totalMonthly = monthlyBasePayment + monthlyTopUp;
    const monthsSaved = originalTermMonths != null && projectedMonths != null ? Math.max(0, originalTermMonths - projectedMonths) : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-lg border p-4 space-y-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "font-semibold text-base",
                children: "At a glance"
            }, void 0, false, {
                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            currentBalance != null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-medium",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(currentBalance)
                    }, void 0, false, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 43,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground text-xs",
                        children: "What you still owe (amount left on the loan)"
                    }, void 0, false, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 44,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                lineNumber: 42,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-medium",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(totalMonthly)
                    }, void 0, false, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground text-xs",
                        children: "Total you pay per month"
                    }, void 0, false, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this),
                    monthlyTopUp > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground text-xs mt-0.5",
                        children: [
                            "Minimum: ",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(monthlyBasePayment),
                            " + extra: ",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(monthlyTopUp)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-medium",
                        children: projectedPayoffDate
                    }, void 0, false, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground text-xs",
                        children: "When you'll be done paying"
                    }, void 0, false, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this),
                    monthsSaved > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-primary font-medium text-xs mt-0.5",
                        children: [
                            "Months saved vs original term: ",
                            monthsSaved
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 60,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-4 pt-2 border-t",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: equitySummary.userA.name
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-medium",
                                children: [
                                    Math.round(equitySummary.userA.equityPct * 100),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 66,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-muted-foreground text-xs",
                                children: "Your share of the home"
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 67,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: equitySummary.userB.name
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 70,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-medium",
                                children: [
                                    Math.round(equitySummary.userB.equityPct * 100),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 71,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-muted-foreground text-xs",
                                children: "Your share of the home"
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 72,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 69,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pt-2 border-t text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-muted-foreground text-xs mb-1",
                        children: "To keep ownership fair (so you each end up with the share you agreed):"
                    }, void 0, false, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 76,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "pl-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-muted-foreground",
                                children: [
                                    equitySummary.userA.name,
                                    ": "
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 78,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(monthlyPaymentUserA)
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 77,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "pl-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-muted-foreground",
                                children: [
                                    equitySummary.userB.name,
                                    ": "
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 82,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(monthlyPaymentUserB)
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                                lineNumber: 83,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                        lineNumber: 81,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
                lineNumber: 75,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/mortgage/mortgage-summary-card.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/mortgage/equity-split-chart.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "EquitySplitChart",
    ()=>EquitySplitChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const EquitySplitChart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call EquitySplitChart() from the server but EquitySplitChart is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/mortgage/equity-split-chart.tsx <module evaluation>", "EquitySplitChart");
}),
"[project]/src/components/mortgage/equity-split-chart.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "EquitySplitChart",
    ()=>EquitySplitChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const EquitySplitChart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call EquitySplitChart() from the server but EquitySplitChart is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/mortgage/equity-split-chart.tsx", "EquitySplitChart");
}),
"[project]/src/components/mortgage/equity-split-chart.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$equity$2d$split$2d$chart$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/mortgage/equity-split-chart.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$equity$2d$split$2d$chart$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/equity-split-chart.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$equity$2d$split$2d$chart$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/mortgage/extra-payment-form.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "ExtraPaymentForm",
    ()=>ExtraPaymentForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ExtraPaymentForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ExtraPaymentForm() from the server but ExtraPaymentForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/mortgage/extra-payment-form.tsx <module evaluation>", "ExtraPaymentForm");
}),
"[project]/src/components/mortgage/extra-payment-form.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "ExtraPaymentForm",
    ()=>ExtraPaymentForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ExtraPaymentForm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ExtraPaymentForm() from the server but ExtraPaymentForm is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/mortgage/extra-payment-form.tsx", "ExtraPaymentForm");
}),
"[project]/src/components/mortgage/extra-payment-form.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$extra$2d$payment$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/mortgage/extra-payment-form.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$extra$2d$payment$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/extra-payment-form.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$extra$2d$payment$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/mortgage/mortgage-details-section.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "MortgageDetailsSection",
    ()=>MortgageDetailsSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const MortgageDetailsSection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call MortgageDetailsSection() from the server but MortgageDetailsSection is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/mortgage/mortgage-details-section.tsx <module evaluation>", "MortgageDetailsSection");
}),
"[project]/src/components/mortgage/mortgage-details-section.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "MortgageDetailsSection",
    ()=>MortgageDetailsSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const MortgageDetailsSection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call MortgageDetailsSection() from the server but MortgageDetailsSection is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/mortgage/mortgage-details-section.tsx", "MortgageDetailsSection");
}),
"[project]/src/components/mortgage/mortgage-details-section.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$details$2d$section$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/mortgage/mortgage-details-section.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$details$2d$section$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/mortgage-details-section.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$details$2d$section$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/mortgage/mortgage-payments-list.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MortgagePaymentsList",
    ()=>MortgagePaymentsList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-rsc] (ecmascript)");
;
;
function MortgagePaymentsList({ payments, userNameById }) {
    const sorted = [
        ...payments
    ].sort((a, b)=>b.paymentDate.localeCompare(a.paymentDate) || b.id - a.id);
    if (sorted.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-lg border p-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "font-semibold text-base mb-2",
                    children: "Payments made"
                }, void 0, false, {
                    fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                    lineNumber: 17,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-muted-foreground",
                    children: "No payments recorded yet. Set up your mortgage first (see form in More details below if needed). Then add an expense with category Mortgage on the Expenses page; it will appear here."
                }, void 0, false, {
                    fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
            lineNumber: 16,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-lg border p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "font-semibold text-base mb-2",
                children: "Payments made"
            }, void 0, false, {
                fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "space-y-2 text-sm",
                children: sorted.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border/50 pb-2 last:border-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-muted-foreground",
                                children: p.paymentDate
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                                lineNumber: 32,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatRand"])(p.amount)
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                                lineNumber: 33,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-muted-foreground",
                                children: userNameById.get(p.userId) ?? `User ${p.userId}`
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                                lineNumber: 34,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-muted-foreground",
                                children: p.isExtraPayment ? "Extra" : "Payment"
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                                lineNumber: 35,
                                columnNumber: 13
                            }, this),
                            p.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "w-full text-xs text-muted-foreground truncate",
                                title: p.note,
                                children: p.note
                            }, void 0, false, {
                                fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                                lineNumber: 38,
                                columnNumber: 24
                            }, this)
                        ]
                    }, p.id, true, {
                        fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                        lineNumber: 31,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/mortgage/mortgage-payments-list.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/(app)/mortgage/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MortgagePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repositories/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/services/mortgage.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$setup$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/mortgage-setup-form.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$summary$2d$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/mortgage-summary-card.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$equity$2d$split$2d$chart$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/equity-split-chart.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$extra$2d$payment$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/extra-payment-form.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$details$2d$section$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/mortgage-details-section.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$payments$2d$list$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/mortgage/mortgage-payments-list.tsx [app-rsc] (ecmascript)");
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
async function MortgagePage() {
    const service = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$mortgage$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageService"]();
    const { config, userConfigs } = await service.getConfig();
    const userRepo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repositories$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUserRepository"])();
    const userRows = await userRepo.findAll();
    const usersForForm = userRows.map((u)=>({
            id: u.id,
            name: u.name
        }));
    if (!config) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-4 space-y-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-xl font-semibold",
                    children: "Mortgage"
                }, void 0, false, {
                    fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                    lineNumber: 22,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-muted-foreground",
                    children: "Set up your mortgage to track equity and payments."
                }, void 0, false, {
                    fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                    lineNumber: 23,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$setup$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageSetupForm"], {
                    users: usersForForm
                }, void 0, false, {
                    fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                    lineNumber: 24,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(app)/mortgage/page.tsx",
            lineNumber: 21,
            columnNumber: 7
        }, this);
    }
    const [schedule, payments] = await Promise.all([
        service.getSchedule(),
        service.getPayments(config.id)
    ]);
    if (!schedule) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-xl font-semibold",
                    children: "Mortgage"
                }, void 0, false, {
                    fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                    lineNumber: 36,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-muted-foreground",
                    children: "Unable to load schedule. Check that two users are configured."
                }, void 0, false, {
                    fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                    lineNumber: 37,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(app)/mortgage/page.tsx",
            lineNumber: 35,
            columnNumber: 7
        }, this);
    }
    const userNameById = new Map(usersForForm.map((u)=>[
            u.id,
            u.name
        ]));
    const currentBalance = schedule.schedule.length > 0 ? schedule.schedule[schedule.schedule.length - 1].closingBalance : config.loanAmount;
    const uc0 = userConfigs.find((c)=>c.userId === usersForForm[0]?.id);
    const uc1 = userConfigs.find((c)=>c.userId === usersForForm[1]?.id);
    const targetPct = config.targetEquityUserAPct ?? 0.5;
    const mortgageInitialValues = uc0 && uc1 ? {
        propertyValue: String(Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fromMinorUnits"])(config.propertyValue))),
        loanAmount: String(Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fromMinorUnits"])(config.loanAmount))),
        annualRate: config.annualInterestRate <= 1 ? String(Math.round(config.annualInterestRate * 1000) / 10) : String(config.annualInterestRate),
        termYears: String(Math.floor(config.loanTermMonths / 12)),
        startDate: config.startDate,
        targetEquityPct: String(Math.round(targetPct * 100)),
        user1Deposit: String(Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fromMinorUnits"])(uc0.initialDeposit))),
        user1Split: String(Math.round(uc0.baseSplitPct * 100)),
        user1Cap: uc0.monthlyCap != null ? String(Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fromMinorUnits"])(uc0.monthlyCap))) : "",
        user2Deposit: String(Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fromMinorUnits"])(uc1.initialDeposit))),
        user2Split: String(Math.round(uc1.baseSplitPct * 100)),
        user2Cap: uc1.monthlyCap != null ? String(Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fromMinorUnits"])(uc1.monthlyCap))) : ""
    } : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "p-4 space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-xl font-semibold",
                children: "Mortgage"
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$summary$2d$card$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageSummaryCard"], {
                monthlyBasePayment: schedule.monthlyBasePayment,
                monthlyTopUp: schedule.monthlyTopUp,
                monthlyPaymentUserA: schedule.monthlyPaymentUserA,
                monthlyPaymentUserB: schedule.monthlyPaymentUserB,
                targetEquityUserAPct: schedule.targetEquityUserAPct,
                projectedPayoffDate: schedule.projectedPayoffDate,
                equitySummary: schedule.equitySummary,
                currentBalance: currentBalance,
                projectedMonths: schedule.projectedMonths,
                originalTermMonths: config.loanTermMonths
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                lineNumber: 75,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$payments$2d$list$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgagePaymentsList"], {
                payments: payments,
                userNameById: userNameById
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                lineNumber: 87,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$extra$2d$payment$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExtraPaymentForm"], {}, void 0, false, {
                fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                lineNumber: 88,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "font-semibold mb-1",
                        children: "How your shares change over time"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground mb-2",
                        children: "This shows how each person's share of the home grows as you pay."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                        lineNumber: 91,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$equity$2d$split$2d$chart$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EquitySplitChart"], {
                        schedule: schedule.schedule,
                        userAName: schedule.equitySummary.userA.name,
                        userBName: schedule.equitySummary.userB.name
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                        lineNumber: 94,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                lineNumber: 89,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$mortgage$2f$mortgage$2d$details$2d$section$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MortgageDetailsSection"], {
                schedule: schedule.schedule,
                userAName: schedule.equitySummary.userA.name,
                userBName: schedule.equitySummary.userB.name,
                users: usersForForm,
                initialValues: mortgageInitialValues
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/mortgage/page.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(app)/mortgage/page.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/(app)/mortgage/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(app)/mortgage/page.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6359bf69._.js.map