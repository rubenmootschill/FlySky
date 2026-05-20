module.exports = [
"[project]/.next-internal/server/app/api/tracking/aircraft-photo/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/app/api/tracking/aircraft-photo/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
const PLANESPOTTERS_BASE_URL = 'https://www.planespotters.net/photo/api';
function collectImageUrls(value, found) {
    if (!value) return;
    if (typeof value === 'string') {
        const lowered = value.toLowerCase();
        const isUrl = lowered.startsWith('http://') || lowered.startsWith('https://');
        const looksLikeImage = /(jpg|jpeg|png|webp)(\?|$)/i.test(value);
        if (isUrl && looksLikeImage) {
            found.add(value);
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item)=>collectImageUrls(item, found));
        return;
    }
    if (typeof value === 'object') {
        Object.values(value).forEach((item)=>collectImageUrls(item, found));
    }
}
async function fetchFromPlaneSpotters(query) {
    const variants = [
        `${PLANESPOTTERS_BASE_URL}?q=${encodeURIComponent(query)}`,
        `${PLANESPOTTERS_BASE_URL}?search=${encodeURIComponent(query)}`,
        `${PLANESPOTTERS_BASE_URL}?keyword=${encodeURIComponent(query)}`
    ];
    for (const url of variants){
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json'
                },
                next: {
                    revalidate: 300
                }
            });
            if (!response.ok) continue;
            const json = await response.json();
            const images = new Set();
            collectImageUrls(json, images);
            if (images.size > 0) {
                return Array.from(images)[0];
            }
        } catch  {
        // Continue to the next query variant.
        }
    }
    return null;
}
async function GET(req) {
    const callsign = req.nextUrl.searchParams.get('callsign')?.trim() ?? '';
    const depIcao = req.nextUrl.searchParams.get('depIcao')?.trim() ?? '';
    const arrIcao = req.nextUrl.searchParams.get('arrIcao')?.trim() ?? '';
    const searchQueries = [
        callsign,
        `${callsign} ${depIcao} ${arrIcao}`.trim(),
        depIcao,
        arrIcao
    ].filter((value, index, all)=>value.length > 0 && all.indexOf(value) === index);
    for (const query of searchQueries){
        const photoUrl = await fetchFromPlaneSpotters(query);
        if (photoUrl) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                photoUrl,
                provider: 'planespotters',
                query
            });
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        photoUrl: null,
        provider: 'planespotters'
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__886d036c._.js.map