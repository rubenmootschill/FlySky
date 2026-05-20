(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__e8895b3c._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/lib/prisma.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$2f$default$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@prisma/client/default.js [middleware-edge] (ecmascript)");
;
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$2f$default$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PrismaClient"]({
    log: ("TURBOPACK compile-time truthy", 1) ? [
        'query',
        'error',
        'warn'
    ] : "TURBOPACK unreachable"
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
}),
"[project]/src/lib/airline-billing.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cancelSubscriptionAtPeriodEnd",
    ()=>cancelSubscriptionAtPeriodEnd,
    "createTrialSubscription",
    ()=>createTrialSubscription,
    "formatCurrency",
    ()=>formatCurrency,
    "getAirlineBillingStatus",
    ()=>getAirlineBillingStatus,
    "getAirlineSubscription",
    ()=>getAirlineSubscription,
    "getTrialDaysLeft",
    ()=>getTrialDaysLeft,
    "getTrialEndsAt",
    ()=>getTrialEndsAt,
    "isSubscriptionActive",
    ()=>isSubscriptionActive,
    "isTrialExpiringSoon",
    ()=>isTrialExpiringSoon,
    "recordPayment",
    ()=>recordPayment
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/prisma.ts [middleware-edge] (ecmascript)");
;
const TRIAL_DURATION_DAYS = 30;
const MONTHLY_PRICE_CENTS = 1500;
const TRIAL_REMINDER_WINDOW_DAYS = 5;
function addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
function formatCurrency(amountCents) {
    return `€${(amountCents / 100).toFixed(2)}`;
}
function getTrialEndsAt() {
    return addDays(new Date(), TRIAL_DURATION_DAYS);
}
function isSubscriptionActive(subscription) {
    if (!subscription) return false;
    const now = new Date();
    if (subscription.status === 'ACTIVE') {
        return subscription.currentPeriodEnd >= now;
    }
    if (subscription.status === 'TRIALING') {
        return subscription.trialEndsAt >= now;
    }
    return false;
}
function isTrialExpiringSoon(subscription) {
    if (!subscription || subscription.status !== 'TRIALING') return false;
    const now = new Date();
    const end = subscription.trialEndsAt;
    const daysUntil = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= TRIAL_REMINDER_WINDOW_DAYS;
}
function getTrialDaysLeft(subscription) {
    if (!subscription || subscription.status !== 'TRIALING') return 0;
    const now = new Date();
    const millisecondsLeft = subscription.trialEndsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(millisecondsLeft / (1000 * 60 * 60 * 24)));
}
async function createTrialSubscription(tx, airlineId) {
    const now = new Date();
    const trialEndsAt = addDays(now, TRIAL_DURATION_DAYS);
    return tx.airlineSubscription.upsert({
        where: {
            airlineId
        },
        update: {
            plan: 'monthly',
            status: 'TRIALING',
            trialStartAt: now,
            trialEndsAt,
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
            cancelAtPeriodEnd: false,
            canceledAt: null
        },
        create: {
            airlineId,
            plan: 'monthly',
            status: 'TRIALING',
            trialStartAt: now,
            trialEndsAt,
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
            cancelAtPeriodEnd: false
        }
    });
}
async function recordPayment(tx, airlineId, amountCents, description, status = 'PAID') {
    const now = new Date();
    const payment = await tx.airlinePaymentRecord.create({
        data: {
            airlineId,
            amount: amountCents,
            currency: 'EUR',
            status,
            description,
            externalPaymentId: null,
            paidAt: status === 'PAID' ? now : null
        }
    });
    if (status === 'PAID') {
        const currentPeriodEnd = addDays(now, TRIAL_DURATION_DAYS);
        await tx.airlineSubscription.upsert({
            where: {
                airlineId
            },
            update: {
                plan: 'monthly',
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd,
                cancelAtPeriodEnd: false,
                canceledAt: null
            },
            create: {
                airlineId,
                plan: 'monthly',
                status: 'ACTIVE',
                trialStartAt: now,
                trialEndsAt: now,
                currentPeriodStart: now,
                currentPeriodEnd,
                cancelAtPeriodEnd: false
            }
        });
    }
    return payment;
}
async function cancelSubscriptionAtPeriodEnd(tx, airlineId) {
    return tx.airlineSubscription.updateMany({
        where: {
            airlineId,
            status: {
                in: [
                    'ACTIVE',
                    'TRIALING'
                ]
            }
        },
        data: {
            cancelAtPeriodEnd: true
        }
    });
}
async function getAirlineBillingStatus(airlineId) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["prisma"].airlineSubscription.findUnique({
        where: {
            airlineId
        },
        include: {
            payments: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });
}
async function getAirlineSubscription(airlineId) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["prisma"].airlineSubscription.findUnique({
        where: {
            airlineId
        }
    });
}
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$jwt$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/jwt/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/prisma.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$airline$2d$billing$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/airline-billing.ts [middleware-edge] (ecmascript)");
;
;
;
;
const AUTH_EXEMPT_PATHS = [
    '/login',
    '/api',
    '/_next',
    '/favicon.ico',
    '/public'
];
function isAuthExempt(pathname) {
    return AUTH_EXEMPT_PATHS.some((prefix)=>pathname.startsWith(prefix));
}
async function middleware(request) {
    const { nextUrl, cookies } = request;
    const pathname = nextUrl.pathname;
    if (isAuthExempt(pathname)) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    if (!pathname.startsWith('/airline')) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$jwt$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getToken"])({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
    }
    const ownerEmail = token.email;
    const userRole = token.role;
    const activeAirlineId = cookies.get('activeAirlineId')?.value;
    let airline;
    if (userRole === 'ADMIN') {
        airline = activeAirlineId ? await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["prisma"].airline.findUnique({
            where: {
                id: activeAirlineId
            }
        }) : await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["prisma"].airline.findFirst();
    } else if (ownerEmail) {
        airline = activeAirlineId ? await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["prisma"].airline.findFirst({
            where: {
                id: activeAirlineId,
                ownerEmail
            }
        }) : await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["prisma"].airline.findFirst({
            where: {
                ownerEmail
            }
        });
    }
    if (!airline) {
        const billingUrl = new URL('/airline/billing', request.url);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(billingUrl);
    }
    if (!airline) {
        const billingUrl = new URL('/airline/billing', request.url);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(billingUrl);
    }
    const subscription = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["prisma"].airlineSubscription.findUnique({
        where: {
            airlineId: airline.id
        }
    });
    const isBillingPage = pathname === '/airline/billing' || pathname.startsWith('/airline/billing/');
    if (!isBillingPage && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$airline$2d$billing$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isSubscriptionActive"])(subscription)) {
        const billingUrl = new URL('/airline/billing', request.url);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(billingUrl);
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        '/airline/:path*'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__e8895b3c._.js.map