module.exports = [
"[project]/src/components/dashboard/dashboard-ops-map.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardOpsMap
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/mapbox-gl/dist/mapbox-gl.js [app-ssr] (ecmascript)");
'use client';
;
;
;
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmlubm95YWlyd2F5cyIsImEiOiJjbWJhNWk2aHAwaGFxMmlzaTZrZjVxcTYyIn0.ulHtSfoUvNyDHc7EIdiLOg';
function toFeatureCollection(points) {
    return {
        type: 'FeatureCollection',
        features: points.map((point)=>({
                type: 'Feature',
                properties: {
                    id: point.id,
                    title: point.title,
                    subtitle: point.subtitle || '',
                    heading: Number.isFinite(point.heading) ? point.heading : 0
                },
                geometry: {
                    type: 'Point',
                    coordinates: [
                        point.lng,
                        point.lat
                    ]
                }
            }))
    };
}
function DashboardOpsMap({ liveFlights, events, notifications }) {
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const mapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const hasFitLiveRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const [showLive, setShowLive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [showEvents, setShowEvents] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [showNotifications, setShowNotifications] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const liveData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>toFeatureCollection(showLive ? liveFlights : []), [
        showLive,
        liveFlights
    ]);
    const eventsData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>toFeatureCollection(showEvents ? events : []), [
        showEvents,
        events
    ]);
    const notificationsData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>toFeatureCollection(showNotifications ? notifications : []), [
        showNotifications,
        notifications
    ]);
    const visibleLiveCount = showLive ? liveFlights.length : 0;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!containerRef.current || mapRef.current) return;
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].accessToken = MAPBOX_TOKEN;
        const map = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/light-v11',
            center: [
                12,
                48
            ],
            zoom: 2.4,
            projection: 'globe',
            attributionControl: true
        });
        map.on('load', ()=>{
            map.addSource('ops-live', {
                type: 'geojson',
                data: liveData
            });
            map.addSource('ops-events', {
                type: 'geojson',
                data: eventsData
            });
            map.addSource('ops-notifications', {
                type: 'geojson',
                data: notificationsData
            });
            map.addLayer({
                id: 'ops-live-layer',
                type: 'symbol',
                source: 'ops-live',
                layout: {
                    'text-field': '✈',
                    'text-size': 20,
                    'text-font': [
                        'Open Sans Bold',
                        'Arial Unicode MS Bold'
                    ],
                    'text-rotate': [
                        'to-number',
                        [
                            'coalesce',
                            [
                                'get',
                                'heading'
                            ],
                            0
                        ]
                    ],
                    'text-rotation-alignment': 'map',
                    'text-allow-overlap': true,
                    'text-ignore-placement': true
                },
                paint: {
                    'text-color': '#16a34a',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.4
                }
            });
            map.addLayer({
                id: 'ops-events-layer',
                type: 'circle',
                source: 'ops-events',
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#2563eb',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
            map.addLayer({
                id: 'ops-notifications-layer',
                type: 'circle',
                source: 'ops-notifications',
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#9333ea',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
            const popupHandler = (event)=>{
                const feature = event.features?.[0];
                if (!feature || feature.geometry.type !== 'Point') return;
                const [lng, lat] = feature.geometry.coordinates;
                const title = String(feature.properties?.title || 'Item');
                const subtitle = String(feature.properties?.subtitle || '');
                new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Popup({
                    closeButton: false,
                    closeOnClick: true
                }).setLngLat([
                    lng,
                    lat
                ]).setHTML(`<div style=\"font-weight:600\">${title}</div><div style=\"font-size:12px;color:#64748b\">${subtitle}</div>`).addTo(map);
            };
            [
                'ops-live-layer',
                'ops-events-layer',
                'ops-notifications-layer'
            ].forEach((layerId)=>{
                map.on('click', layerId, popupHandler);
                map.on('mouseenter', layerId, ()=>{
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', layerId, ()=>{
                    map.getCanvas().style.cursor = '';
                });
            });
        });
        mapRef.current = map;
        return ()=>{
            map.remove();
            mapRef.current = null;
        };
    }, [
        eventsData,
        liveData,
        notificationsData
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const map = mapRef.current;
        if (!map) return;
        map.getSource('ops-live')?.setData(liveData);
        map.getSource('ops-events')?.setData(eventsData);
        map.getSource('ops-notifications')?.setData(notificationsData);
    }, [
        liveData,
        eventsData,
        notificationsData
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const map = mapRef.current;
        if (!map || !showLive || liveFlights.length === 0) return;
        const bounds = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].LngLatBounds();
        for (const flight of liveFlights){
            bounds.extend([
                flight.lng,
                flight.lat
            ]);
        }
        if (!hasFitLiveRef.current) {
            map.fitBounds(bounds, {
                padding: 70,
                maxZoom: 6,
                duration: 900
            });
            hasFitLiveRef.current = true;
        }
    }, [
        liveFlights,
        showLive
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative h-80 w-full overflow-hidden rounded-xl border border-slate-200",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 shadow-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "relative flex h-3 w-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
                                    lineNumber: 187,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "relative inline-flex h-3 w-3 rounded-full bg-emerald-500"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
                                    lineNumber: 188,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
                            lineNumber: 186,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-sm font-semibold text-emerald-600",
                            children: [
                                "Live ",
                                visibleLiveCount
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
                            lineNumber: 190,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
                    lineNumber: 185,
                    columnNumber: 9
                }, this),
                visibleLiveCount === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-4 text-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mx-auto inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm",
                        children: "No live aircraft currently"
                    }, void 0, false, {
                        fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
                        lineNumber: 194,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
                    lineNumber: 193,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    ref: containerRef,
                    className: "h-full w-full"
                }, void 0, false, {
                    fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
                    lineNumber: 199,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
            lineNumber: 184,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/dashboard/dashboard-ops-map.tsx",
        lineNumber: 183,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_components_dashboard_dashboard-ops-map_tsx_8df91402._.js.map