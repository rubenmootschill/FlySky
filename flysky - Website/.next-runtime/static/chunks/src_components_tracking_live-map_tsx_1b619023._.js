(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/tracking/live-map.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LiveMap
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/mapbox-gl/dist/mapbox-gl.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const DEFAULT_MAPBOX_TOKEN = 'pk.eyJ1IjoiZmlubm95YWlyd2F5cyIsImEiOiJjbWJhNWk2aHAwaGFxMmlzaTZrZjVxcTYyIn0.ulHtSfoUvNyDHc7EIdiLOg';
const SOURCE_ID = 'tracking-routes';
const HEADING_LAYER_ID = 'tracking-heading-lines';
const PLANNED_LAYER_ID = 'tracking-planned-routes';
const TRAIL_LAYER_ID = 'tracking-live-trails';
function normalizeAircraftType(code) {
    return (code !== null && code !== void 0 ? code : '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function pickAircraftMarkerVariant(aircraftType) {
    const code = normalizeAircraftType(aircraftType);
    if (!code) return 'generic';
    if (code.startsWith('A38')) return 'super';
    if (code.startsWith('A33') || code.startsWith('A34') || code.startsWith('A35') || code.startsWith('B74') || code.startsWith('B76') || code.startsWith('B77') || code.startsWith('B78') || code.startsWith('B79')) {
        return 'wide';
    }
    if (code.startsWith('A31') || code.startsWith('A32') || code.startsWith('A20') || code.startsWith('A21') || code.startsWith('B73') || code.startsWith('B38') || code.startsWith('B39') || code.startsWith('B37') || code.startsWith('B72')) {
        return 'narrow';
    }
    if (code.startsWith('E17') || code.startsWith('E19') || code.startsWith('E2') || code.startsWith('CRJ') || code.startsWith('C56')) {
        return 'regional';
    }
    if (code.startsWith('AT') || code.startsWith('DH8') || code.startsWith('C208') || code.startsWith('BE')) {
        return 'prop';
    }
    return 'generic';
}
function getAircraftMarkerAsset(aircraftType) {
    const code = normalizeAircraftType(aircraftType);
    if (code.startsWith('A38')) {
        return {
            src: '/tracking-icons/A380.png',
            size: 34
        };
    }
    if (code.startsWith('A35') || code.startsWith('A33') || code.startsWith('B78') || code.startsWith('B77')) {
        return {
            src: '/tracking-icons/A350,B787,A330,B777.png',
            size: 34
        };
    }
    if (code.startsWith('A34') || code.startsWith('B74') || code.startsWith('B76')) {
        return {
            src: '/tracking-icons/A340,B747.png',
            size: 34
        };
    }
    if (code.startsWith('A31') || code.startsWith('A32') || code.startsWith('A20') || code.startsWith('A21') || code.startsWith('B73') || code.startsWith('B37') || code.startsWith('B38') || code.startsWith('B39')) {
        return {
            src: '/tracking-icons/A319,A320,A31,B737.png',
            size: 32
        };
    }
    if (pickAircraftMarkerVariant(aircraftType) === 'wide') {
        return {
            src: '/tracking-icons/4eng heavyplene.png',
            size: 34
        };
    }
    return {
        src: '/tracking-icons/A319,A320,A31,B737.png',
        size: 30
    };
}
function projectHeadingPoint(lat, lng, headingDeg, distanceNm) {
    const headingRad = headingDeg * Math.PI / 180;
    const deltaLat = distanceNm * Math.cos(headingRad) / 60;
    const safeCos = Math.max(0.01, Math.cos(lat * Math.PI / 180));
    const deltaLng = distanceNm * Math.sin(headingRad) / (60 * safeCos);
    return [
        lat + deltaLat,
        lng + deltaLng
    ];
}
function LiveMap(param) {
    let { flights, airportsByIcao, selectedId, onSelect, theme = 'dark' } = param;
    _s();
    const mapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const trailHistoryRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({});
    const markersRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    const hasFittedInitialBoundsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    var _process_env_NEXT_PUBLIC_MAPBOX_TOKEN;
    const token = (_process_env_NEXT_PUBLIC_MAPBOX_TOKEN = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_MAPBOX_TOKEN) !== null && _process_env_NEXT_PUBLIC_MAPBOX_TOKEN !== void 0 ? _process_env_NEXT_PUBLIC_MAPBOX_TOKEN : DEFAULT_MAPBOX_TOKEN;
    const style = theme === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11';
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            if ("object" === 'undefined' || !containerRef.current) return;
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].accessToken = token;
            hasFittedInitialBoundsRef.current = false;
            const map = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Map({
                container: containerRef.current,
                style,
                center: [
                    12,
                    30
                ],
                zoom: 2.2,
                projection: 'mercator',
                attributionControl: true,
                antialias: true
            });
            const suppressContextMenu = {
                "LiveMap.useEffect.suppressContextMenu": (event)=>{
                    event.preventDefault();
                }
            }["LiveMap.useEffect.suppressContextMenu"];
            map.getCanvas().addEventListener('contextmenu', suppressContextMenu);
            map.dragRotate.disable();
            map.touchZoomRotate.disableRotation();
            mapRef.current = map;
            return ({
                "LiveMap.useEffect": ()=>{
                    markersRef.current.forEach({
                        "LiveMap.useEffect": (marker)=>marker.remove()
                    }["LiveMap.useEffect"]);
                    markersRef.current = [];
                    map.getCanvas().removeEventListener('contextmenu', suppressContextMenu);
                    map.remove();
                    mapRef.current = null;
                }
            })["LiveMap.useEffect"];
        }
    }["LiveMap.useEffect"], [
        style,
        token
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            if (!mapRef.current) return;
            const map = mapRef.current;
            const headingFeatures = [];
            const plannedFeatures = [];
            const trailFeatures = [];
            const syncMap = {
                "LiveMap.useEffect.syncMap": ()=>{
                    const activeIds = new Set(flights.map({
                        "LiveMap.useEffect.syncMap": (flight)=>flight.id
                    }["LiveMap.useEffect.syncMap"]));
                    Object.keys(trailHistoryRef.current).forEach({
                        "LiveMap.useEffect.syncMap": (flightId)=>{
                            if (!activeIds.has(flightId)) {
                                delete trailHistoryRef.current[flightId];
                            }
                        }
                    }["LiveMap.useEffect.syncMap"]);
                    flights.forEach({
                        "LiveMap.useEffect.syncMap": (f)=>{
                            const current = [
                                f.lat,
                                f.lng
                            ];
                            var _f_trailPath;
                            const persistedTrail = ((_f_trailPath = f.trailPath) !== null && _f_trailPath !== void 0 ? _f_trailPath : []).map({
                                "LiveMap.useEffect.syncMap.persistedTrail": (point)=>[
                                        point.lat,
                                        point.lng
                                    ]
                            }["LiveMap.useEffect.syncMap.persistedTrail"]).filter({
                                "LiveMap.useEffect.syncMap.persistedTrail": (param)=>{
                                    let [lat, lng] = param;
                                    return Number.isFinite(lat) && Number.isFinite(lng);
                                }
                            }["LiveMap.useEffect.syncMap.persistedTrail"]).slice(-200);
                            var _trailHistoryRef_current_f_id;
                            const existing = (_trailHistoryRef_current_f_id = trailHistoryRef.current[f.id]) !== null && _trailHistoryRef_current_f_id !== void 0 ? _trailHistoryRef_current_f_id : persistedTrail;
                            const previous = existing.length > 0 ? existing[existing.length - 1] : null;
                            const movedEnough = !previous || Math.abs(previous[0] - current[0]) > 0.0001 || Math.abs(previous[1] - current[1]) > 0.0001;
                            if (movedEnough) {
                                trailHistoryRef.current[f.id] = [
                                    ...existing,
                                    current
                                ].slice(-200);
                            }
                        }
                    }["LiveMap.useEffect.syncMap"]);
                    markersRef.current.forEach({
                        "LiveMap.useEffect.syncMap": (marker)=>marker.remove()
                    }["LiveMap.useEffect.syncMap"]);
                    markersRef.current = [];
                    flights.forEach({
                        "LiveMap.useEffect.syncMap": (f)=>{
                            const isSelected = f.id === selectedId;
                            const dep = airportsByIcao[f.depIcao.toUpperCase()];
                            const arr = airportsByIcao[f.arrIcao.toUpperCase()];
                            const lookAheadNm = Math.max(0.35, Math.min(2.4, f.groundSpeed * 2 / 60));
                            const headingTip = projectHeadingPoint(f.lat, f.lng, f.heading, lookAheadNm);
                            if (isSelected) {
                                headingFeatures.push({
                                    type: 'Feature',
                                    properties: {
                                        kind: 'heading',
                                        color: theme === 'light' ? '#ea580c' : '#f59e0b',
                                        width: 3,
                                        opacity: 0.95
                                    },
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: [
                                            [
                                                f.lng,
                                                f.lat
                                            ],
                                            [
                                                headingTip[1],
                                                headingTip[0]
                                            ]
                                        ]
                                    }
                                });
                            }
                            if (isSelected && f.routePath && f.routePath.length > 1) {
                                plannedFeatures.push({
                                    type: 'Feature',
                                    properties: {
                                        kind: 'planned',
                                        color: theme === 'light' ? '#1d4ed8' : '#60a5fa',
                                        width: 3,
                                        opacity: 0.95
                                    },
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: f.routePath.map({
                                            "LiveMap.useEffect.syncMap": (point)=>[
                                                    point.lng,
                                                    point.lat
                                                ]
                                        }["LiveMap.useEffect.syncMap"])
                                    }
                                });
                            } else if (isSelected && dep && arr) {
                                plannedFeatures.push({
                                    type: 'Feature',
                                    properties: {
                                        kind: 'planned',
                                        color: theme === 'light' ? '#1d4ed8' : '#60a5fa',
                                        width: 3,
                                        opacity: 0.95
                                    },
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: [
                                            [
                                                dep.lng,
                                                dep.lat
                                            ],
                                            [
                                                arr.lng,
                                                arr.lat
                                            ]
                                        ]
                                    }
                                });
                            }
                            var _trailHistoryRef_current_f_id;
                            const trail = (_trailHistoryRef_current_f_id = trailHistoryRef.current[f.id]) !== null && _trailHistoryRef_current_f_id !== void 0 ? _trailHistoryRef_current_f_id : [];
                            if (isSelected && trail.length > 1) {
                                trailFeatures.push({
                                    type: 'Feature',
                                    properties: {
                                        kind: 'trail',
                                        color: theme === 'light' ? '#dc2626' : '#fb7185',
                                        width: 3,
                                        opacity: 0.95
                                    },
                                    geometry: {
                                        type: 'LineString',
                                        coordinates: trail.map({
                                            "LiveMap.useEffect.syncMap": (param)=>{
                                                let [lat, lng] = param;
                                                return [
                                                    lng,
                                                    lat
                                                ];
                                            }
                                        }["LiveMap.useEffect.syncMap"])
                                    }
                                });
                            }
                            const markerElement = document.createElement('div');
                            markerElement.style.display = 'flex';
                            markerElement.style.alignItems = 'center';
                            markerElement.style.justifyContent = 'center';
                            markerElement.style.cursor = 'pointer';
                            markerElement.style.border = '0';
                            markerElement.style.background = 'none';
                            markerElement.style.padding = '0';
                            markerElement.style.margin = '0';
                            markerElement.style.lineHeight = '0';
                            markerElement.style.userSelect = 'none';
                            markerElement.style.outline = 'none';
                            markerElement.style.boxShadow = 'none';
                            const markerAsset = getAircraftMarkerAsset(f.aircraftType);
                            markerElement.style.width = "".concat(markerAsset.size, "px");
                            markerElement.style.height = "".concat(markerAsset.size, "px");
                            const markerImage = document.createElement('img');
                            markerImage.src = markerAsset.src;
                            var _f_aircraftType;
                            markerImage.alt = "".concat((_f_aircraftType = f.aircraftType) !== null && _f_aircraftType !== void 0 ? _f_aircraftType : 'aircraft', " icon");
                            markerImage.draggable = false;
                            markerImage.style.width = "".concat(markerAsset.size, "px");
                            markerImage.style.height = "".concat(markerAsset.size, "px");
                            markerImage.style.display = 'block';
                            markerImage.style.pointerEvents = 'none';
                            markerImage.style.transform = "rotate(".concat(f.heading, "deg)");
                            markerImage.style.transformOrigin = 'center center';
                            markerImage.style.filter = theme === 'light' ? 'brightness(0)' : 'brightness(0) invert(1)';
                            markerImage.style.opacity = isSelected ? '1' : '0.9';
                            markerImage.style.background = 'transparent';
                            markerImage.style.border = '0';
                            markerImage.style.outline = 'none';
                            markerImage.style.boxShadow = 'none';
                            markerElement.replaceChildren(markerImage);
                            var _f_aircraftType1;
                            markerElement.setAttribute('aria-label', "".concat(f.callsign, " ").concat((_f_aircraftType1 = f.aircraftType) !== null && _f_aircraftType1 !== void 0 ? _f_aircraftType1 : 'aircraft', " marker"));
                            markerElement.addEventListener('click', {
                                "LiveMap.useEffect.syncMap": ()=>onSelect(f.id)
                            }["LiveMap.useEffect.syncMap"]);
                            const marker = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Marker({
                                element: markerElement,
                                anchor: 'center'
                            }).setLngLat([
                                f.lng,
                                f.lat
                            ]).addTo(map);
                            markersRef.current.push(marker);
                        }
                    }["LiveMap.useEffect.syncMap"]);
                    const lineCollection = {
                        type: 'FeatureCollection',
                        features: [
                            ...plannedFeatures,
                            ...trailFeatures,
                            ...headingFeatures
                        ]
                    };
                    const existingSource = map.getSource(SOURCE_ID);
                    if (existingSource) {
                        existingSource.setData(lineCollection);
                    } else {
                        map.addSource(SOURCE_ID, {
                            type: 'geojson',
                            data: lineCollection
                        });
                        map.addLayer({
                            id: PLANNED_LAYER_ID,
                            type: 'line',
                            source: SOURCE_ID,
                            filter: [
                                '==',
                                [
                                    'get',
                                    'kind'
                                ],
                                'planned'
                            ],
                            paint: {
                                'line-color': [
                                    'get',
                                    'color'
                                ],
                                'line-width': [
                                    'get',
                                    'width'
                                ],
                                'line-opacity': [
                                    'get',
                                    'opacity'
                                ],
                                'line-dasharray': [
                                    3,
                                    3
                                ]
                            }
                        });
                        map.addLayer({
                            id: TRAIL_LAYER_ID,
                            type: 'line',
                            source: SOURCE_ID,
                            filter: [
                                '==',
                                [
                                    'get',
                                    'kind'
                                ],
                                'trail'
                            ],
                            paint: {
                                'line-color': [
                                    'get',
                                    'color'
                                ],
                                'line-width': [
                                    'get',
                                    'width'
                                ],
                                'line-opacity': [
                                    'get',
                                    'opacity'
                                ]
                            }
                        });
                        map.addLayer({
                            id: HEADING_LAYER_ID,
                            type: 'line',
                            source: SOURCE_ID,
                            filter: [
                                '==',
                                [
                                    'get',
                                    'kind'
                                ],
                                'heading'
                            ],
                            paint: {
                                'line-color': [
                                    'get',
                                    'color'
                                ],
                                'line-width': [
                                    'get',
                                    'width'
                                ],
                                'line-opacity': [
                                    'get',
                                    'opacity'
                                ]
                            }
                        });
                    }
                    if (flights.length === 0) {
                        hasFittedInitialBoundsRef.current = false;
                    }
                    if (flights.length > 0 && !hasFittedInitialBoundsRef.current) {
                        const bounds = flights.reduce({
                            "LiveMap.useEffect.syncMap.bounds": (acc, flight)=>{
                                acc.extend([
                                    flight.lng,
                                    flight.lat
                                ]);
                                return acc;
                            }
                        }["LiveMap.useEffect.syncMap.bounds"], new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].LngLatBounds([
                            flights[0].lng,
                            flights[0].lat
                        ], [
                            flights[0].lng,
                            flights[0].lat
                        ]));
                        map.fitBounds(bounds, {
                            padding: 80,
                            maxZoom: 6,
                            duration: 0
                        });
                        hasFittedInitialBoundsRef.current = true;
                    }
                }
            }["LiveMap.useEffect.syncMap"];
            if (!map.isStyleLoaded()) {
                map.once('load', syncMap);
                return ({
                    "LiveMap.useEffect": ()=>{
                        map.off('load', syncMap);
                    }
                })["LiveMap.useEffect"];
            }
            syncMap();
        }
    }["LiveMap.useEffect"], [
        flights,
        airportsByIcao,
        selectedId,
        onSelect,
        theme
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: containerRef,
        className: "w-full h-full min-h-[420px] rounded-xl overflow-hidden border ".concat(theme === 'light' ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-slate-900')
    }, void 0, false, {
        fileName: "[project]/src/components/tracking/live-map.tsx",
        lineNumber: 428,
        columnNumber: 5
    }, this);
}
_s(LiveMap, "6jFhXrxIZS65aETg2wWVvR0Xei4=");
_c = LiveMap;
var _c;
__turbopack_context__.k.register(_c, "LiveMap");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/tracking/live-map.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/components/tracking/live-map.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=src_components_tracking_live-map_tsx_1b619023._.js.map