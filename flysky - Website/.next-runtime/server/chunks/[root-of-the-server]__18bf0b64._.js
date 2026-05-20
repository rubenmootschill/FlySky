module.exports = [
"[project]/.next-internal/server/app/api/simbrief/ofp/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

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
"[project]/src/app/api/simbrief/ofp/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
function pickString(...values) {
    for (const value of values){
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text.length > 0) return text;
    }
    return '';
}
function pickNumber(...values) {
    for (const value of values){
        if (value === null || value === undefined) continue;
        const numeric = Number(String(value).replace(/,/g, '').trim());
        if (Number.isFinite(numeric)) return numeric;
    }
    return null;
}
function normalizeFlightLevel(rawAltitude) {
    const raw = pickString(rawAltitude);
    if (!raw) return '';
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return raw.toUpperCase().startsWith('FL') ? raw.toUpperCase() : raw;
    const altitude = Number(digits);
    if (!Number.isFinite(altitude) || altitude <= 0) return '';
    // SimBrief may return 390 (FL390) or 39000 (feet).
    const level = altitude >= 1000 ? Math.round(altitude / 100) : altitude;
    return `FL${level}`;
}
async function POST(req) {
    try {
        const { username } = await req.json();
        if (!username) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Navigraph username is required'
            }, {
                status: 400
            });
        }
        // Fetch OFP data from SimBrief API
        const response = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?username=${encodeURIComponent(username)}&json=v2`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Failed to fetch OFP data from SimBrief'
            }, {
                status: response.status
            });
        }
        const data = await response.json();
        // Extract relevant flight plan data
        if (data.error) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: data.error
            }, {
                status: 400
            });
        }
        const general = data.general ?? {};
        const atc = data.atc ?? {};
        const params = data.params ?? {};
        const weights = data.weights ?? {};
        const times = data.times ?? {};
        // Parse OFP data and extract flight planning information
        const ofpData = {
            // Route info
            route: pickString(general.route, params.route),
            costIndex: pickString(general.costindex, params.civalue),
            flightLevel: normalizeFlightLevel(general.initial_altitude || params.initial_altitude || params.fl),
            callsign: pickString(atc.callsign, general.callsign, params.callsign),
            altAirport: pickString(general.alternate?.code, general.altn_icao),
            // Flight details
            flightNumber: pickString(general.flight_number, general.flightnumber, general.fltnum, params.fltnum),
            departureTime: pickString(times.est_out, times.sched_out, general.dep_time, general.departure_time, `${pickString(params.deph)}${pickString(params.depm)}`),
            arrivalTime: pickString(times.est_in, times.sched_in, general.arr_time, general.arrival_time),
            // Payload data
            passengers: pickString(weights.pax_count, general.pax_count, params.pax),
            cargo: pickString(weights.cargo, weights.cargo_weight, general.cargo, general.cargo_weight, params.cargo),
            payloadKg: pickNumber(weights.payload, weights.payload_kg, weights.est_payload, general.payload),
            // Additional data that could be useful
            fuel: Number(general.avg_fuel_generated_kg || weights.block_fuel || 0),
            distance: Number(general.distance || 0),
            time: pickString(general.avg_time_generated, times.air_time)
        };
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(ofpData);
    } catch (error) {
        console.error('Error fetching OFP:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch OFP data'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__18bf0b64._.js.map