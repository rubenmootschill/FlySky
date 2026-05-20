module.exports = [
"[project]/src/components/book/book-flight-map.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BookFlightMap
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/mapbox-gl/dist/mapbox-gl.js [app-ssr] (ecmascript)");
'use client';
;
;
;
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmlubm95YWlyd2F5cyIsImEiOiJjbWJhNWk2aHAwaGFxMmlzaTZrZjVxcTYyIn0.ulHtSfoUvNyDHc7EIdiLOg';
const ROUTES_SOURCE_ID = 'book-routes';
const ROUTE_GLOW_SOURCE_ID = 'book-route-glow';
const AIRPORTS_SOURCE_ID = 'book-airports';
const RANGE_RINGS_SOURCE_ID = 'book-range-rings';
const WEATHER_CLOUDS_SOURCE_ID = 'book-weather-clouds-raster';
const WEATHER_CLOUDS_LAYER_ID = 'book-weather-clouds-layer';
const WEATHER_CLOUDS_ALT_SOURCE_ID = 'book-weather-clouds-raster-alt';
const WEATHER_CLOUDS_ALT_LAYER_ID = 'book-weather-clouds-layer-alt';
const WEATHER_VISIBILITY_SOURCE_ID = 'book-weather-visibility';
const WEATHER_WIND_SOURCE_ID = 'book-weather-wind';
const DEPARTURE_MARKER_ICON_ID = 'book-marker-departure';
const ARRIVAL_MARKER_ICON_ID = 'book-marker-arrival';
const WEATHER_DEBOUNCE_MS = 350;
const WEATHER_COOLDOWN_MS = 60_000;
const MAX_WEATHER_CELLS = 24;
const emptyFeatureCollection = ()=>({
        type: 'FeatureCollection',
        features: []
    });
const clamp = (value, min, max)=>Math.min(max, Math.max(min, value));
const getWeatherGridStep = (zoom)=>{
    if (zoom <= 2) return 45;
    if (zoom <= 3) return 30;
    if (zoom <= 4) return 20;
    if (zoom <= 5) return 15;
    return 10;
};
const getWindColor = (speedKnots)=>{
    if (speedKnots >= 45) return '#1d4ed8';
    if (speedKnots >= 30) return '#2563eb';
    if (speedKnots >= 20) return '#0ea5e9';
    if (speedKnots >= 10) return '#38bdf8';
    return '#7dd3fc';
};
const getVisibilityFill = (visibilityKm)=>{
    if (visibilityKm < 2) return {
        color: '#dc2626',
        opacity: 0.24
    };
    if (visibilityKm < 5) return {
        color: '#f97316',
        opacity: 0.18
    };
    if (visibilityKm < 10) return {
        color: '#f59e0b',
        opacity: 0.12
    };
    return {
        color: '#10b981',
        opacity: 0.06
    };
};
const getCloudRasterDate = ()=>{
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
};
const buildWeatherCells = (bounds, step)=>{
    const paddedSouth = clamp(bounds.getSouth() - step * 0.5, -80, 80);
    const paddedNorth = clamp(bounds.getNorth() + step * 0.5, -80, 80);
    const paddedWest = clamp(bounds.getWest() - step * 0.5, -180, 180);
    const paddedEast = clamp(bounds.getEast() + step * 0.5, -180, 180);
    const startLat = Math.floor(paddedSouth / step) * step;
    const endLat = Math.ceil(paddedNorth / step) * step;
    const startLng = Math.floor(paddedWest / step) * step;
    const endLng = Math.ceil(paddedEast / step) * step;
    const cells = [];
    for(let south = startLat; south < endLat; south += step){
        for(let west = startLng; west < endLng; west += step){
            const north = clamp(south + step, -80, 80);
            const east = clamp(west + step, -180, 180);
            const centerLat = clamp(south + step / 2, -80, 80);
            const centerLng = clamp(west + step / 2, -180, 180);
            cells.push({
                centerLat,
                centerLng,
                south,
                west,
                north,
                east
            });
        }
    }
    return cells;
};
const getWeatherCellsForBounds = (bounds, zoom, maxCells)=>{
    let step = getWeatherGridStep(zoom);
    let cells = buildWeatherCells(bounds, step);
    while(cells.length > maxCells && step < 90){
        step = Math.min(step * 1.5, 90);
        cells = buildWeatherCells(bounds, step);
    }
    return {
        step,
        cells
    };
};
const createCircleRingFeature = (centerLng, centerLat, radiusNm, steps = 128)=>{
    const radiusKm = radiusNm * 1.852;
    const coordinates = [];
    for(let index = 0; index <= steps; index += 1){
        const angle = index / steps * Math.PI * 2;
        const latOffset = radiusKm / 111.32 * Math.sin(angle);
        const lngScale = Math.max(Math.cos(centerLat * Math.PI / 180), 0.2);
        const lngOffset = radiusKm / (111.32 * lngScale) * Math.cos(angle);
        coordinates.push([
            clamp(centerLng + lngOffset, -180, 180),
            clamp(centerLat + latOffset, -85, 85)
        ]);
    }
    return {
        type: 'Feature',
        properties: {
            label: `${radiusNm} NM`
        },
        geometry: {
            type: 'LineString',
            coordinates
        }
    };
};
const setGeoJsonData = (map, sourceId, data)=>{
    if (!map) return;
    try {
        const style = map.getStyle();
        if (!style) return;
        const source = map.getSource(sourceId);
        source?.setData(data);
    } catch  {
    // Ignore updates while style/map is tearing down.
    }
};
const createMarkerPlaneImage = (rotation, color)=>{
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Unable to create marker canvas context');
    }
    context.translate(16, 16);
    context.rotate(rotation * Math.PI / 180);
    context.fillStyle = color;
    context.strokeStyle = color;
    context.shadowColor = 'rgba(255, 255, 255, 0.2)';
    context.shadowBlur = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(0, -10);
    context.lineTo(2.2, -4.2);
    context.lineTo(7.4, -1.4);
    context.lineTo(7.4, 0.8);
    context.lineTo(2.8, 0.3);
    context.lineTo(1.5, 9.5);
    context.lineTo(-1.5, 9.5);
    context.lineTo(-2.8, 0.3);
    context.lineTo(-7.4, 0.8);
    context.lineTo(-7.4, -1.4);
    context.lineTo(-2.2, -4.2);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(-1.2, 6.4);
    context.lineTo(-4.4, 9.8);
    context.lineTo(-2.4, 10.4);
    context.lineTo(-0.7, 8.7);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(1.2, 6.4);
    context.lineTo(4.4, 9.8);
    context.lineTo(2.4, 10.4);
    context.lineTo(0.7, 8.7);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(0, -10.8);
    context.lineTo(1.2, -8.5);
    context.lineTo(0, -7.8);
    context.lineTo(-1.2, -8.5);
    context.closePath();
    context.fill();
    return context.getImageData(0, 0, canvas.width, canvas.height);
};
const addMapImage = (map, id, image)=>{
    if (map.hasImage(id)) return;
    map.addImage(id, image);
};
const ensureMarkerImages = async (map)=>{
    addMapImage(map, DEPARTURE_MARKER_ICON_ID, createMarkerPlaneImage(-35, '#0f766e'));
    addMapImage(map, ARRIVAL_MARKER_ICON_ID, createMarkerPlaneImage(145, '#0369a1'));
};
const ensureSourcesAndLayers = (map)=>{
    if (!map.getSource(ROUTE_GLOW_SOURCE_ID)) {
        map.addSource(ROUTE_GLOW_SOURCE_ID, {
            type: 'geojson',
            data: emptyFeatureCollection()
        });
        map.addLayer({
            id: 'book-route-glow-layer',
            type: 'line',
            source: ROUTE_GLOW_SOURCE_ID,
            paint: {
                'line-color': '#6ee7b7',
                'line-width': 9,
                'line-opacity': 0.28
            }
        });
    }
    if (!map.getSource(ROUTES_SOURCE_ID)) {
        map.addSource(ROUTES_SOURCE_ID, {
            type: 'geojson',
            data: emptyFeatureCollection()
        });
        map.addLayer({
            id: 'book-routes-layer',
            type: 'line',
            source: ROUTES_SOURCE_ID,
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
            id: 'book-routes-hit-layer',
            type: 'line',
            source: ROUTES_SOURCE_ID,
            paint: {
                'line-color': '#000000',
                'line-opacity': 0,
                'line-width': 14
            }
        });
    }
    if (!map.getSource(AIRPORTS_SOURCE_ID)) {
        map.addSource(AIRPORTS_SOURCE_ID, {
            type: 'geojson',
            data: emptyFeatureCollection()
        });
        map.addLayer({
            id: 'book-airports-pulse-layer',
            type: 'circle',
            source: AIRPORTS_SOURCE_ID,
            paint: {
                'circle-radius': [
                    '*',
                    [
                        'get',
                        'pulseRadius'
                    ],
                    [
                        'case',
                        [
                            'boolean',
                            [
                                'feature-state',
                                'hover'
                            ],
                            false
                        ],
                        1.14,
                        1
                    ]
                ],
                'circle-color': [
                    'get',
                    'glowColor'
                ],
                'circle-opacity': [
                    'get',
                    'pulseOpacity'
                ],
                'circle-blur': 0.82
            }
        });
        map.addLayer({
            id: 'book-airports-glow-layer',
            type: 'circle',
            source: AIRPORTS_SOURCE_ID,
            paint: {
                'circle-radius': [
                    '*',
                    [
                        'get',
                        'glowRadius'
                    ],
                    [
                        'case',
                        [
                            'boolean',
                            [
                                'feature-state',
                                'hover'
                            ],
                            false
                        ],
                        1.18,
                        1
                    ]
                ],
                'circle-color': [
                    'get',
                    'glowColor'
                ],
                'circle-opacity': [
                    'case',
                    [
                        'boolean',
                        [
                            'feature-state',
                            'hover'
                        ],
                        false
                    ],
                    [
                        'get',
                        'hoverGlowOpacity'
                    ],
                    [
                        'get',
                        'glowOpacity'
                    ]
                ],
                'circle-blur': 0.6
            }
        });
        map.addLayer({
            id: 'book-airports-layer',
            type: 'circle',
            source: AIRPORTS_SOURCE_ID,
            paint: {
                'circle-radius': [
                    '*',
                    [
                        'get',
                        'radius'
                    ],
                    [
                        'case',
                        [
                            'boolean',
                            [
                                'feature-state',
                                'hover'
                            ],
                            false
                        ],
                        1.1,
                        1
                    ]
                ],
                'circle-color': [
                    'get',
                    'fillColor'
                ],
                'circle-stroke-color': [
                    'get',
                    'strokeColor'
                ],
                'circle-stroke-width': [
                    'get',
                    'strokeWidth'
                ],
                'circle-opacity': [
                    'get',
                    'fillOpacity'
                ]
            }
        });
        map.addLayer({
            id: 'book-airports-core-layer',
            type: 'circle',
            source: AIRPORTS_SOURCE_ID,
            paint: {
                'circle-radius': [
                    '*',
                    [
                        'get',
                        'coreRadius'
                    ],
                    [
                        'case',
                        [
                            'boolean',
                            [
                                'feature-state',
                                'hover'
                            ],
                            false
                        ],
                        1.08,
                        1
                    ]
                ],
                'circle-color': [
                    'get',
                    'coreColor'
                ],
                'circle-opacity': 0.98
            }
        });
        map.addLayer({
            id: 'book-airports-symbol-layer',
            type: 'symbol',
            source: AIRPORTS_SOURCE_ID,
            layout: {
                'icon-image': [
                    'get',
                    'markerIcon'
                ],
                'icon-size': [
                    'get',
                    'iconScale'
                ],
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            },
            paint: {
                'icon-opacity': 0.96
            }
        });
    }
    if (!map.getSource(RANGE_RINGS_SOURCE_ID)) {
        map.addSource(RANGE_RINGS_SOURCE_ID, {
            type: 'geojson',
            data: emptyFeatureCollection()
        });
        map.addLayer({
            id: 'book-range-rings-layer',
            type: 'line',
            source: RANGE_RINGS_SOURCE_ID,
            paint: {
                'line-color': '#0f766e',
                'line-width': 2,
                'line-opacity': 0.72,
                'line-dasharray': [
                    4,
                    2
                ]
            }
        });
    }
    if (!map.getSource(WEATHER_CLOUDS_SOURCE_ID)) {
        map.addSource(WEATHER_CLOUDS_SOURCE_ID, {
            type: 'raster',
            tiles: [
                `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${getCloudRasterDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
            ],
            tileSize: 256,
            scheme: 'xyz',
            bounds: [
                -180,
                -85.051129,
                180,
                85.051129
            ]
        });
        map.addLayer({
            id: WEATHER_CLOUDS_LAYER_ID,
            type: 'raster',
            source: WEATHER_CLOUDS_SOURCE_ID,
            paint: {
                'raster-opacity': 0.22,
                'raster-saturation': -0.12,
                'raster-contrast': 0.12,
                'raster-brightness-max': 0.9,
                'raster-fade-duration': 200
            },
            layout: {
                visibility: 'none'
            }
        });
    }
    if (!map.getSource(WEATHER_CLOUDS_ALT_SOURCE_ID)) {
        map.addSource(WEATHER_CLOUDS_ALT_SOURCE_ID, {
            type: 'raster',
            tiles: [
                `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/${getCloudRasterDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
            ],
            tileSize: 256,
            scheme: 'xyz',
            bounds: [
                -180,
                -85.051129,
                180,
                85.051129
            ]
        });
        map.addLayer({
            id: WEATHER_CLOUDS_ALT_LAYER_ID,
            type: 'raster',
            source: WEATHER_CLOUDS_ALT_SOURCE_ID,
            paint: {
                'raster-opacity': 0.14,
                'raster-saturation': -0.1,
                'raster-contrast': 0.08,
                'raster-brightness-max': 0.92,
                'raster-fade-duration': 200
            },
            layout: {
                visibility: 'none'
            }
        });
    }
    if (!map.getSource(WEATHER_VISIBILITY_SOURCE_ID)) {
        map.addSource(WEATHER_VISIBILITY_SOURCE_ID, {
            type: 'geojson',
            data: emptyFeatureCollection()
        });
        map.addLayer({
            id: 'book-weather-visibility-layer',
            type: 'fill',
            source: WEATHER_VISIBILITY_SOURCE_ID,
            paint: {
                'fill-color': [
                    'get',
                    'fillColor'
                ],
                'fill-opacity': [
                    'get',
                    'fillOpacity'
                ]
            }
        });
    }
    if (!map.getSource(WEATHER_WIND_SOURCE_ID)) {
        map.addSource(WEATHER_WIND_SOURCE_ID, {
            type: 'geojson',
            data: emptyFeatureCollection()
        });
        map.addLayer({
            id: 'book-weather-wind-layer',
            type: 'line',
            source: WEATHER_WIND_SOURCE_ID,
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
};
function BookFlightMap({ hubIcao, destinations, airportsByIcao, selectedDestinationIcao, onSelectDestination, windEnabled = true, cloudEnabled = false, visibilityEnabled = true, rangeRingEnabled = false }) {
    const mapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const weatherRequestRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const weatherCacheRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const weatherCooldownUntilRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const weatherTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const markerAnimationRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const hoveredAirportIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [mapReady, setMapReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const map = undefined;
        const container = undefined;
    }, [
        onSelectDestination
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!mapReady || !mapRef.current) return;
        const map = mapRef.current;
        const hub = airportsByIcao[hubIcao];
        if (!hub) return;
        const routeFeatures = destinations.map((destination)=>{
            const airport = airportsByIcao[destination.icao];
            if (!airport) return null;
            const isSelected = selectedDestinationIcao === destination.icao;
            return {
                type: 'Feature',
                properties: {
                    destinationIcao: destination.icao,
                    color: isSelected ? '#22c55e' : '#334155',
                    width: isSelected ? 5.5 : 2.6,
                    opacity: isSelected ? 0.95 : 0.62
                },
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [
                            hub.lng,
                            hub.lat
                        ],
                        [
                            airport.lng,
                            airport.lat
                        ]
                    ]
                }
            };
        }).filter(Boolean);
        const glowFeatures = destinations.filter((destination)=>selectedDestinationIcao === destination.icao).map((destination)=>{
            const airport = airportsByIcao[destination.icao];
            if (!airport) return null;
            return {
                type: 'Feature',
                properties: {
                    destinationIcao: destination.icao
                },
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [
                            hub.lng,
                            hub.lat
                        ],
                        [
                            airport.lng,
                            airport.lat
                        ]
                    ]
                }
            };
        }).filter(Boolean);
        const airportFeatures = [
            {
                type: 'Feature',
                id: hubIcao,
                properties: {
                    destinationIcao: hubIcao,
                    selectable: 'false',
                    radius: 14,
                    coreRadius: 4.8,
                    glowRadius: 22,
                    pulseRadius: 19,
                    fillColor: 'rgba(255,255,255,0.72)',
                    fillOpacity: 0.94,
                    strokeColor: 'rgba(148,163,184,0.45)',
                    strokeWidth: 1.2,
                    coreColor: '#14b8a6',
                    glowColor: '#2dd4bf',
                    glowOpacity: 0.18,
                    hoverGlowOpacity: 0.34,
                    pulseOpacity: 0.1,
                    markerIcon: DEPARTURE_MARKER_ICON_ID,
                    iconScale: 0.5
                },
                geometry: {
                    type: 'Point',
                    coordinates: [
                        hub.lng,
                        hub.lat
                    ]
                }
            },
            ...destinations.map((destination)=>{
                const airport = airportsByIcao[destination.icao];
                if (!airport) return null;
                const isSelected = selectedDestinationIcao === destination.icao;
                return {
                    type: 'Feature',
                    id: destination.icao,
                    properties: {
                        destinationIcao: destination.icao,
                        selectable: 'true',
                        radius: isSelected ? 13.5 : 12,
                        coreRadius: isSelected ? 4.6 : 4.1,
                        glowRadius: isSelected ? 24 : 20,
                        pulseRadius: isSelected ? 20 : 17,
                        fillColor: isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.68)',
                        fillOpacity: isSelected ? 0.97 : 0.9,
                        strokeColor: isSelected ? 'rgba(16,185,129,0.4)' : 'rgba(96,165,250,0.28)',
                        strokeWidth: isSelected ? 1.4 : 1.1,
                        coreColor: isSelected ? '#10b981' : '#38bdf8',
                        glowColor: isSelected ? '#34d399' : '#60a5fa',
                        glowOpacity: isSelected ? 0.24 : 0.16,
                        hoverGlowOpacity: isSelected ? 0.42 : 0.32,
                        pulseOpacity: isSelected ? 0.14 : 0.08,
                        markerIcon: ARRIVAL_MARKER_ICON_ID,
                        iconScale: isSelected ? 0.52 : 0.48
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            airport.lng,
                            airport.lat
                        ]
                    }
                };
            }).filter(Boolean)
        ];
        setGeoJsonData(map, ROUTES_SOURCE_ID, {
            type: 'FeatureCollection',
            features: routeFeatures
        });
        setGeoJsonData(map, ROUTE_GLOW_SOURCE_ID, {
            type: 'FeatureCollection',
            features: glowFeatures
        });
        setGeoJsonData(map, AIRPORTS_SOURCE_ID, {
            type: 'FeatureCollection',
            features: airportFeatures
        });
    }, [
        mapReady,
        hubIcao,
        destinations,
        airportsByIcao,
        selectedDestinationIcao
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!mapReady || !mapRef.current) return;
        let disposed = false;
        const animateMarkers = ()=>{
            if (disposed || !mapRef.current) return;
            const pulsePhase = Date.now() % 1800 / 1800;
            const pulseWave = (Math.sin(pulsePhase * Math.PI * 2) + 1) / 2;
            try {
                mapRef.current.setPaintProperty('book-airports-pulse-layer', 'circle-radius', [
                    '*',
                    [
                        '+',
                        [
                            'get',
                            'pulseRadius'
                        ],
                        pulseWave * 2.2
                    ],
                    [
                        'case',
                        [
                            'boolean',
                            [
                                'feature-state',
                                'hover'
                            ],
                            false
                        ],
                        1.14,
                        1
                    ]
                ]);
                mapRef.current.setPaintProperty('book-airports-pulse-layer', 'circle-opacity', [
                    '+',
                    [
                        'get',
                        'pulseOpacity'
                    ],
                    pulseWave * 0.07
                ]);
            } catch  {
                return;
            }
            markerAnimationRef.current = window.requestAnimationFrame(animateMarkers);
        };
        markerAnimationRef.current = window.requestAnimationFrame(animateMarkers);
        return ()=>{
            disposed = true;
            if (markerAnimationRef.current !== null) {
                window.cancelAnimationFrame(markerAnimationRef.current);
                markerAnimationRef.current = null;
            }
        };
    }, [
        mapReady
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!mapReady || !mapRef.current) return;
        const map = mapRef.current;
        const hub = airportsByIcao[hubIcao];
        if (!hub) return;
        const bounds = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].LngLatBounds([
            hub.lng,
            hub.lat
        ], [
            hub.lng,
            hub.lat
        ]);
        destinations.forEach((destination)=>{
            const airport = airportsByIcao[destination.icao];
            if (!airport) return;
            bounds.extend([
                airport.lng,
                airport.lat
            ]);
        });
        map.fitBounds(bounds, {
            padding: {
                top: 60,
                right: 60,
                bottom: 60,
                left: 340
            },
            maxZoom: 5,
            duration: 800
        });
    }, [
        mapReady,
        hubIcao,
        destinations,
        airportsByIcao
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!mapReady || !mapRef.current) return;
        const map = mapRef.current;
        const hub = airportsByIcao[hubIcao];
        const clearWeatherSources = ()=>{
            setGeoJsonData(map, RANGE_RINGS_SOURCE_ID, emptyFeatureCollection());
            setGeoJsonData(map, WEATHER_VISIBILITY_SOURCE_ID, emptyFeatureCollection());
            setGeoJsonData(map, WEATHER_WIND_SOURCE_ID, emptyFeatureCollection());
        };
        if (!hub) {
            clearWeatherSources();
            return;
        }
        let disposed = false;
        const drawWeatherData = (cells, weatherRows, step)=>{
            const visibilityFeatures = [];
            const windFeatures = [];
            cells.forEach((cell, index)=>{
                const current = weatherRows[index]?.current;
                if (!current) return;
                if (visibilityEnabled) {
                    const visibilityKm = Number(current.visibility ?? 10000) / 1000;
                    const visibilityFill = getVisibilityFill(visibilityKm);
                    visibilityFeatures.push({
                        type: 'Feature',
                        properties: {
                            fillColor: visibilityFill.color,
                            fillOpacity: visibilityFill.opacity
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [
                                [
                                    [
                                        cell.west,
                                        cell.south
                                    ],
                                    [
                                        cell.east,
                                        cell.south
                                    ],
                                    [
                                        cell.east,
                                        cell.north
                                    ],
                                    [
                                        cell.west,
                                        cell.north
                                    ],
                                    [
                                        cell.west,
                                        cell.south
                                    ]
                                ]
                            ]
                        }
                    });
                }
                if (windEnabled) {
                    const windSpeed = Number(current.wind_speed_10m ?? 0);
                    const windDirection = Number(current.wind_direction_10m ?? 0);
                    const arrowLength = step * (0.14 + Math.min(windSpeed / 120, 0.18));
                    const angle = (windDirection - 90) * Math.PI / 180;
                    const endLat = clamp(cell.centerLat + Math.sin(angle) * arrowLength, -85, 85);
                    const endLng = clamp(cell.centerLng + Math.cos(angle) * arrowLength, -180, 180);
                    const headSize = arrowLength * 0.3;
                    const leftAngle = angle + Math.PI * 0.78;
                    const rightAngle = angle - Math.PI * 0.78;
                    const leftHead = [
                        clamp(endLng + Math.cos(leftAngle) * headSize, -180, 180),
                        clamp(endLat + Math.sin(leftAngle) * headSize, -85, 85)
                    ];
                    const rightHead = [
                        clamp(endLng + Math.cos(rightAngle) * headSize, -180, 180),
                        clamp(endLat + Math.sin(rightAngle) * headSize, -85, 85)
                    ];
                    windFeatures.push({
                        type: 'Feature',
                        properties: {
                            color: getWindColor(windSpeed),
                            width: 1.5,
                            opacity: 0.75
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: [
                                [
                                    cell.centerLng,
                                    cell.centerLat
                                ],
                                [
                                    endLng,
                                    endLat
                                ]
                            ]
                        }
                    });
                    windFeatures.push({
                        type: 'Feature',
                        properties: {
                            color: getWindColor(windSpeed),
                            width: 1.5,
                            opacity: 0.75
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: [
                                leftHead,
                                [
                                    endLng,
                                    endLat
                                ],
                                rightHead
                            ]
                        }
                    });
                }
            });
            setGeoJsonData(map, WEATHER_VISIBILITY_SOURCE_ID, {
                type: 'FeatureCollection',
                features: visibilityFeatures
            });
            setGeoJsonData(map, WEATHER_WIND_SOURCE_ID, {
                type: 'FeatureCollection',
                features: windFeatures
            });
        };
        const renderWeather = async ()=>{
            if (map.getLayer(WEATHER_CLOUDS_LAYER_ID)) {
                map.setLayoutProperty(WEATHER_CLOUDS_LAYER_ID, 'visibility', cloudEnabled ? 'visible' : 'none');
            }
            if (map.getLayer(WEATHER_CLOUDS_ALT_LAYER_ID)) {
                map.setLayoutProperty(WEATHER_CLOUDS_ALT_LAYER_ID, 'visibility', cloudEnabled ? 'visible' : 'none');
            }
            const rangeRingFeatures = rangeRingEnabled ? [
                500,
                1000,
                1500,
                2000,
                3000,
                5000
            ].map((distanceNm)=>createCircleRingFeature(hub.lng, hub.lat, distanceNm)) : [];
            setGeoJsonData(map, RANGE_RINGS_SOURCE_ID, {
                type: 'FeatureCollection',
                features: rangeRingFeatures
            });
            setGeoJsonData(map, WEATHER_VISIBILITY_SOURCE_ID, emptyFeatureCollection());
            setGeoJsonData(map, WEATHER_WIND_SOURCE_ID, emptyFeatureCollection());
            if (!windEnabled && !visibilityEnabled) {
                return;
            }
            const bounds = map.getBounds();
            if (!bounds) {
                return;
            }
            const { step, cells } = getWeatherCellsForBounds(bounds, map.getZoom(), MAX_WEATHER_CELLS);
            if (cells.length === 0) {
                return;
            }
            const currentVars = [
                windEnabled ? 'wind_speed_10m' : null,
                windEnabled ? 'wind_direction_10m' : null,
                visibilityEnabled ? 'visibility' : null
            ].filter(Boolean);
            if (currentVars.length === 0) {
                return;
            }
            const cacheKey = [
                map.getZoom().toFixed(1),
                currentVars.join('|'),
                step,
                bounds.getSouth().toFixed(1),
                bounds.getWest().toFixed(1),
                bounds.getNorth().toFixed(1),
                bounds.getEast().toFixed(1)
            ].join(':');
            const cached = weatherCacheRef.current.get(cacheKey);
            if (cached) {
                drawWeatherData(cells, cached, step);
                return;
            }
            if (Date.now() < weatherCooldownUntilRef.current) {
                return;
            }
            const requestId = ++weatherRequestRef.current;
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${cells.map((cell)=>cell.centerLat.toFixed(3)).join(',')}&longitude=${cells.map((cell)=>cell.centerLng.toFixed(3)).join(',')}&current=${currentVars.join(',')}&wind_speed_unit=kn`);
                if (!response.ok) {
                    if (response.status === 429) {
                        weatherCooldownUntilRef.current = Date.now() + WEATHER_COOLDOWN_MS;
                    }
                    return;
                }
                const payload = await response.json();
                const weatherRows = Array.isArray(payload) ? payload : [
                    payload
                ];
                if (disposed || requestId !== weatherRequestRef.current) {
                    return;
                }
                weatherCacheRef.current.set(cacheKey, weatherRows);
                drawWeatherData(cells, weatherRows, step);
            } catch  {
                if (disposed || requestId !== weatherRequestRef.current) {
                    return;
                }
            }
        };
        const scheduleWeatherRender = ()=>{
            if (weatherTimerRef.current) {
                clearTimeout(weatherTimerRef.current);
            }
            weatherTimerRef.current = setTimeout(()=>{
                renderWeather();
            }, WEATHER_DEBOUNCE_MS);
        };
        renderWeather();
        map.on('moveend', scheduleWeatherRender);
        map.on('zoomend', scheduleWeatherRender);
        return ()=>{
            disposed = true;
            if (weatherTimerRef.current) {
                clearTimeout(weatherTimerRef.current);
                weatherTimerRef.current = null;
            }
            map.off('moveend', scheduleWeatherRender);
            map.off('zoomend', scheduleWeatherRender);
            clearWeatherSources();
        };
    }, [
        mapReady,
        hubIcao,
        airportsByIcao,
        windEnabled,
        cloudEnabled,
        visibilityEnabled,
        rangeRingEnabled
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: containerRef,
        className: "h-[80vh] min-h-[620px] w-full rounded-2xl border border-white/60 bg-[#dbe3ea] shadow-inner select-none",
        style: {
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
        }
    }, void 0, false, {
        fileName: "[project]/src/components/book/book-flight-map.tsx",
        lineNumber: 998,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/dashboard/book/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BookFlightPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plane$2d$takeoff$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PlaneTakeoff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plane-takeoff.js [app-ssr] (ecmascript) <export default as PlaneTakeoff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plane$2d$landing$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PlaneLanding$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plane-landing.js [app-ssr] (ecmascript) <export default as PlaneLanding>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-ssr] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Navigation$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/navigation.js [app-ssr] (ecmascript) <export default as Navigation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/building-2.js [app-ssr] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-ssr] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shuffle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Shuffle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shuffle.js [app-ssr] (ecmascript) <export default as Shuffle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wind$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wind$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wind.js [app-ssr] (ecmascript) <export default as Wind>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$cloud$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Cloud$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/cloud.js [app-ssr] (ecmascript) <export default as Cloud>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-ssr] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/info.js [app-ssr] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-hot-toast/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$book$2f$book$2d$flight$2d$map$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/book/book-flight-map.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
const toRad = (deg)=>deg * Math.PI / 180;
const getGreatCircleDistanceNm = (lat1, lng1, lat2, lng2)=>{
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadiusKm = 6371;
    const km = earthRadiusKm * c;
    return km / 1.852;
};
const estimateDurationMin = (distanceNm)=>{
    if (!Number.isFinite(distanceNm) || distanceNm <= 0) return 0;
    const cruiseSpeedKts = 440;
    const blockBufferMin = 18;
    return Math.max(25, Math.round(distanceNm / cruiseSpeedKts * 60 + blockBufferMin));
};
function BookFlightPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const fmt = (min)=>`${Math.floor(min / 60)}h ${min % 60}m`;
    const [selectedDestinationIcao, setSelectedDestinationIcao] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [aircraftFilter, setAircraftFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [bookingAction, setBookingAction] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [jumpDisplayLeg, setJumpDisplayLeg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [windEnabled, setWindEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [cloudEnabled, setCloudEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [visibilityEnabled, setVisibilityEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [rangeRingEnabled, setRangeRingEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Fetch current pilot info
    const { data: pilot } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            'current-pilot'
        ],
        queryFn: ()=>fetch('/api/pilot/profile').then((r)=>r.json())
    });
    const { data: airlines = [], isLoading: loadingAirlines } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            'user-airline',
            pilot?.airlineId
        ],
        queryFn: ()=>pilot?.airlineId ? fetch(`/api/airlines?id=${pilot.airlineId}`).then((r)=>r.json()) : Promise.resolve([]),
        enabled: !!pilot
    });
    const selectedAirline = airlines[0] ?? null;
    const { data: routes = [], isLoading: loadingRoutes } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            'routes',
            selectedAirline?.id
        ],
        queryFn: ()=>fetch(`/api/routes?airlineId=${selectedAirline.id}`).then((r)=>r.json()),
        enabled: !!selectedAirline
    });
    const { data: networkData } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            'airline-network',
            selectedAirline?.id
        ],
        queryFn: ()=>fetch('/api/airline/airports').then((r)=>r.json()),
        enabled: !!selectedAirline
    });
    const hubIcao = (networkData?.airlineHub ?? '').trim().toUpperCase();
    const networkAirports = networkData?.airports ?? [];
    // Find the home airport (departure point for flights)
    const homeAirport = networkAirports.find((ap)=>ap.isHome);
    const departureIcao = homeAirport ? homeAirport.airport.icao.trim().toUpperCase() : hubIcao;
    const destinations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const byIcao = new Map();
        // Add all network airports as destinations (excluding the departure airport)
        networkAirports.forEach((netAirport)=>{
            const icao = netAirport.airport.icao.trim().toUpperCase();
            if (icao === departureIcao) return; // Skip the departure airport itself
            byIcao.set(icao, {
                icao,
                name: netAirport.airport.name,
                distance: 0,
                durationMin: 0,
                lat: typeof netAirport.airport.lat === 'number' ? netAirport.airport.lat : null,
                lng: typeof netAirport.airport.lng === 'number' ? netAirport.airport.lng : null,
                aircraftTypes: [],
                routeIds: [],
                connections: 0
            });
        });
        // Enrich with route data (distance, duration, aircraft, actual routes)
        routes.forEach((route)=>{
            const dep = route.depIcao.trim().toUpperCase();
            const arr = route.arrIcao.trim().toUpperCase();
            // Routes from departure to destination
            if (dep === departureIcao && byIcao.has(arr)) {
                const dest = byIcao.get(arr);
                dest.connections += 1;
                dest.routeIds.push(route.id);
                if (dest.distance === 0 || route.distance < dest.distance) {
                    dest.distance = route.distance;
                }
                if (dest.durationMin === 0 || route.flightTime < dest.durationMin) {
                    dest.durationMin = route.flightTime;
                }
                if (route.aircraftType && !dest.aircraftTypes.includes(route.aircraftType)) {
                    dest.aircraftTypes.push(route.aircraftType);
                }
            } else if (arr === departureIcao && byIcao.has(dep)) {
                const dest = byIcao.get(dep);
                dest.connections += 1;
                dest.routeIds.push(route.id);
                if (dest.distance === 0 || route.distance < dest.distance) {
                    dest.distance = route.distance;
                }
                if (dest.durationMin === 0 || route.flightTime < dest.durationMin) {
                    dest.durationMin = route.flightTime;
                }
                if (route.aircraftType && !dest.aircraftTypes.includes(route.aircraftType)) {
                    dest.aircraftTypes.push(route.aircraftType);
                }
            }
        });
        const departureAirport = networkAirports.find((airport)=>airport.airport.icao.trim().toUpperCase() === departureIcao);
        const depLat = departureAirport?.airport.lat;
        const depLng = departureAirport?.airport.lng;
        if (typeof depLat === 'number' && typeof depLng === 'number') {
            byIcao.forEach((dest)=>{
                if (typeof dest.lat !== 'number' || typeof dest.lng !== 'number') return;
                const geodesicDistance = getGreatCircleDistanceNm(depLat, depLng, dest.lat, dest.lng);
                if (!Number.isFinite(geodesicDistance) || geodesicDistance <= 0) return;
                const roundedGeodesic = Math.round(geodesicDistance);
                const distanceMismatch = dest.distance > 0 ? Math.abs(dest.distance - roundedGeodesic) / Math.max(roundedGeodesic, 1) : 1;
                // Prefer geodesic values when route data is missing or clearly inconsistent.
                if (dest.distance <= 0 || distanceMismatch > 0.35) {
                    dest.distance = roundedGeodesic;
                }
                const minimumReasonable = Math.round(dest.distance / 700 * 60);
                const maximumReasonable = Math.round(dest.distance / 250 * 60 + 120);
                const estimatedDuration = estimateDurationMin(dest.distance);
                if (dest.durationMin <= 0 || dest.durationMin < minimumReasonable || dest.durationMin > maximumReasonable) {
                    dest.durationMin = estimatedDuration;
                }
            });
        }
        return Array.from(byIcao.values()).sort((a, b)=>a.icao.localeCompare(b.icao));
    }, [
        networkAirports,
        routes,
        departureIcao
    ]);
    const filteredDestinations = destinations.filter((destination)=>{
        const q = search.toLowerCase();
        const textMatch = !q || destination.icao.toLowerCase().includes(q) || destination.name.toLowerCase().includes(q);
        const aircraftMatch = !aircraftFilter || destination.aircraftTypes.some((aircraft)=>aircraft.toLowerCase().includes(aircraftFilter.toLowerCase()));
        return textMatch && aircraftMatch;
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!selectedDestinationIcao && filteredDestinations.length > 0) {
            setSelectedDestinationIcao(filteredDestinations[0].icao);
            return;
        }
        if (selectedDestinationIcao && !filteredDestinations.some((destination)=>destination.icao === selectedDestinationIcao)) {
            setSelectedDestinationIcao(filteredDestinations[0]?.icao ?? null);
        }
    }, [
        filteredDestinations,
        selectedDestinationIcao
    ]);
    const selectedDestination = filteredDestinations.find((destination)=>destination.icao === selectedDestinationIcao) ?? null;
    const routeSummary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (jumpDisplayLeg) {
            return {
                dep: jumpDisplayLeg.dep,
                arr: jumpDisplayLeg.arr,
                distance: selectedDestination?.distance ?? 0,
                duration: fmt(selectedDestination?.durationMin ?? 0),
                aircraft: selectedDestination?.aircraftTypes[0] ?? 'Any'
            };
        }
        if (!selectedDestination) {
            return {
                dep: departureIcao || '----',
                arr: '----',
                distance: 0,
                duration: '0h 00m',
                aircraft: 'Any'
            };
        }
        return {
            dep: departureIcao || '----',
            arr: selectedDestination.icao,
            distance: selectedDestination.distance,
            duration: fmt(selectedDestination.durationMin),
            aircraft: selectedDestination.aircraftTypes[0] ?? 'Any'
        };
    }, [
        selectedDestination,
        departureIcao,
        jumpDisplayLeg
    ]);
    const activeJumpLeg = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!selectedDestination) return null;
        if (jumpDisplayLeg) {
            return {
                dep: jumpDisplayLeg.dep,
                arr: jumpDisplayLeg.arr
            };
        }
        return {
            dep: selectedDestination.icao,
            arr: departureIcao
        };
    }, [
        selectedDestination,
        departureIcao,
        jumpDisplayLeg
    ]);
    const jumpRoute = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!activeJumpLeg) return null;
        return findRouteForLeg(activeJumpLeg.dep, activeJumpLeg.arr);
    }, [
        activeJumpLeg,
        routes
    ]);
    const canJumpToHome = Boolean(activeJumpLeg && activeJumpLeg.dep !== activeJumpLeg.arr);
    const icaoQuery = Array.from(new Set([
        departureIcao,
        ...destinations.map((destination)=>destination.icao)
    ].filter(Boolean))).join(',');
    const { data: airports = [] } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            'book-airports',
            icaoQuery
        ],
        queryFn: ()=>fetch(`/api/tracking/airports?icao=${encodeURIComponent(icaoQuery)}`).then((r)=>r.json()),
        enabled: icaoQuery.length > 0
    });
    const airportsByIcao = Object.fromEntries(airports.map((airport)=>[
            airport.icao.toUpperCase(),
            airport
        ]));
    function findRouteForLeg(depIcao, arrIcao) {
        const dep = depIcao.trim().toUpperCase();
        const arr = arrIcao.trim().toUpperCase();
        const directMatches = routes.filter((route)=>route.depIcao.trim().toUpperCase() === dep && route.arrIcao.trim().toUpperCase() === arr);
        if (directMatches.length === 0) return null;
        // Prefer shortest direct leg when multiple schedules exist.
        return directMatches.reduce((best, current)=>current.distance < best.distance ? current : best, directMatches[0]);
    }
    const submitBooking = async (payload, action)=>{
        setBookingAction(action);
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        setBookingAction(null);
        if (res.ok) {
            const bookingId = data.bookingId ?? data.id;
            if (!bookingId) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].error('Booking created but no booking ID returned');
                return;
            }
            if (action === 'dispatch') {
                setJumpDisplayLeg(null);
                const routeId = payload.routeId?.trim();
                if (!routeId) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].error('Flight booked but route ID is missing');
                    return;
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].success('Flight dispatched! Opening route details...');
                router.push(`/dashboard/routes/${routeId}?bookingId=${bookingId}`);
            } else {
                if (payload.depIcao && payload.arrIcao) {
                    const dep = payload.depIcao.trim().toUpperCase();
                    const arr = payload.arrIcao.trim().toUpperCase();
                    setJumpDisplayLeg({
                        dep: arr,
                        arr: dep
                    });
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].success(`Jump booked: ${payload.depIcao ?? '----'} -> ${payload.arrIcao ?? '----'}`);
            }
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].error(data.error ?? 'Booking failed');
        }
    };
    const bookDestination = async ()=>{
        if (!selectedDestination) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].error('Select a destination first');
            return;
        }
        const outboundRoute = findRouteForLeg(departureIcao, selectedDestination.icao);
        if (!outboundRoute) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].error(`No direct route found from ${departureIcao} to ${selectedDestination.icao}`);
            return;
        }
        setJumpDisplayLeg(null);
        await submitBooking({
            routeId: outboundRoute.id
        }, 'dispatch');
    };
    const jumpToHome = async ()=>{
        if (!selectedDestination || !activeJumpLeg) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].error('Select a destination first');
            return;
        }
        if (activeJumpLeg.dep === activeJumpLeg.arr) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].error('Jump leg is already complete');
            return;
        }
        await submitBooking({
            routeId: jumpRoute?.id,
            depIcao: activeJumpLeg.dep,
            arrIcao: activeJumpLeg.arr,
            allowAdhocRoute: true
        }, 'jump');
    };
    const openAirportInfo = (icao)=>{
        const normalized = icao.trim().toUpperCase();
        if (normalized.length !== 4) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hot$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].error('Airport ICAO is not available yet');
            return;
        }
        router.push(`/dashboard/airports/${normalized}`);
    };
    if (loadingAirlines || !pilot) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "card",
            children: "Loading Book Flight..."
        }, void 0, false, {
            fileName: "[project]/src/app/dashboard/book/page.tsx",
            lineNumber: 426,
            columnNumber: 12
        }, this);
    }
    if (!pilot?.airlineId || !selectedAirline) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "card text-center py-16",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"], {
                    className: "mx-auto mb-3 h-10 w-10 text-slate-500"
                }, void 0, false, {
                    fileName: "[project]/src/app/dashboard/book/page.tsx",
                    lineNumber: 432,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mb-4 text-slate-500",
                    children: "You are not assigned to an airline yet."
                }, void 0, false, {
                    fileName: "[project]/src/app/dashboard/book/page.tsx",
                    lineNumber: 433,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: ()=>router.push('/dashboard/airlines'),
                    className: "btn-primary",
                    children: "Browse Airlines"
                }, void 0, false, {
                    fileName: "[project]/src/app/dashboard/book/page.tsx",
                    lineNumber: 434,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/dashboard/book/page.tsx",
            lineNumber: 431,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative rounded-2xl bg-[#dfe7ef] p-3 md:p-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-2 px-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "section-title",
                        children: "Book a Flight"
                    }, void 0, false, {
                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                        lineNumber: 444,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "section-subtitle mt-1",
                        children: [
                            selectedAirline.name,
                            " · Home ",
                            departureIcao,
                            " · ",
                            filteredDestinations.length,
                            " destinations"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                        lineNumber: 445,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/dashboard/book/page.tsx",
                lineNumber: 443,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$book$2f$book$2d$flight$2d$map$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        hubIcao: departureIcao,
                        destinations: destinations,
                        airportsByIcao: airportsByIcao,
                        selectedDestinationIcao: selectedDestinationIcao,
                        onSelectDestination: setSelectedDestinationIcao,
                        windEnabled: windEnabled,
                        cloudEnabled: cloudEnabled,
                        visibilityEnabled: visibilityEnabled,
                        rangeRingEnabled: rangeRingEnabled
                    }, void 0, false, {
                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                        lineNumber: 451,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        className: "absolute left-3 top-3 z-[500] w-[280px] rounded-3xl border border-white/60 bg-[#d8e4ea]/90 p-4 shadow-xl backdrop-blur",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-[34px] leading-none text-slate-200",
                                children: "."
                            }, void 0, false, {
                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                lineNumber: 464,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "-mt-4 mb-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-[36px] leading-none text-transparent",
                                    children: "."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/dashboard/book/page.tsx",
                                    lineNumber: 466,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                lineNumber: 465,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "-mt-8 mb-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-4xl leading-none text-transparent",
                                    children: "."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/dashboard/book/page.tsx",
                                    lineNumber: 469,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                lineNumber: 468,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "-mt-14 mb-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-3xl leading-none text-transparent",
                                    children: "."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/dashboard/book/page.tsx",
                                    lineNumber: 473,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                lineNumber: 472,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-[34px] leading-none text-transparent",
                                    children: "."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/dashboard/book/page.tsx",
                                    lineNumber: 477,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                lineNumber: 476,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "-mt-[160px] space-y-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[33px] leading-none text-transparent",
                                            children: "."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/dashboard/book/page.tsx",
                                            lineNumber: 482,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 481,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "-mt-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-3xl font-extrabold text-slate-900",
                                                children: "Book a Flight"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 486,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-500",
                                                children: "Review route details"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 487,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 485,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl border border-white/70 bg-white/80 p-2.5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plane$2d$takeoff$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PlaneTakeoff$3e$__["PlaneTakeoff"], {
                                                                className: "h-3.5 w-3.5"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                                lineNumber: 493,
                                                                columnNumber: 19
                                                            }, this),
                                                            " Departure"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 492,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-1 text-[30px] font-black tracking-tight text-slate-900",
                                                        children: routeSummary.dep
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 495,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-xs text-slate-500",
                                                        children: "Hub"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 496,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 491,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl border border-white/70 bg-white/80 p-2.5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plane$2d$landing$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PlaneLanding$3e$__["PlaneLanding"], {
                                                                className: "h-3.5 w-3.5"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                                lineNumber: 500,
                                                                columnNumber: 19
                                                            }, this),
                                                            " Arrival"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 499,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-1 text-[30px] font-black tracking-tight text-slate-900",
                                                        children: routeSummary.arr
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 502,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-xs text-slate-500",
                                                        children: "Destination"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 503,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 498,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 490,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>{
                                            if (filteredDestinations.length === 0) return;
                                            const random = filteredDestinations[Math.floor(Math.random() * filteredDestinations.length)];
                                            setJumpDisplayLeg(null);
                                            setSelectedDestinationIcao(random.icao);
                                        },
                                        className: "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2.5 text-sm font-semibold text-white shadow",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shuffle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Shuffle$3e$__["Shuffle"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 517,
                                                columnNumber: 15
                                            }, this),
                                            " Pick Random Destination"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 507,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl border border-white/70 bg-white/80 p-2.5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] font-semibold uppercase text-slate-500",
                                                        children: "Aircraft"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 522,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-lg font-bold text-slate-900",
                                                        children: routeSummary.aircraft
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 523,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 521,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl border border-white/70 bg-white/80 p-2.5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] font-semibold uppercase text-slate-500",
                                                        children: "Operator"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 526,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-lg font-bold text-slate-900",
                                                        children: selectedAirline.callsignPrefix
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 527,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 525,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl border border-white/70 bg-white/80 p-2.5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] font-semibold uppercase text-slate-500",
                                                        children: "Duration"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 530,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-lg font-bold text-slate-900",
                                                        children: routeSummary.duration
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 531,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 529,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-xl border border-white/70 bg-white/80 p-2.5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] font-semibold uppercase text-slate-500",
                                                        children: "Distance"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 534,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-lg font-bold text-slate-900",
                                                        children: [
                                                            routeSummary.distance.toLocaleString(),
                                                            " NM"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 535,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 533,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 520,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "relative",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                                className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 540,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                className: "input bg-white/80 pl-9",
                                                placeholder: "Search airport, city, flight",
                                                value: search,
                                                onChange: (e)=>setSearch(e.target.value)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 541,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 539,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid gap-2",
                                        children: [
                                            {
                                                label: 'Wind Speed',
                                                enabled: windEnabled,
                                                setEnabled: setWindEnabled,
                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wind$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wind$3e$__["Wind"]
                                            },
                                            {
                                                label: 'Cloud Layers',
                                                enabled: cloudEnabled,
                                                setEnabled: setCloudEnabled,
                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$cloud$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Cloud$3e$__["Cloud"]
                                            },
                                            {
                                                label: 'Surface Visibility',
                                                enabled: visibilityEnabled,
                                                setEnabled: setVisibilityEnabled,
                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"]
                                            },
                                            {
                                                label: 'Range Rings',
                                                enabled: rangeRingEnabled,
                                                setEnabled: setRangeRingEnabled,
                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Navigation$3e$__["Navigation"]
                                            }
                                        ].map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>item.setEnabled(!item.enabled),
                                                className: "flex items-center justify-between rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "inline-flex items-center gap-2 text-slate-700",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(item.icon, {
                                                                className: "h-4 w-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                                lineNumber: 563,
                                                                columnNumber: 21
                                                            }, this),
                                                            " ",
                                                            item.label
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 562,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `inline-flex h-6 w-11 items-center rounded-full p-1 ${item.enabled ? 'bg-emerald-400' : 'bg-slate-300'}`,
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: `h-4 w-4 rounded-full bg-white transition ${item.enabled ? 'translate-x-5' : 'translate-x-0'}`
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                            lineNumber: 566,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 565,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, item.label, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 556,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 549,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: bookDestination,
                                        disabled: !selectedDestination || bookingAction !== null,
                                        className: "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-3 text-sm font-bold text-white shadow disabled:opacity-60",
                                        children: [
                                            bookingAction === 'dispatch' ? 'Dispatching...' : 'Dispatch Flight',
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 578,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 572,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: jumpToHome,
                                        disabled: !canJumpToHome || bookingAction !== null,
                                        className: "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-3 text-sm font-bold text-slate-800 shadow disabled:opacity-60",
                                        title: activeJumpLeg && jumpRoute ? 'Jump using scheduled return route' : 'Jump with auto route if schedule does not exist',
                                        children: [
                                            bookingAction === 'jump' ? 'Jumping...' : activeJumpLeg && canJumpToHome ? `Jump ${activeJumpLeg.dep} -> ${activeJumpLeg.arr}` : `Jump unavailable`,
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Navigation$3e$__["Navigation"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 597,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 581,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>openAirportInfo(routeSummary.dep),
                                                className: "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-sky-800 shadow",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                        className: "h-3.5 w-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 606,
                                                        columnNumber: 17
                                                    }, this),
                                                    routeSummary.dep,
                                                    " Info"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 601,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>openAirportInfo(routeSummary.arr),
                                                disabled: routeSummary.arr === '----',
                                                className: "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-sky-800 shadow disabled:opacity-60",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                        className: "h-3.5 w-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                        lineNumber: 615,
                                                        columnNumber: 17
                                                    }, this),
                                                    routeSummary.arr,
                                                    " Info"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                                lineNumber: 609,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                                        lineNumber: 600,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/dashboard/book/page.tsx",
                                lineNumber: 480,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/dashboard/book/page.tsx",
                        lineNumber: 463,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/dashboard/book/page.tsx",
                lineNumber: 450,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/dashboard/book/page.tsx",
        lineNumber: 442,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_7073db98._.js.map