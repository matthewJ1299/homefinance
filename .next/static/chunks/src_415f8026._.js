(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/ui/button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
const Button = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = (param, ref)=>{
    let { className, variant = "default", size = "default", ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90", variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90", variant === "outline" && "border border-input bg-background hover:bg-accent", variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80", variant === "ghost" && "hover:bg-accent", variant === "link" && "text-primary underline-offset-4 hover:underline", size === "default" && "h-10 px-4 py-2", size === "sm" && "h-9 rounded-md px-3", size === "lg" && "h-11 rounded-md px-8", size === "icon" && "h-10 w-10", className),
        ref: ref,
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/button.tsx",
        lineNumber: 13,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = Button;
Button.displayName = "Button";
;
var _c, _c1;
__turbopack_context__.k.register(_c, "Button$React.forwardRef");
__turbopack_context__.k.register(_c1, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/date.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/subMonths.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addMonths.js [app-client] (ecmascript)");
;
function getCurrentMonth() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(), "yyyy-MM");
}
function formatMonth(month) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, "MMMM yyyy");
}
function prevMonth(month) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subMonths$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subMonths"])(d, 1), "yyyy-MM");
}
function nextMonth(month) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addMonths"])(d, 1), "yyyy-MM");
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/hooks/use-month-navigation.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMonthNavigation",
    ()=>useMonthNavigation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/date.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function useMonthNavigation() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    var _searchParams_get;
    const month = (_searchParams_get = searchParams.get("month")) !== null && _searchParams_get !== void 0 ? _searchParams_get : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentMonth"])();
    const setMonth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMonthNavigation.useCallback[setMonth]": (newMonth)=>{
            const params = new URLSearchParams(searchParams.toString());
            params.set("month", newMonth);
            router.push("?".concat(params.toString()));
        }
    }["useMonthNavigation.useCallback[setMonth]"], [
        router,
        searchParams
    ]);
    const goPrev = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMonthNavigation.useCallback[goPrev]": ()=>{
            setMonth((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["prevMonth"])(month));
        }
    }["useMonthNavigation.useCallback[goPrev]"], [
        month,
        setMonth
    ]);
    const goNext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMonthNavigation.useCallback[goNext]": ()=>{
            setMonth((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["nextMonth"])(month));
        }
    }["useMonthNavigation.useCallback[goNext]"], [
        month,
        setMonth
    ]);
    const label = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMonth"])(month);
    const canGoNext = month < (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$date$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentMonth"])(); // allow future? plan says month-by-month navigation
    return {
        month,
        setMonth,
        goPrev,
        goNext,
        label,
        canGoNext
    };
}
_s(useMonthNavigation, "n16uPP0qX79PBZOKvW1/LNJ5b8k=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/layout/month-navigator.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MonthNavigator",
    ()=>MonthNavigator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-left.js [app-client] (ecmascript) <export default as ChevronLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-client] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$month$2d$navigation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/use-month-navigation.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function MonthNavigator(param) {
    let { className } = param;
    _s();
    const { label, goPrev, goNext } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$month$2d$navigation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMonthNavigation"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-between gap-2 ".concat(className !== null && className !== void 0 ? className : ""),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                variant: "outline",
                size: "icon",
                onClick: goPrev,
                "aria-label": "Previous month",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__["ChevronLeft"], {
                    className: "h-4 w-4"
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/month-navigator.tsx",
                    lineNumber: 16,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/layout/month-navigator.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "font-medium min-w-[140px] text-center",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/layout/month-navigator.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                variant: "outline",
                size: "icon",
                onClick: goNext,
                "aria-label": "Next month",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                    className: "h-4 w-4"
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/month-navigator.tsx",
                    lineNumber: 20,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/layout/month-navigator.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/month-navigator.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_s(MonthNavigator, "l4Rf2LbbkSYyqwkK9IfI3zAIdl4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$month$2d$navigation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMonthNavigation"]
    ];
});
_c = MonthNavigator;
var _c;
__turbopack_context__.k.register(_c, "MonthNavigator");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/expenses-view.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Server-safe utilities for expenses view (URL param parsing).
 * No "use client" - safe to import and call from Server Components.
 */ __turbopack_context__.s([
    "parseExpensesView",
    ()=>parseExpensesView
]);
function parseExpensesView(viewParam, currentUserId) {
    if (!viewParam || viewParam === "me") return "me";
    if (viewParam === "combined") return "combined";
    const id = parseInt(viewParam, 10);
    if (Number.isNaN(id) || id < 1) return "me";
    return id;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/expenses/expenses-view-toggle.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExpensesViewToggle",
    ()=>ExpensesViewToggle,
    "parseExpensesView",
    ()=>parseExpensesView,
    "viewToUserId",
    ()=>viewToUserId
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$expenses$2d$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/expenses-view.ts [app-client] (ecmascript)");
"use client";
;
;
function ExpensesViewToggle(param) {
    let { currentView, currentUserId, users, onViewChange, className = "" } = param;
    const isActive = (v)=>{
        if (typeof currentView === "number" && typeof v === "number") return currentView === v;
        return currentView === v;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        className: "flex flex-wrap gap-1 border rounded-lg p-1 bg-muted/50 ".concat(className),
        "aria-label": "Filter by user",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>onViewChange("me"),
                className: "px-3 py-1.5 rounded-md text-sm font-medium transition-colors ".concat(isActive("me") ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"),
                children: "My expenses"
            }, void 0, false, {
                fileName: "[project]/src/components/expenses/expenses-view-toggle.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this),
            users.filter((u)=>u.id !== currentUserId).map((u)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    onClick: ()=>onViewChange(u.id),
                    className: "px-3 py-1.5 rounded-md text-sm font-medium transition-colors ".concat(isActive(u.id) ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"),
                    children: [
                        u.name,
                        "'s expenses"
                    ]
                }, u.id, true, {
                    fileName: "[project]/src/components/expenses/expenses-view-toggle.tsx",
                    lineNumber: 45,
                    columnNumber: 11
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>onViewChange("combined"),
                className: "px-3 py-1.5 rounded-md text-sm font-medium transition-colors ".concat(isActive("combined") ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"),
                children: "Combined"
            }, void 0, false, {
                fileName: "[project]/src/components/expenses/expenses-view-toggle.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/expenses/expenses-view-toggle.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
_c = ExpensesViewToggle;
const parseExpensesView = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$expenses$2d$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseExpensesView"];
function viewToUserId(view, currentUserId) {
    if (view === "combined") return undefined;
    if (view === "me") return currentUserId;
    return view;
}
var _c;
__turbopack_context__.k.register(_c, "ExpensesViewToggle");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/currency.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/expenses/expense-item.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExpenseItem",
    ()=>ExpenseItem
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
function ExpenseItem(param) {
    let { expense, showOwner = false, className } = param;
    const initial = expense.userName.slice(0, 1).toUpperCase();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium",
                        title: expense.userName,
                        children: initial
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expense-item.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0",
                        children: [
                            showOwner && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-muted-foreground block truncate",
                                children: expense.userName
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/expense-item.tsx",
                                lineNumber: 29,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium text-sm block truncate",
                                children: expense.categoryName
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/expense-item.tsx",
                                lineNumber: 31,
                                columnNumber: 11
                            }, this),
                            expense.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "shrink-0 font-medium",
                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRand"])(expense.amount)
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
_c = ExpenseItem;
var _c;
__turbopack_context__.k.register(_c, "ExpenseItem");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/expenses/expense-list.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExpenseList",
    ()=>ExpenseList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$item$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/expense-item.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-client] (ecmascript) <locals>");
;
;
;
function ExpenseList(param) {
    let { expenses, showOwner = false, className } = param;
    const byDate = expenses.reduce((acc, e)=>{
        var _acc, _e_date;
        var _;
        ((_ = (_acc = acc)[_e_date = e.date]) !== null && _ !== void 0 ? _ : _acc[_e_date] = []).push(e);
        return acc;
    }, {});
    const dates = Object.keys(byDate).sort((a, b)=>b.localeCompare(a));
    if (dates.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-muted-foreground text-sm py-6 text-center",
            role: "status",
            children: "No expenses this month."
        }, void 0, false, {
            fileName: "[project]/src/components/expenses/expense-list.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className !== null && className !== void 0 ? className : "",
        children: dates.map((date)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-xs font-medium text-muted-foreground mb-2",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(date + "T12:00:00"), "EEEE, d MMMM")
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expense-list.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-0",
                        children: byDate[date].map((expense)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$item$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ExpenseItem"], {
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
_c = ExpenseList;
var _c;
__turbopack_context__.k.register(_c, "ExpenseList");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/actions/data:b2b2b6 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40c822db22e7d87ae8a699269570099aa430a6dd07":"addExpense"},"src/lib/actions/expense.actions.ts",""] */ __turbopack_context__.s([
    "addExpense",
    ()=>addExpense
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var addExpense = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("40c822db22e7d87ae8a699269570099aa430a6dd07", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "addExpense"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vZXhwZW5zZS5hY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHNlcnZlclwiO1xyXG5cclxuaW1wb3J0IHsgcmV2YWxpZGF0ZVBhdGggfSBmcm9tIFwibmV4dC9jYWNoZVwiO1xyXG5pbXBvcnQgeyBhdXRoIH0gZnJvbSBcIkAvbGliL2F1dGhcIjtcclxuaW1wb3J0IHsgRXhwZW5zZVNlcnZpY2UgfSBmcm9tIFwiQC9saWIvc2VydmljZXMvZXhwZW5zZS5zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFNwbGl0U2VydmljZSB9IGZyb20gXCJAL2xpYi9zZXJ2aWNlcy9zcGxpdC5zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IE1vcnRnYWdlU2VydmljZSB9IGZyb20gXCJAL2xpYi9zZXJ2aWNlcy9tb3J0Z2FnZS5zZXJ2aWNlXCI7XHJcbmltcG9ydCB7XHJcbiAgZ2V0RXhwZW5zZVJlcG9zaXRvcnksXHJcbiAgZ2V0Q2F0ZWdvcnlSZXBvc2l0b3J5LFxyXG4gIGdldFVzZXJSZXBvc2l0b3J5LFxyXG4gIGdldFNwbGl0U2V0dGxlbWVudFJlcG9zaXRvcnksXHJcbiAgZ2V0SW5jb21lUmVwb3NpdG9yeSxcclxufSBmcm9tIFwiQC9saWIvcmVwb3NpdG9yaWVzXCI7XHJcbmltcG9ydCB7IGNyZWF0ZUV4cGVuc2VTY2hlbWEsIHVwZGF0ZUV4cGVuc2VTY2hlbWEgfSBmcm9tIFwiQC9saWIvdmFsaWRhdG9ycy9leHBlbnNlLnNjaGVtYVwiO1xyXG5pbXBvcnQgeyBjcmVhdGVTcGxpdEV4cGVuc2VTY2hlbWEgfSBmcm9tIFwiQC9saWIvdmFsaWRhdG9ycy9zcGxpdC5zY2hlbWFcIjtcclxuaW1wb3J0IHsgZm9ybWF0UmFuZCB9IGZyb20gXCJAL2xpYi91dGlscy9jdXJyZW5jeVwiO1xyXG5cclxuZXhwb3J0IHR5cGUgRXhwZW5zZUFjdGlvblJlc3VsdCA9XHJcbiAgfCB7IHN1Y2Nlc3M6IHRydWU7IGlkPzogbnVtYmVyOyB3YXJuaW5nPzogc3RyaW5nIH1cclxuICB8IHsgc3VjY2VzczogZmFsc2U7IGVycm9yOiBzdHJpbmcgfTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRFeHBlbnNlKGZvcm1EYXRhOiB7XHJcbiAgY2F0ZWdvcnlJZDogbnVtYmVyO1xyXG4gIGFtb3VudDogbnVtYmVyO1xyXG4gIG5vdGU/OiBzdHJpbmcgfCBudWxsO1xyXG4gIGRhdGU6IHN0cmluZztcclxufSk6IFByb21pc2U8RXhwZW5zZUFjdGlvblJlc3VsdD4ge1xyXG4gIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBhdXRoKCk7XHJcbiAgaWYgKCFzZXNzaW9uPy51c2VyPy5pZCkge1xyXG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XHJcbiAgfVxyXG4gIGNvbnN0IHVzZXJJZCA9IE51bWJlcihzZXNzaW9uLnVzZXIuaWQpO1xyXG4gIGNvbnN0IHBhcnNlZCA9IGNyZWF0ZUV4cGVuc2VTY2hlbWEuc2FmZVBhcnNlKGZvcm1EYXRhKTtcclxuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHBhcnNlZC5lcnJvci5tZXNzYWdlIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCB1c2VyUmVwbyA9IGdldFVzZXJSZXBvc2l0b3J5KCk7XHJcbiAgY29uc3QgdXNlclJvdyA9IGF3YWl0IHVzZXJSZXBvLmZpbmRCeUlkKHVzZXJJZCk7XHJcbiAgaWYgKCF1c2VyUm93KSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiU2Vzc2lvbiBleHBpcmVkLiBQbGVhc2Ugc2lnbiBpbiBhZ2Fpbi5cIiB9O1xyXG4gIH1cclxuICBjb25zdCBjYXRlZ29yeVJlcG8gPSBnZXRDYXRlZ29yeVJlcG9zaXRvcnkoKTtcclxuICBjb25zdCBjYXRlZ29yeSA9IGF3YWl0IGNhdGVnb3J5UmVwby5maW5kQnlJZChwYXJzZWQuZGF0YS5jYXRlZ29yeUlkKTtcclxuICBpZiAoIWNhdGVnb3J5KSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiSW52YWxpZCBjYXRlZ29yeS4gUGxlYXNlIHJlZnJlc2ggdGhlIHBhZ2UuXCIgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGlzU3BsaXRzU2V0dGxlbWVudCA9IGNhdGVnb3J5Lm5hbWUgPT09IFwiU3BsaXRzXCI7XHJcbiAgaWYgKGlzU3BsaXRzU2V0dGxlbWVudCkge1xyXG4gICAgY29uc3Qgc3BsaXRTZXJ2aWNlID0gbmV3IFNwbGl0U2VydmljZSgpO1xyXG4gICAgY29uc3QgYmFsYW5jZSA9IGF3YWl0IHNwbGl0U2VydmljZS5nZXRCYWxhbmNlKHVzZXJJZCk7XHJcbiAgICBjb25zdCBvdGhlclVzZXJzID0gYXdhaXQgdXNlclJlcG8uZmluZEFsbEV4Y2VwdCh1c2VySWQpO1xyXG4gICAgaWYgKG90aGVyVXNlcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBvdGhlciB1c2VyIHRvIHNldHRsZSB3aXRoLlwiIH07XHJcbiAgICB9XHJcbiAgICBjb25zdCByZWNpcGllbnQgPSBvdGhlclVzZXJzWzBdO1xyXG4gICAgY29uc3QgcGVyVXNlciA9IGJhbGFuY2UucGVyVXNlci5maW5kKCh1KSA9PiB1LnVzZXJJZCA9PT0gcmVjaXBpZW50LmlkKTtcclxuICAgIGNvbnN0IGlPd2UgPSBwZXJVc2VyPy5pT3dlID8/IDA7XHJcbiAgICBpZiAoaU93ZSA8PSAwKSB7XHJcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJZb3UgZG8gbm90IG93ZSBhbnl0aGluZyB0byBzZXR0bGUuXCIgfTtcclxuICAgIH1cclxuICAgIGlmIChwYXJzZWQuZGF0YS5hbW91bnQgPiBpT3dlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6IGBZb3Ugb25seSBvd2UgJHtmb3JtYXRSYW5kKGlPd2UpfS4gRW50ZXIgYXQgbW9zdCB0aGF0IGFtb3VudCB0byBzZXR0bGUuYCxcclxuICAgICAgfTtcclxuICAgIH1cclxuICAgIGNvbnN0IHNlcnZpY2UgPSBuZXcgRXhwZW5zZVNlcnZpY2UoKTtcclxuICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IHNlcnZpY2UuY3JlYXRlKHVzZXJJZCwgcGFyc2VkLmRhdGEpO1xyXG4gICAgY29uc3QgcGF5ZXIgPSBhd2FpdCB1c2VyUmVwby5maW5kQnlJZCh1c2VySWQpO1xyXG4gICAgaWYgKCFwYXllcikge1xyXG4gICAgICBhd2FpdCBzZXJ2aWNlLmRlbGV0ZShpZCk7XHJcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJVc2VyIG5vdCBmb3VuZC5cIiB9O1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgc3BsaXRTZXJ2aWNlLnJlY29yZFNldHRsZW1lbnRGb3JFeHBlbnNlKFxyXG4gICAgICAgIGlkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBwYXJzZWQuZGF0YS5hbW91bnQsXHJcbiAgICAgICAgcGFyc2VkLmRhdGEuZGF0ZSxcclxuICAgICAgICBwYXllci5uYW1lLFxyXG4gICAgICAgIHJlY2lwaWVudC5uYW1lXHJcbiAgICAgICk7XHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgYXdhaXQgc2VydmljZS5kZWxldGUoaWQpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yOiBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogXCJGYWlsZWQgdG8gcmVjb3JkIHNldHRsZW1lbnQuXCIsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgICByZXZhbGlkYXRlUGF0aChcIi9kYXNoYm9hcmRcIik7XHJcbiAgICByZXZhbGlkYXRlUGF0aChcIi9leHBlbnNlc1wiKTtcclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL3NwbGl0c1wiKTtcclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL2luY29tZVwiKTtcclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL2J1ZGdldFwiKTtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGlkIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCBzZXJ2aWNlID0gbmV3IEV4cGVuc2VTZXJ2aWNlKCk7XHJcbiAgY29uc3QgeyBpZCB9ID0gYXdhaXQgc2VydmljZS5jcmVhdGUodXNlcklkLCBwYXJzZWQuZGF0YSk7XHJcblxyXG4gIGxldCB3YXJuaW5nOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgaWYgKGNhdGVnb3J5Lm5hbWUudG9Mb3dlckNhc2UoKS50cmltKCkgPT09IFwibW9ydGdhZ2VcIikge1xyXG4gICAgY29uc3QgbW9ydGdhZ2VTZXJ2aWNlID0gbmV3IE1vcnRnYWdlU2VydmljZSgpO1xyXG4gICAgY29uc3QgcmVjb3JkZWQgPSBhd2FpdCBtb3J0Z2FnZVNlcnZpY2UucmVjb3JkUGF5bWVudEZyb21FeHBlbnNlKFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHBhcnNlZC5kYXRhLmFtb3VudCxcclxuICAgICAgcGFyc2VkLmRhdGEuZGF0ZSxcclxuICAgICAgcGFyc2VkLmRhdGEubm90ZSA/PyBudWxsXHJcbiAgICApO1xyXG4gICAgcmV2YWxpZGF0ZVBhdGgoXCIvbW9ydGdhZ2VcIik7XHJcbiAgICBpZiAoIXJlY29yZGVkKSB7XHJcbiAgICAgIHdhcm5pbmcgPVxyXG4gICAgICAgIFwiRXhwZW5zZSBzYXZlZC4gTW9ydGdhZ2UgaXMgbm90IHNldCB1cCB5ZXQsIHNvIHRoaXMgcGF5bWVudCB3YXMgbm90IHJlY29yZGVkIG9uIHRoZSBNb3J0Z2FnZSBwYWdlLiBTZXQgdXAgeW91ciBtb3J0Z2FnZSBmaXJzdCwgdGhlbiBhZGQgdGhlIGV4cGVuc2UgYWdhaW4gdG8gcmVjb3JkIGl0LlwiO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV2YWxpZGF0ZVBhdGgoXCIvZGFzaGJvYXJkXCIpO1xyXG4gIHJldmFsaWRhdGVQYXRoKFwiL2V4cGVuc2VzXCIpO1xyXG4gIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGlkLCB3YXJuaW5nIH07XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVFeHBlbnNlKFxyXG4gIGlkOiBudW1iZXIsXHJcbiAgZm9ybURhdGE6IHsgY2F0ZWdvcnlJZD86IG51bWJlcjsgYW1vdW50PzogbnVtYmVyOyBub3RlPzogc3RyaW5nIHwgbnVsbDsgZGF0ZT86IHN0cmluZyB9XHJcbik6IFByb21pc2U8RXhwZW5zZUFjdGlvblJlc3VsdD4ge1xyXG4gIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBhdXRoKCk7XHJcbiAgaWYgKCFzZXNzaW9uPy51c2VyPy5pZCkge1xyXG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XHJcbiAgfVxyXG4gIGNvbnN0IHBhcnNlZCA9IHVwZGF0ZUV4cGVuc2VTY2hlbWEuc2FmZVBhcnNlKGZvcm1EYXRhKTtcclxuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHBhcnNlZC5lcnJvci5tZXNzYWdlIH07XHJcbiAgfVxyXG4gIGNvbnN0IHNlcnZpY2UgPSBuZXcgRXhwZW5zZVNlcnZpY2UoKTtcclxuICBhd2FpdCBzZXJ2aWNlLnVwZGF0ZShpZCwgTnVtYmVyKHNlc3Npb24udXNlci5pZCksIHBhcnNlZC5kYXRhKTtcclxuICByZXZhbGlkYXRlUGF0aChcIi9kYXNoYm9hcmRcIik7XHJcbiAgcmV2YWxpZGF0ZVBhdGgoXCIvZXhwZW5zZXNcIik7XHJcbiAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlRXhwZW5zZShpZDogbnVtYmVyKTogUHJvbWlzZTxFeHBlbnNlQWN0aW9uUmVzdWx0PiB7XHJcbiAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IGF1dGgoKTtcclxuICBpZiAoIXNlc3Npb24/LnVzZXI/LmlkKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcclxuICB9XHJcbiAgY29uc3QgZXhwZW5zZVJlcG8gPSBnZXRFeHBlbnNlUmVwb3NpdG9yeSgpO1xyXG4gIGNvbnN0IGV4cGVuc2UgPSBhd2FpdCBleHBlbnNlUmVwby5maW5kQnlJZChpZCk7XHJcbiAgaWYgKCFleHBlbnNlKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRXhwZW5zZSBub3QgZm91bmQuXCIgfTtcclxuICB9XHJcbiAgaWYgKGV4cGVuc2Uuc3BsaXRHcm91cElkKSB7XHJcbiAgICBhd2FpdCBleHBlbnNlUmVwby5kZWxldGVCeVNwbGl0R3JvdXBJZChleHBlbnNlLnNwbGl0R3JvdXBJZCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGNvbnN0IHNldHRsZW1lbnRSZXBvID0gZ2V0U3BsaXRTZXR0bGVtZW50UmVwb3NpdG9yeSgpO1xyXG4gICAgY29uc3Qgc2V0dGxlbWVudCA9IGF3YWl0IHNldHRsZW1lbnRSZXBvLmZpbmRCeUV4cGVuc2VJZChpZCk7XHJcbiAgICBpZiAoc2V0dGxlbWVudCkge1xyXG4gICAgICBpZiAoc2V0dGxlbWVudC5pbmNvbWVJZCAhPSBudWxsKSB7XHJcbiAgICAgICAgY29uc3QgaW5jb21lUmVwbyA9IGdldEluY29tZVJlcG9zaXRvcnkoKTtcclxuICAgICAgICBhd2FpdCBpbmNvbWVSZXBvLmRlbGV0ZShzZXR0bGVtZW50LmluY29tZUlkKTtcclxuICAgICAgfVxyXG4gICAgICBhd2FpdCBzZXR0bGVtZW50UmVwby5kZWxldGUoc2V0dGxlbWVudC5pZCk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBzZXJ2aWNlID0gbmV3IEV4cGVuc2VTZXJ2aWNlKCk7XHJcbiAgICBhd2FpdCBzZXJ2aWNlLmRlbGV0ZShpZCk7XHJcbiAgfVxyXG4gIHJldmFsaWRhdGVQYXRoKFwiL2Rhc2hib2FyZFwiKTtcclxuICByZXZhbGlkYXRlUGF0aChcIi9leHBlbnNlc1wiKTtcclxuICByZXZhbGlkYXRlUGF0aChcIi9zcGxpdHNcIik7XHJcbiAgcmV2YWxpZGF0ZVBhdGgoXCIvaW5jb21lXCIpO1xyXG4gIHJldmFsaWRhdGVQYXRoKFwiL2J1ZGdldFwiKTtcclxuICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRTcGxpdEV4cGVuc2UoZm9ybURhdGE6IHtcclxuICBjYXRlZ29yeUlkOiBudW1iZXI7XHJcbiAgdG90YWxBbW91bnRDZW50czogbnVtYmVyO1xyXG4gIG5vdGU/OiBzdHJpbmcgfCBudWxsO1xyXG4gIGRhdGU6IHN0cmluZztcclxuICBzcGxpdFR5cGU6IFwiZXF1YWxcIiB8IFwiZnVsbFwiIHwgXCJleGFjdFwiO1xyXG4gIG15U2hhcmVDZW50cz86IG51bWJlcjtcclxuICBvdGhlclNoYXJlQ2VudHM/OiBudW1iZXI7XHJcbn0pOiBQcm9taXNlPEV4cGVuc2VBY3Rpb25SZXN1bHQ+IHtcclxuICBjb25zdCBzZXNzaW9uID0gYXdhaXQgYXV0aCgpO1xyXG4gIGlmICghc2Vzc2lvbj8udXNlcj8uaWQpIHtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJVbmF1dGhvcml6ZWRcIiB9O1xyXG4gIH1cclxuICBjb25zdCBwYXJzZWQgPSBjcmVhdGVTcGxpdEV4cGVuc2VTY2hlbWEuc2FmZVBhcnNlKGZvcm1EYXRhKTtcclxuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHBhcnNlZC5lcnJvci5tZXNzYWdlIH07XHJcbiAgfVxyXG4gIGNvbnN0IHVzZXJJZCA9IE51bWJlcihzZXNzaW9uLnVzZXIuaWQpO1xyXG4gIGNvbnN0IHVzZXJSZXBvID0gZ2V0VXNlclJlcG9zaXRvcnkoKTtcclxuICBjb25zdCB1c2VyUm93ID0gYXdhaXQgdXNlclJlcG8uZmluZEJ5SWQodXNlcklkKTtcclxuICBpZiAoIXVzZXJSb3cpIHtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJTZXNzaW9uIGV4cGlyZWQuIFBsZWFzZSBzaWduIGluIGFnYWluLlwiIH07XHJcbiAgfVxyXG4gIGNvbnN0IGNhdGVnb3J5UmVwbyA9IGdldENhdGVnb3J5UmVwb3NpdG9yeSgpO1xyXG4gIGNvbnN0IGNhdGVnb3J5Um93ID0gYXdhaXQgY2F0ZWdvcnlSZXBvLmZpbmRCeUlkKHBhcnNlZC5kYXRhLmNhdGVnb3J5SWQpO1xyXG4gIGlmICghY2F0ZWdvcnlSb3cpIHtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZhbGlkIGNhdGVnb3J5LiBQbGVhc2UgcmVmcmVzaCB0aGUgcGFnZS5cIiB9O1xyXG4gIH1cclxuICBjb25zdCBzcGxpdFNlcnZpY2UgPSBuZXcgU3BsaXRTZXJ2aWNlKCk7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IG9wdGlvbnMgPVxyXG4gICAgICBwYXJzZWQuZGF0YS5zcGxpdFR5cGUgPT09IFwiZXhhY3RcIlxyXG4gICAgICAgID8ge1xyXG4gICAgICAgICAgICB0eXBlOiBcImV4YWN0XCIgYXMgY29uc3QsXHJcbiAgICAgICAgICAgIG15U2hhcmVDZW50czogcGFyc2VkLmRhdGEubXlTaGFyZUNlbnRzISxcclxuICAgICAgICAgICAgb3RoZXJTaGFyZUNlbnRzOiBwYXJzZWQuZGF0YS5vdGhlclNoYXJlQ2VudHMhLFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIDogcGFyc2VkLmRhdGEuc3BsaXRUeXBlID09PSBcImZ1bGxcIlxyXG4gICAgICAgICAgPyB7IHR5cGU6IFwiZnVsbFwiIGFzIGNvbnN0IH1cclxuICAgICAgICAgIDogeyB0eXBlOiBcImVxdWFsXCIgYXMgY29uc3QgfTtcclxuICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IHNwbGl0U2VydmljZS5jcmVhdGVTcGxpdChcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBwYXJzZWQuZGF0YS50b3RhbEFtb3VudENlbnRzLFxyXG4gICAgICBwYXJzZWQuZGF0YS5jYXRlZ29yeUlkLFxyXG4gICAgICBwYXJzZWQuZGF0YS5ub3RlID8/IG51bGwsXHJcbiAgICAgIHBhcnNlZC5kYXRhLmRhdGUsXHJcbiAgICAgIG9wdGlvbnNcclxuICAgICk7XHJcbiAgICBpZiAoY2F0ZWdvcnlSb3cubmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PT0gXCJtb3J0Z2FnZVwiKSB7XHJcbiAgICAgIGNvbnN0IG1vcnRnYWdlU2VydmljZSA9IG5ldyBNb3J0Z2FnZVNlcnZpY2UoKTtcclxuICAgICAgYXdhaXQgbW9ydGdhZ2VTZXJ2aWNlLnJlY29yZFBheW1lbnRGcm9tRXhwZW5zZShcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgcGFyc2VkLmRhdGEudG90YWxBbW91bnRDZW50cyxcclxuICAgICAgICBwYXJzZWQuZGF0YS5kYXRlLFxyXG4gICAgICAgIHBhcnNlZC5kYXRhLm5vdGUgPz8gbnVsbFxyXG4gICAgICApO1xyXG4gICAgICByZXZhbGlkYXRlUGF0aChcIi9tb3J0Z2FnZVwiKTtcclxuICAgIH1cclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL2Rhc2hib2FyZFwiKTtcclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL2V4cGVuc2VzXCIpO1xyXG4gICAgcmV2YWxpZGF0ZVBhdGgoXCIvc3BsaXRzXCIpO1xyXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgaWQgfTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICBlcnJvcjogZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFwiRmFpbGVkIHRvIGNyZWF0ZSBzcGxpdCBleHBlbnNlLlwiLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJzU0FzQnNCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/actions/data:a85bb3 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"4062349d4b4f45421215db29d2fc0d2dd804bf3108":"addSplitExpense"},"src/lib/actions/expense.actions.ts",""] */ __turbopack_context__.s([
    "addSplitExpense",
    ()=>addSplitExpense
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var addSplitExpense = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("4062349d4b4f45421215db29d2fc0d2dd804bf3108", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "addSplitExpense"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vZXhwZW5zZS5hY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHNlcnZlclwiO1xyXG5cclxuaW1wb3J0IHsgcmV2YWxpZGF0ZVBhdGggfSBmcm9tIFwibmV4dC9jYWNoZVwiO1xyXG5pbXBvcnQgeyBhdXRoIH0gZnJvbSBcIkAvbGliL2F1dGhcIjtcclxuaW1wb3J0IHsgRXhwZW5zZVNlcnZpY2UgfSBmcm9tIFwiQC9saWIvc2VydmljZXMvZXhwZW5zZS5zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFNwbGl0U2VydmljZSB9IGZyb20gXCJAL2xpYi9zZXJ2aWNlcy9zcGxpdC5zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IE1vcnRnYWdlU2VydmljZSB9IGZyb20gXCJAL2xpYi9zZXJ2aWNlcy9tb3J0Z2FnZS5zZXJ2aWNlXCI7XHJcbmltcG9ydCB7XHJcbiAgZ2V0RXhwZW5zZVJlcG9zaXRvcnksXHJcbiAgZ2V0Q2F0ZWdvcnlSZXBvc2l0b3J5LFxyXG4gIGdldFVzZXJSZXBvc2l0b3J5LFxyXG4gIGdldFNwbGl0U2V0dGxlbWVudFJlcG9zaXRvcnksXHJcbiAgZ2V0SW5jb21lUmVwb3NpdG9yeSxcclxufSBmcm9tIFwiQC9saWIvcmVwb3NpdG9yaWVzXCI7XHJcbmltcG9ydCB7IGNyZWF0ZUV4cGVuc2VTY2hlbWEsIHVwZGF0ZUV4cGVuc2VTY2hlbWEgfSBmcm9tIFwiQC9saWIvdmFsaWRhdG9ycy9leHBlbnNlLnNjaGVtYVwiO1xyXG5pbXBvcnQgeyBjcmVhdGVTcGxpdEV4cGVuc2VTY2hlbWEgfSBmcm9tIFwiQC9saWIvdmFsaWRhdG9ycy9zcGxpdC5zY2hlbWFcIjtcclxuaW1wb3J0IHsgZm9ybWF0UmFuZCB9IGZyb20gXCJAL2xpYi91dGlscy9jdXJyZW5jeVwiO1xyXG5cclxuZXhwb3J0IHR5cGUgRXhwZW5zZUFjdGlvblJlc3VsdCA9XHJcbiAgfCB7IHN1Y2Nlc3M6IHRydWU7IGlkPzogbnVtYmVyOyB3YXJuaW5nPzogc3RyaW5nIH1cclxuICB8IHsgc3VjY2VzczogZmFsc2U7IGVycm9yOiBzdHJpbmcgfTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRFeHBlbnNlKGZvcm1EYXRhOiB7XHJcbiAgY2F0ZWdvcnlJZDogbnVtYmVyO1xyXG4gIGFtb3VudDogbnVtYmVyO1xyXG4gIG5vdGU/OiBzdHJpbmcgfCBudWxsO1xyXG4gIGRhdGU6IHN0cmluZztcclxufSk6IFByb21pc2U8RXhwZW5zZUFjdGlvblJlc3VsdD4ge1xyXG4gIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBhdXRoKCk7XHJcbiAgaWYgKCFzZXNzaW9uPy51c2VyPy5pZCkge1xyXG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XHJcbiAgfVxyXG4gIGNvbnN0IHVzZXJJZCA9IE51bWJlcihzZXNzaW9uLnVzZXIuaWQpO1xyXG4gIGNvbnN0IHBhcnNlZCA9IGNyZWF0ZUV4cGVuc2VTY2hlbWEuc2FmZVBhcnNlKGZvcm1EYXRhKTtcclxuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHBhcnNlZC5lcnJvci5tZXNzYWdlIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCB1c2VyUmVwbyA9IGdldFVzZXJSZXBvc2l0b3J5KCk7XHJcbiAgY29uc3QgdXNlclJvdyA9IGF3YWl0IHVzZXJSZXBvLmZpbmRCeUlkKHVzZXJJZCk7XHJcbiAgaWYgKCF1c2VyUm93KSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiU2Vzc2lvbiBleHBpcmVkLiBQbGVhc2Ugc2lnbiBpbiBhZ2Fpbi5cIiB9O1xyXG4gIH1cclxuICBjb25zdCBjYXRlZ29yeVJlcG8gPSBnZXRDYXRlZ29yeVJlcG9zaXRvcnkoKTtcclxuICBjb25zdCBjYXRlZ29yeSA9IGF3YWl0IGNhdGVnb3J5UmVwby5maW5kQnlJZChwYXJzZWQuZGF0YS5jYXRlZ29yeUlkKTtcclxuICBpZiAoIWNhdGVnb3J5KSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiSW52YWxpZCBjYXRlZ29yeS4gUGxlYXNlIHJlZnJlc2ggdGhlIHBhZ2UuXCIgfTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGlzU3BsaXRzU2V0dGxlbWVudCA9IGNhdGVnb3J5Lm5hbWUgPT09IFwiU3BsaXRzXCI7XHJcbiAgaWYgKGlzU3BsaXRzU2V0dGxlbWVudCkge1xyXG4gICAgY29uc3Qgc3BsaXRTZXJ2aWNlID0gbmV3IFNwbGl0U2VydmljZSgpO1xyXG4gICAgY29uc3QgYmFsYW5jZSA9IGF3YWl0IHNwbGl0U2VydmljZS5nZXRCYWxhbmNlKHVzZXJJZCk7XHJcbiAgICBjb25zdCBvdGhlclVzZXJzID0gYXdhaXQgdXNlclJlcG8uZmluZEFsbEV4Y2VwdCh1c2VySWQpO1xyXG4gICAgaWYgKG90aGVyVXNlcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBvdGhlciB1c2VyIHRvIHNldHRsZSB3aXRoLlwiIH07XHJcbiAgICB9XHJcbiAgICBjb25zdCByZWNpcGllbnQgPSBvdGhlclVzZXJzWzBdO1xyXG4gICAgY29uc3QgcGVyVXNlciA9IGJhbGFuY2UucGVyVXNlci5maW5kKCh1KSA9PiB1LnVzZXJJZCA9PT0gcmVjaXBpZW50LmlkKTtcclxuICAgIGNvbnN0IGlPd2UgPSBwZXJVc2VyPy5pT3dlID8/IDA7XHJcbiAgICBpZiAoaU93ZSA8PSAwKSB7XHJcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJZb3UgZG8gbm90IG93ZSBhbnl0aGluZyB0byBzZXR0bGUuXCIgfTtcclxuICAgIH1cclxuICAgIGlmIChwYXJzZWQuZGF0YS5hbW91bnQgPiBpT3dlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6IGBZb3Ugb25seSBvd2UgJHtmb3JtYXRSYW5kKGlPd2UpfS4gRW50ZXIgYXQgbW9zdCB0aGF0IGFtb3VudCB0byBzZXR0bGUuYCxcclxuICAgICAgfTtcclxuICAgIH1cclxuICAgIGNvbnN0IHNlcnZpY2UgPSBuZXcgRXhwZW5zZVNlcnZpY2UoKTtcclxuICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IHNlcnZpY2UuY3JlYXRlKHVzZXJJZCwgcGFyc2VkLmRhdGEpO1xyXG4gICAgY29uc3QgcGF5ZXIgPSBhd2FpdCB1c2VyUmVwby5maW5kQnlJZCh1c2VySWQpO1xyXG4gICAgaWYgKCFwYXllcikge1xyXG4gICAgICBhd2FpdCBzZXJ2aWNlLmRlbGV0ZShpZCk7XHJcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJVc2VyIG5vdCBmb3VuZC5cIiB9O1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgc3BsaXRTZXJ2aWNlLnJlY29yZFNldHRsZW1lbnRGb3JFeHBlbnNlKFxyXG4gICAgICAgIGlkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBwYXJzZWQuZGF0YS5hbW91bnQsXHJcbiAgICAgICAgcGFyc2VkLmRhdGEuZGF0ZSxcclxuICAgICAgICBwYXllci5uYW1lLFxyXG4gICAgICAgIHJlY2lwaWVudC5uYW1lXHJcbiAgICAgICk7XHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgYXdhaXQgc2VydmljZS5kZWxldGUoaWQpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yOiBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogXCJGYWlsZWQgdG8gcmVjb3JkIHNldHRsZW1lbnQuXCIsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgICByZXZhbGlkYXRlUGF0aChcIi9kYXNoYm9hcmRcIik7XHJcbiAgICByZXZhbGlkYXRlUGF0aChcIi9leHBlbnNlc1wiKTtcclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL3NwbGl0c1wiKTtcclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL2luY29tZVwiKTtcclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL2J1ZGdldFwiKTtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGlkIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCBzZXJ2aWNlID0gbmV3IEV4cGVuc2VTZXJ2aWNlKCk7XHJcbiAgY29uc3QgeyBpZCB9ID0gYXdhaXQgc2VydmljZS5jcmVhdGUodXNlcklkLCBwYXJzZWQuZGF0YSk7XHJcblxyXG4gIGxldCB3YXJuaW5nOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgaWYgKGNhdGVnb3J5Lm5hbWUudG9Mb3dlckNhc2UoKS50cmltKCkgPT09IFwibW9ydGdhZ2VcIikge1xyXG4gICAgY29uc3QgbW9ydGdhZ2VTZXJ2aWNlID0gbmV3IE1vcnRnYWdlU2VydmljZSgpO1xyXG4gICAgY29uc3QgcmVjb3JkZWQgPSBhd2FpdCBtb3J0Z2FnZVNlcnZpY2UucmVjb3JkUGF5bWVudEZyb21FeHBlbnNlKFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHBhcnNlZC5kYXRhLmFtb3VudCxcclxuICAgICAgcGFyc2VkLmRhdGEuZGF0ZSxcclxuICAgICAgcGFyc2VkLmRhdGEubm90ZSA/PyBudWxsXHJcbiAgICApO1xyXG4gICAgcmV2YWxpZGF0ZVBhdGgoXCIvbW9ydGdhZ2VcIik7XHJcbiAgICBpZiAoIXJlY29yZGVkKSB7XHJcbiAgICAgIHdhcm5pbmcgPVxyXG4gICAgICAgIFwiRXhwZW5zZSBzYXZlZC4gTW9ydGdhZ2UgaXMgbm90IHNldCB1cCB5ZXQsIHNvIHRoaXMgcGF5bWVudCB3YXMgbm90IHJlY29yZGVkIG9uIHRoZSBNb3J0Z2FnZSBwYWdlLiBTZXQgdXAgeW91ciBtb3J0Z2FnZSBmaXJzdCwgdGhlbiBhZGQgdGhlIGV4cGVuc2UgYWdhaW4gdG8gcmVjb3JkIGl0LlwiO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV2YWxpZGF0ZVBhdGgoXCIvZGFzaGJvYXJkXCIpO1xyXG4gIHJldmFsaWRhdGVQYXRoKFwiL2V4cGVuc2VzXCIpO1xyXG4gIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGlkLCB3YXJuaW5nIH07XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVFeHBlbnNlKFxyXG4gIGlkOiBudW1iZXIsXHJcbiAgZm9ybURhdGE6IHsgY2F0ZWdvcnlJZD86IG51bWJlcjsgYW1vdW50PzogbnVtYmVyOyBub3RlPzogc3RyaW5nIHwgbnVsbDsgZGF0ZT86IHN0cmluZyB9XHJcbik6IFByb21pc2U8RXhwZW5zZUFjdGlvblJlc3VsdD4ge1xyXG4gIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBhdXRoKCk7XHJcbiAgaWYgKCFzZXNzaW9uPy51c2VyPy5pZCkge1xyXG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH07XHJcbiAgfVxyXG4gIGNvbnN0IHBhcnNlZCA9IHVwZGF0ZUV4cGVuc2VTY2hlbWEuc2FmZVBhcnNlKGZvcm1EYXRhKTtcclxuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHBhcnNlZC5lcnJvci5tZXNzYWdlIH07XHJcbiAgfVxyXG4gIGNvbnN0IHNlcnZpY2UgPSBuZXcgRXhwZW5zZVNlcnZpY2UoKTtcclxuICBhd2FpdCBzZXJ2aWNlLnVwZGF0ZShpZCwgTnVtYmVyKHNlc3Npb24udXNlci5pZCksIHBhcnNlZC5kYXRhKTtcclxuICByZXZhbGlkYXRlUGF0aChcIi9kYXNoYm9hcmRcIik7XHJcbiAgcmV2YWxpZGF0ZVBhdGgoXCIvZXhwZW5zZXNcIik7XHJcbiAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlRXhwZW5zZShpZDogbnVtYmVyKTogUHJvbWlzZTxFeHBlbnNlQWN0aW9uUmVzdWx0PiB7XHJcbiAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IGF1dGgoKTtcclxuICBpZiAoIXNlc3Npb24/LnVzZXI/LmlkKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hdXRob3JpemVkXCIgfTtcclxuICB9XHJcbiAgY29uc3QgZXhwZW5zZVJlcG8gPSBnZXRFeHBlbnNlUmVwb3NpdG9yeSgpO1xyXG4gIGNvbnN0IGV4cGVuc2UgPSBhd2FpdCBleHBlbnNlUmVwby5maW5kQnlJZChpZCk7XHJcbiAgaWYgKCFleHBlbnNlKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiRXhwZW5zZSBub3QgZm91bmQuXCIgfTtcclxuICB9XHJcbiAgaWYgKGV4cGVuc2Uuc3BsaXRHcm91cElkKSB7XHJcbiAgICBhd2FpdCBleHBlbnNlUmVwby5kZWxldGVCeVNwbGl0R3JvdXBJZChleHBlbnNlLnNwbGl0R3JvdXBJZCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGNvbnN0IHNldHRsZW1lbnRSZXBvID0gZ2V0U3BsaXRTZXR0bGVtZW50UmVwb3NpdG9yeSgpO1xyXG4gICAgY29uc3Qgc2V0dGxlbWVudCA9IGF3YWl0IHNldHRsZW1lbnRSZXBvLmZpbmRCeUV4cGVuc2VJZChpZCk7XHJcbiAgICBpZiAoc2V0dGxlbWVudCkge1xyXG4gICAgICBpZiAoc2V0dGxlbWVudC5pbmNvbWVJZCAhPSBudWxsKSB7XHJcbiAgICAgICAgY29uc3QgaW5jb21lUmVwbyA9IGdldEluY29tZVJlcG9zaXRvcnkoKTtcclxuICAgICAgICBhd2FpdCBpbmNvbWVSZXBvLmRlbGV0ZShzZXR0bGVtZW50LmluY29tZUlkKTtcclxuICAgICAgfVxyXG4gICAgICBhd2FpdCBzZXR0bGVtZW50UmVwby5kZWxldGUoc2V0dGxlbWVudC5pZCk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBzZXJ2aWNlID0gbmV3IEV4cGVuc2VTZXJ2aWNlKCk7XHJcbiAgICBhd2FpdCBzZXJ2aWNlLmRlbGV0ZShpZCk7XHJcbiAgfVxyXG4gIHJldmFsaWRhdGVQYXRoKFwiL2Rhc2hib2FyZFwiKTtcclxuICByZXZhbGlkYXRlUGF0aChcIi9leHBlbnNlc1wiKTtcclxuICByZXZhbGlkYXRlUGF0aChcIi9zcGxpdHNcIik7XHJcbiAgcmV2YWxpZGF0ZVBhdGgoXCIvaW5jb21lXCIpO1xyXG4gIHJldmFsaWRhdGVQYXRoKFwiL2J1ZGdldFwiKTtcclxuICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRTcGxpdEV4cGVuc2UoZm9ybURhdGE6IHtcclxuICBjYXRlZ29yeUlkOiBudW1iZXI7XHJcbiAgdG90YWxBbW91bnRDZW50czogbnVtYmVyO1xyXG4gIG5vdGU/OiBzdHJpbmcgfCBudWxsO1xyXG4gIGRhdGU6IHN0cmluZztcclxuICBzcGxpdFR5cGU6IFwiZXF1YWxcIiB8IFwiZnVsbFwiIHwgXCJleGFjdFwiO1xyXG4gIG15U2hhcmVDZW50cz86IG51bWJlcjtcclxuICBvdGhlclNoYXJlQ2VudHM/OiBudW1iZXI7XHJcbn0pOiBQcm9taXNlPEV4cGVuc2VBY3Rpb25SZXN1bHQ+IHtcclxuICBjb25zdCBzZXNzaW9uID0gYXdhaXQgYXV0aCgpO1xyXG4gIGlmICghc2Vzc2lvbj8udXNlcj8uaWQpIHtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJVbmF1dGhvcml6ZWRcIiB9O1xyXG4gIH1cclxuICBjb25zdCBwYXJzZWQgPSBjcmVhdGVTcGxpdEV4cGVuc2VTY2hlbWEuc2FmZVBhcnNlKGZvcm1EYXRhKTtcclxuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSB7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHBhcnNlZC5lcnJvci5tZXNzYWdlIH07XHJcbiAgfVxyXG4gIGNvbnN0IHVzZXJJZCA9IE51bWJlcihzZXNzaW9uLnVzZXIuaWQpO1xyXG4gIGNvbnN0IHVzZXJSZXBvID0gZ2V0VXNlclJlcG9zaXRvcnkoKTtcclxuICBjb25zdCB1c2VyUm93ID0gYXdhaXQgdXNlclJlcG8uZmluZEJ5SWQodXNlcklkKTtcclxuICBpZiAoIXVzZXJSb3cpIHtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJTZXNzaW9uIGV4cGlyZWQuIFBsZWFzZSBzaWduIGluIGFnYWluLlwiIH07XHJcbiAgfVxyXG4gIGNvbnN0IGNhdGVnb3J5UmVwbyA9IGdldENhdGVnb3J5UmVwb3NpdG9yeSgpO1xyXG4gIGNvbnN0IGNhdGVnb3J5Um93ID0gYXdhaXQgY2F0ZWdvcnlSZXBvLmZpbmRCeUlkKHBhcnNlZC5kYXRhLmNhdGVnb3J5SWQpO1xyXG4gIGlmICghY2F0ZWdvcnlSb3cpIHtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJJbnZhbGlkIGNhdGVnb3J5LiBQbGVhc2UgcmVmcmVzaCB0aGUgcGFnZS5cIiB9O1xyXG4gIH1cclxuICBjb25zdCBzcGxpdFNlcnZpY2UgPSBuZXcgU3BsaXRTZXJ2aWNlKCk7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IG9wdGlvbnMgPVxyXG4gICAgICBwYXJzZWQuZGF0YS5zcGxpdFR5cGUgPT09IFwiZXhhY3RcIlxyXG4gICAgICAgID8ge1xyXG4gICAgICAgICAgICB0eXBlOiBcImV4YWN0XCIgYXMgY29uc3QsXHJcbiAgICAgICAgICAgIG15U2hhcmVDZW50czogcGFyc2VkLmRhdGEubXlTaGFyZUNlbnRzISxcclxuICAgICAgICAgICAgb3RoZXJTaGFyZUNlbnRzOiBwYXJzZWQuZGF0YS5vdGhlclNoYXJlQ2VudHMhLFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIDogcGFyc2VkLmRhdGEuc3BsaXRUeXBlID09PSBcImZ1bGxcIlxyXG4gICAgICAgICAgPyB7IHR5cGU6IFwiZnVsbFwiIGFzIGNvbnN0IH1cclxuICAgICAgICAgIDogeyB0eXBlOiBcImVxdWFsXCIgYXMgY29uc3QgfTtcclxuICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IHNwbGl0U2VydmljZS5jcmVhdGVTcGxpdChcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBwYXJzZWQuZGF0YS50b3RhbEFtb3VudENlbnRzLFxyXG4gICAgICBwYXJzZWQuZGF0YS5jYXRlZ29yeUlkLFxyXG4gICAgICBwYXJzZWQuZGF0YS5ub3RlID8/IG51bGwsXHJcbiAgICAgIHBhcnNlZC5kYXRhLmRhdGUsXHJcbiAgICAgIG9wdGlvbnNcclxuICAgICk7XHJcbiAgICBpZiAoY2F0ZWdvcnlSb3cubmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PT0gXCJtb3J0Z2FnZVwiKSB7XHJcbiAgICAgIGNvbnN0IG1vcnRnYWdlU2VydmljZSA9IG5ldyBNb3J0Z2FnZVNlcnZpY2UoKTtcclxuICAgICAgYXdhaXQgbW9ydGdhZ2VTZXJ2aWNlLnJlY29yZFBheW1lbnRGcm9tRXhwZW5zZShcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgcGFyc2VkLmRhdGEudG90YWxBbW91bnRDZW50cyxcclxuICAgICAgICBwYXJzZWQuZGF0YS5kYXRlLFxyXG4gICAgICAgIHBhcnNlZC5kYXRhLm5vdGUgPz8gbnVsbFxyXG4gICAgICApO1xyXG4gICAgICByZXZhbGlkYXRlUGF0aChcIi9tb3J0Z2FnZVwiKTtcclxuICAgIH1cclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL2Rhc2hib2FyZFwiKTtcclxuICAgIHJldmFsaWRhdGVQYXRoKFwiL2V4cGVuc2VzXCIpO1xyXG4gICAgcmV2YWxpZGF0ZVBhdGgoXCIvc3BsaXRzXCIpO1xyXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgaWQgfTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICBlcnJvcjogZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFwiRmFpbGVkIHRvIGNyZWF0ZSBzcGxpdCBleHBlbnNlLlwiLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiIyU0FnTHNCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/expenses/category-picker.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CategoryPicker",
    ()=>CategoryPicker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const RECENT_KEY = "homefinance-recent-categories";
function getRecentCategoryIds() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}
function pushRecentCategoryId(id) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const recent = getRecentCategoryIds().filter((x)=>x !== id);
        recent.unshift(id);
        const trimmed = recent.slice(0, 8);
        localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
    } catch (e) {
    // ignore
    }
}
function sortByGroupAndName(categories) {
    return [
        ...categories
    ].sort((a, b)=>a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name));
}
function PillSection(param) {
    let { label, categories, value, onSelect, className } = param;
    if (categories.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: className,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-muted-foreground mb-1.5 font-medium",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/expenses/category-picker.tsx",
                lineNumber: 61,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-2",
                children: categories.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>onSelect(c.id),
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-full px-3 py-1.5 text-sm font-medium transition-colors border", value === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"),
                        children: c.name
                    }, c.id, false, {
                        fileName: "[project]/src/components/expenses/category-picker.tsx",
                        lineNumber: 64,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/expenses/category-picker.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/expenses/category-picker.tsx",
        lineNumber: 60,
        columnNumber: 5
    }, this);
}
_c = PillSection;
function CategoryPicker(param) {
    let { categories, value, onChange, className } = param;
    _s();
    const { variable, fixed } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CategoryPicker.useMemo": ()=>{
            const variableList = sortByGroupAndName(categories.filter({
                "CategoryPicker.useMemo.variableList": (c)=>c.costType === "variable"
            }["CategoryPicker.useMemo.variableList"]));
            const fixedList = sortByGroupAndName(categories.filter({
                "CategoryPicker.useMemo.fixedList": (c)=>c.costType === "fixed"
            }["CategoryPicker.useMemo.fixedList"]));
            return {
                variable: variableList,
                fixed: fixedList
            };
        }
    }["CategoryPicker.useMemo"], [
        categories
    ]);
    const handleSelect = (id)=>{
        pushRecentCategoryId(id);
        onChange(id);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("space-y-4 pb-2", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PillSection, {
                label: "Variable costs",
                categories: variable,
                value: value,
                onSelect: handleSelect
            }, void 0, false, {
                fileName: "[project]/src/components/expenses/category-picker.tsx",
                lineNumber: 101,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PillSection, {
                label: "Fixed costs",
                categories: fixed,
                value: value,
                onSelect: handleSelect
            }, void 0, false, {
                fileName: "[project]/src/components/expenses/category-picker.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/expenses/category-picker.tsx",
        lineNumber: 100,
        columnNumber: 5
    }, this);
}
_s(CategoryPicker, "fjR81loG2FgamqZLnc2b5fsmvqo=");
_c1 = CategoryPicker;
var _c, _c1;
__turbopack_context__.k.register(_c, "PillSection");
__turbopack_context__.k.register(_c1, "CategoryPicker");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/input.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Input",
    ()=>Input
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
const Input = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = (param, ref)=>{
    let { className, type, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
        type: type,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className),
        ref: ref,
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/input.tsx",
        lineNumber: 10,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = Input;
Input.displayName = "Input";
;
var _c, _c1;
__turbopack_context__.k.register(_c, "Input$React.forwardRef");
__turbopack_context__.k.register(_c1, "Input");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/dialog.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Dialog",
    ()=>Dialog,
    "DialogFooter",
    ()=>DialogFooter,
    "DialogHeader",
    ()=>DialogHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function Dialog(param) {
    let { open, onOpenChange, children, className } = param;
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Dialog.useEffect": ()=>{
            const el = ref.current;
            if (!el) return;
            if (open) {
                el.showModal();
            } else {
                el.close();
            }
        }
    }["Dialog.useEffect"], [
        open
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Dialog.useEffect": ()=>{
            const el = ref.current;
            if (!el) return;
            const onCancel = {
                "Dialog.useEffect.onCancel": ()=>onOpenChange(false)
            }["Dialog.useEffect.onCancel"];
            el.addEventListener("cancel", onCancel);
            return ({
                "Dialog.useEffect": ()=>el.removeEventListener("cancel", onCancel)
            })["Dialog.useEffect"];
        }
    }["Dialog.useEffect"], [
        onOpenChange
    ]);
    const handleBackdropClick = (e)=>{
        if (e.target === ref.current) onOpenChange(false);
    };
    if (typeof document === "undefined") return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dialog", {
        ref: ref,
        onClick: handleBackdropClick,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fixed inset-0 z-50 max-h-[100dvh] w-full max-w-lg mx-auto rounded-lg border bg-background p-4 shadow-lg backdrop:bg-black/50", className),
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 41,
        columnNumber: 5
    }, this), document.body);
}
_s(Dialog, "lq1tzM4DdcBd9rchfALtCTAkzkA=");
_c = Dialog;
function DialogHeader(param) {
    let { children, className } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mb-4 text-sm font-medium", className),
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 56,
        columnNumber: 10
    }, this);
}
_c1 = DialogHeader;
function DialogFooter(param) {
    let { children, className } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mt-4 flex justify-end gap-2", className),
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 60,
        columnNumber: 10
    }, this);
}
_c2 = DialogFooter;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Dialog");
__turbopack_context__.k.register(_c1, "DialogHeader");
__turbopack_context__.k.register(_c2, "DialogFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/label.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Label",
    ()=>Label
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
const Label = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/label.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = Label;
Label.displayName = "Label";
;
var _c, _c1;
__turbopack_context__.k.register(_c, "Label$React.forwardRef");
__turbopack_context__.k.register(_c1, "Label");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/expenses/quick-add-form.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QuickAddForm",
    ()=>QuickAddForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$data$3a$b2b2b6__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/lib/actions/data:b2b2b6 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$data$3a$a85bb3__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/lib/actions/data:a85bb3 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$offline$2d$queue$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/use-offline-queue.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$category$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/category-picker.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/dialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/label.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
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
function QuickAddForm(param) {
    let { categories, userId, otherUserName } = param;
    var _categories_;
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { isOnline, addToQueue, syncQueue } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$offline$2d$queue$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOfflineQueue"])();
    const [isPending, startTransition] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"])();
    const [amount, setAmount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [categoryDialogOpen, setCategoryDialogOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [pendingCents, setPendingCents] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    var _categories__id;
    const [categoryId, setCategoryId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])((_categories__id = (_categories_ = categories[0]) === null || _categories_ === void 0 ? void 0 : _categories_.id) !== null && _categories__id !== void 0 ? _categories__id : null);
    const [note, setNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [date, setDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "QuickAddForm.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(), "yyyy-MM-dd")
    }["QuickAddForm.useState"]);
    const [message, setMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [errorDetail, setErrorDetail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [warningDetail, setWarningDetail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [splitEnabled, setSplitEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [splitType, setSplitType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("equal");
    const [myShareRand, setMyShareRand] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [otherShareRand, setOtherShareRand] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "QuickAddForm.useEffect": ()=>{
            if (!isOnline) return;
            syncQueue().then({
                "QuickAddForm.useEffect": ()=>router.refresh()
            }["QuickAddForm.useEffect"]);
        }
    }["QuickAddForm.useEffect"], [
        isOnline,
        syncQueue,
        router
    ]);
    const openCategoryDialog = ()=>{
        var _categories_;
        const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
        if (Number.isNaN(parsed) || parsed <= 0) return;
        setPendingCents((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toMinorUnits"])(parsed));
        var _categories__id;
        setCategoryId((_categories__id = (_categories_ = categories[0]) === null || _categories_ === void 0 ? void 0 : _categories_.id) !== null && _categories__id !== void 0 ? _categories__id : null);
        setNote("");
        setDate((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(new Date(), "yyyy-MM-dd"));
        setSplitEnabled(false);
        setSplitType("equal");
        setMyShareRand("");
        setOtherShareRand("");
        setErrorDetail(null);
        setCategoryDialogOpen(true);
    };
    const handleConfirmCategory = ()=>{
        if (pendingCents === null || !categoryId) return;
        if (splitEnabled && pendingCents > 0) {
            if (splitType === "exact") {
                const myCents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toMinorUnits"])(parseFloat(myShareRand.replace(/\s/g, "").replace(",", ".")) || 0);
                const otherCents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toMinorUnits"])(parseFloat(otherShareRand.replace(/\s/g, "").replace(",", ".")) || 0);
                if (myCents + otherCents !== pendingCents) {
                    setErrorDetail("My share + other share must equal total amount.");
                    setTimeout(()=>setErrorDetail(null), 5000);
                    return;
                }
            }
        }
        if (!isOnline) {
            if (splitEnabled) return;
            addToQueue({
                tempId: crypto.randomUUID(),
                categoryId,
                amount: pendingCents,
                note: note.trim() || undefined,
                date
            });
            setMessage("saved_offline");
            setTimeout(()=>setMessage(null), 3000);
            setAmount("");
            setCategoryDialogOpen(false);
            setPendingCents(null);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(50);
            }
            return;
        }
        startTransition(async ()=>{
            if (splitEnabled) {
                const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$data$3a$a85bb3__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["addSplitExpense"])({
                    categoryId,
                    totalAmountCents: pendingCents,
                    note: note.trim() || undefined,
                    date,
                    splitType,
                    ...splitType === "exact" && {
                        myShareCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toMinorUnits"])(parseFloat(myShareRand.replace(/\s/g, "").replace(",", ".")) || 0),
                        otherShareCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toMinorUnits"])(parseFloat(otherShareRand.replace(/\s/g, "").replace(",", ".")) || 0)
                    }
                });
                if (result.success) {
                    setAmount("");
                    setMessage("saved");
                    setErrorDetail(null);
                    setTimeout(()=>setMessage(null), 2000);
                    setCategoryDialogOpen(false);
                    setPendingCents(null);
                    router.refresh();
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                } else {
                    setMessage("error");
                    setErrorDetail("error" in result ? result.error : null);
                    setTimeout(()=>{
                        setMessage(null);
                        setErrorDetail(null);
                    }, 5000);
                }
                return;
            }
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$actions$2f$data$3a$b2b2b6__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["addExpense"])({
                categoryId,
                amount: pendingCents,
                note: note.trim() || undefined,
                date
            });
            if (result.success) {
                setAmount("");
                setMessage("saved");
                setErrorDetail(null);
                var _result_warning;
                setWarningDetail((_result_warning = result.warning) !== null && _result_warning !== void 0 ? _result_warning : null);
                setTimeout(()=>setMessage(null), 2000);
                setCategoryDialogOpen(false);
                setPendingCents(null);
                router.refresh();
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(50);
                }
            } else {
                setMessage("error");
                setErrorDetail("error" in result ? result.error : null);
                setTimeout(()=>{
                    setMessage(null);
                    setErrorDetail(null);
                }, 5000);
            }
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2 items-end",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        htmlFor: "quick-amount",
                                        className: "text-xs text-muted-foreground block mb-1",
                                        children: "Amount (R)"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                        lineNumber: 165,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        id: "quick-amount",
                                        type: "text",
                                        inputMode: "decimal",
                                        placeholder: "0.00",
                                        value: amount,
                                        onChange: (e)=>setAmount(e.target.value),
                                        onKeyDown: (e)=>{
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                openCategoryDialog();
                                            }
                                        },
                                        className: "text-lg"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                        lineNumber: 168,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 164,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                type: "button",
                                onClick: openCategoryDialog,
                                disabled: (()=>{
                                    const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
                                    return Number.isNaN(parsed) || parsed <= 0;
                                })(),
                                children: "Add"
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 184,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                        lineNumber: 163,
                        columnNumber: 9
                    }, this),
                    message === "saved" && !categoryDialogOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-primary font-medium",
                        children: "Saved."
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                        lineNumber: 196,
                        columnNumber: 11
                    }, this),
                    message === "saved_offline" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: "Saved offline. Will sync when back online."
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                        lineNumber: 199,
                        columnNumber: 11
                    }, this),
                    message === "error" && !categoryDialogOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-destructive",
                        children: errorDetail !== null && errorDetail !== void 0 ? errorDetail : "Failed to save. Try again."
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                        lineNumber: 202,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                lineNumber: 162,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
                open: categoryDialogOpen,
                onOpenChange: (open)=>{
                    setCategoryDialogOpen(open);
                    if (!open) {
                        setMessage(null);
                        setErrorDetail(null);
                        setWarningDetail(null);
                    }
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogHeader"], {
                        children: "Choose category"
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                        lineNumber: 219,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-muted-foreground block mb-1",
                                        children: "Category"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                        lineNumber: 222,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$category$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CategoryPicker"], {
                                        categories: categories,
                                        value: categoryId,
                                        onChange: setCategoryId
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                        lineNumber: 223,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 221,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                    type: "text",
                                    placeholder: "Note (optional)",
                                    value: note,
                                    onChange: (e)=>setNote(e.target.value),
                                    className: "text-sm"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                    lineNumber: 230,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 229,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                        htmlFor: "expense-date",
                                        className: "text-xs text-muted-foreground block mb-1",
                                        children: "Date"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                        lineNumber: 239,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        id: "expense-date",
                                        type: "date",
                                        value: date,
                                        onChange: (e)=>setDate(e.target.value),
                                        className: "text-sm"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                        lineNumber: 242,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 238,
                                columnNumber: 11
                            }, this),
                            isOnline && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "flex items-center gap-2 cursor-pointer",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                checked: splitEnabled,
                                                onChange: (e)=>setSplitEnabled(e.target.checked),
                                                className: "rounded border-input"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                lineNumber: 253,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm",
                                                children: "Split this expense"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                lineNumber: 259,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                        lineNumber: 252,
                                        columnNumber: 15
                                    }, this),
                                    splitEnabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pl-6 space-y-2 border-l-2 border-muted",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "flex items-center gap-2 cursor-pointer",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "radio",
                                                                name: "splitType",
                                                                checked: splitType === "equal",
                                                                onChange: ()=>setSplitType("equal")
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 265,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-sm",
                                                                children: "I paid, split equally"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 271,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                        lineNumber: 264,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "flex items-center gap-2 cursor-pointer",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "radio",
                                                                name: "splitType",
                                                                checked: splitType === "full",
                                                                onChange: ()=>setSplitType("full")
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 274,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-sm",
                                                                children: "I am owed the full amount"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 280,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                        lineNumber: 273,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "flex items-center gap-2 cursor-pointer",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "radio",
                                                                name: "splitType",
                                                                checked: splitType === "exact",
                                                                onChange: ()=>setSplitType("exact")
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 283,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-sm",
                                                                children: "Split by exact amount"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 289,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                        lineNumber: 282,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                lineNumber: 263,
                                                columnNumber: 19
                                            }, this),
                                            splitType === "exact" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-2 gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                className: "text-xs",
                                                                children: "My share (R)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 295,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                type: "text",
                                                                inputMode: "decimal",
                                                                placeholder: "0.00",
                                                                value: myShareRand,
                                                                onChange: (e)=>setMyShareRand(e.target.value),
                                                                className: "text-sm"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 296,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                        lineNumber: 294,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                                                className: "text-xs",
                                                                children: otherUserName ? "".concat(otherUserName, "'s share (R)") : "Other share (R)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 306,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                                                type: "text",
                                                                inputMode: "decimal",
                                                                placeholder: "0.00",
                                                                value: otherShareRand,
                                                                onChange: (e)=>setOtherShareRand(e.target.value),
                                                                className: "text-sm"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                                lineNumber: 307,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                        lineNumber: 305,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                                lineNumber: 293,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                        lineNumber: 262,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 251,
                                columnNumber: 13
                            }, this),
                            warningDetail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-amber-600 dark:text-amber-500",
                                children: warningDetail
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 323,
                                columnNumber: 13
                            }, this),
                            errorDetail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-destructive",
                                children: errorDetail
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 326,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                        lineNumber: 220,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogFooter"], {
                        className: "justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                variant: "outline",
                                type: "button",
                                onClick: ()=>setCategoryDialogOpen(false),
                                children: "Cancel"
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 330,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                type: "button",
                                onClick: handleConfirmCategory,
                                disabled: isPending || !categoryId || splitEnabled && splitType === "exact" && (!myShareRand || !otherShareRand),
                                children: isPending ? "Adding..." : "Add expense"
                            }, void 0, false, {
                                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                                lineNumber: 333,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                        lineNumber: 329,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/expenses/quick-add-form.tsx",
                lineNumber: 208,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(QuickAddForm, "NRCRCjGf3SvBsnkyvlFfrajWhuM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$offline$2d$queue$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOfflineQueue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"]
    ];
});
_c = QuickAddForm;
var _c;
__turbopack_context__.k.register(_c, "QuickAddForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/expenses/expenses-page-client.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExpensesPageClient",
    ()=>ExpensesPageClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expenses$2d$view$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/expenses-view-toggle.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/expense-list.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$quick$2d$add$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/expenses/quick-add-form.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currency.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function filterByView(items, view, currentUserId) {
    const userId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expenses$2d$view$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["viewToUserId"])(view, currentUserId);
    if (userId == null) return items;
    return items.filter((e)=>e.userId === userId);
}
function sumAmount(items) {
    return items.reduce((s, e)=>s + e.amount, 0);
}
function ExpensesPageClient(param) {
    let { month, currentUserId, users, categories, expenses, incomeEntries, initialView } = param;
    _s();
    const [view, setView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialView);
    const filteredExpenses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ExpensesPageClient.useMemo[filteredExpenses]": ()=>filterByView(expenses, view, currentUserId)
    }["ExpensesPageClient.useMemo[filteredExpenses]"], [
        expenses,
        view,
        currentUserId
    ]);
    const filteredIncome = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ExpensesPageClient.useMemo[filteredIncome]": ()=>filterByView(incomeEntries, view, currentUserId)
    }["ExpensesPageClient.useMemo[filteredIncome]"], [
        incomeEntries,
        view,
        currentUserId
    ]);
    const expenseTotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ExpensesPageClient.useMemo[expenseTotal]": ()=>sumAmount(filteredExpenses)
    }["ExpensesPageClient.useMemo[expenseTotal]"], [
        filteredExpenses
    ]);
    const incomeTotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ExpensesPageClient.useMemo[incomeTotal]": ()=>sumAmount(filteredIncome)
    }["ExpensesPageClient.useMemo[incomeTotal]"], [
        filteredIncome
    ]);
    const balance = incomeTotal - expenseTotal;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-xl font-semibold",
                        children: "Expenses"
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                        lineNumber: 63,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expenses$2d$view$2d$toggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ExpensesViewToggle"], {
                        currentView: view,
                        currentUserId: currentUserId,
                        users: users,
                        onViewChange: setView
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-4 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-muted-foreground",
                                        children: "Income: "
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                        lineNumber: 72,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRand"])(incomeTotal)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                        lineNumber: 73,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                lineNumber: 71,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-muted-foreground",
                                        children: "Expenses: "
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                        lineNumber: 76,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRand"])(expenseTotal)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                        lineNumber: 77,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                lineNumber: 75,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-muted-foreground",
                                        children: "Balance: "
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                        lineNumber: 80,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium ".concat(balance >= 0 ? "text-foreground" : "text-destructive"),
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRand"])(balance)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                        lineNumber: 81,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                        lineNumber: 70,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "sr-only",
                        children: "Add expense"
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$quick$2d$add$2d$form$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QuickAddForm"], {
                        categories: categories,
                        userId: currentUserId
                    }, void 0, false, {
                        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                        lineNumber: 91,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                lineNumber: 89,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$expenses$2f$expense$2d$list$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ExpenseList"], {
                expenses: filteredExpenses,
                showOwner: view === "combined"
            }, void 0, false, {
                fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
                lineNumber: 93,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/expenses/expenses-page-client.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
_s(ExpensesPageClient, "4njtv9+l07gq2yhamugIILv2QII=");
_c = ExpensesPageClient;
var _c;
__turbopack_context__.k.register(_c, "ExpensesPageClient");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_415f8026._.js.map