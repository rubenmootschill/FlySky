(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/book/book-flight-map.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BookFlightMap
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/mapbox-gl/dist/mapbox-gl.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
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
const createCircleRingFeature = function(centerLng, centerLat, radiusNm) {
    let steps = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 128;
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
            label: "".concat(radiusNm, " NM")
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
        source === null || source === void 0 ? void 0 : source.setData(data);
    } catch (e) {
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
                "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/".concat(getCloudRasterDate(), "/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg")
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
                "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/".concat(getCloudRasterDate(), "/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg")
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
function BookFlightMap(param) {
    let { hubIcao, destinations, airportsByIcao, selectedDestinationIcao, onSelectDestination, windEnabled = true, cloudEnabled = false, visibilityEnabled = true, rangeRingEnabled = false } = param;
    _s();
    const mapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const weatherRequestRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const weatherCacheRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const weatherCooldownUntilRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const weatherTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const markerAnimationRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const hoveredAirportIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [mapReady, setMapReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookFlightMap.useEffect": ()=>{
            if ("object" === 'undefined' || !containerRef.current) return;
            if (mapRef.current) return;
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].accessToken = MAPBOX_TOKEN;
            const map = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Map({
                container: containerRef.current,
                style: 'mapbox://styles/mapbox/light-v11',
                center: [
                    15,
                    44
                ],
                zoom: 2.4,
                projection: 'globe',
                attributionControl: true,
                renderWorldCopies: false,
                antialias: true
            });
            map.dragRotate.disable();
            map.touchZoomRotate.disableRotation();
            const container = containerRef.current;
            container.style.userSelect = 'none';
            container.style.webkitUserSelect = 'none';
            container.addEventListener('selectstart', {
                "BookFlightMap.useEffect": (event)=>event.preventDefault()
            }["BookFlightMap.useEffect"]);
            container.addEventListener('mousedown', {
                "BookFlightMap.useEffect": (event)=>{
                    if (event.detail > 1) event.preventDefault();
                }
            }["BookFlightMap.useEffect"]);
            map.on('load', {
                "BookFlightMap.useEffect": async ()=>{
                    map.setFog({
                        color: 'rgb(215, 232, 246)',
                        'high-color': 'rgb(190, 215, 235)',
                        'horizon-blend': 0.04,
                        'space-color': 'rgb(13, 22, 33)',
                        'star-intensity': 0.24
                    });
                    await ensureMarkerImages(map);
                    ensureSourcesAndLayers(map);
                    map.on('click', 'book-routes-hit-layer', {
                        "BookFlightMap.useEffect": (event)=>{
                            var _event_features__properties, _event_features_, _event_features;
                            const destinationIcao = (_event_features = event.features) === null || _event_features === void 0 ? void 0 : (_event_features_ = _event_features[0]) === null || _event_features_ === void 0 ? void 0 : (_event_features__properties = _event_features_.properties) === null || _event_features__properties === void 0 ? void 0 : _event_features__properties.destinationIcao;
                            if (typeof destinationIcao === 'string') {
                                onSelectDestination(destinationIcao);
                            }
                        }
                    }["BookFlightMap.useEffect"]);
                    map.on('click', 'book-airports-layer', {
                        "BookFlightMap.useEffect": (event)=>{
                            var _event_features, _feature_properties, _feature_properties1;
                            const feature = (_event_features = event.features) === null || _event_features === void 0 ? void 0 : _event_features[0];
                            const destinationIcao = feature === null || feature === void 0 ? void 0 : (_feature_properties = feature.properties) === null || _feature_properties === void 0 ? void 0 : _feature_properties.destinationIcao;
                            const selectable = (feature === null || feature === void 0 ? void 0 : (_feature_properties1 = feature.properties) === null || _feature_properties1 === void 0 ? void 0 : _feature_properties1.selectable) === 'true';
                            if (selectable && typeof destinationIcao === 'string') {
                                onSelectDestination(destinationIcao);
                            }
                        }
                    }["BookFlightMap.useEffect"]);
                    map.on('mouseenter', 'book-routes-hit-layer', {
                        "BookFlightMap.useEffect": ()=>{
                            map.getCanvas().style.cursor = 'pointer';
                        }
                    }["BookFlightMap.useEffect"]);
                    map.on('mouseleave', 'book-routes-hit-layer', {
                        "BookFlightMap.useEffect": ()=>{
                            map.getCanvas().style.cursor = '';
                        }
                    }["BookFlightMap.useEffect"]);
                    map.on('mouseenter', 'book-airports-layer', {
                        "BookFlightMap.useEffect": ()=>{
                            map.getCanvas().style.cursor = 'pointer';
                        }
                    }["BookFlightMap.useEffect"]);
                    map.on('mousemove', 'book-airports-layer', {
                        "BookFlightMap.useEffect": (event)=>{
                            var _event_features_, _event_features;
                            const nextId = (_event_features = event.features) === null || _event_features === void 0 ? void 0 : (_event_features_ = _event_features[0]) === null || _event_features_ === void 0 ? void 0 : _event_features_.id;
                            if (hoveredAirportIdRef.current !== null && hoveredAirportIdRef.current !== nextId) {
                                map.setFeatureState({
                                    source: AIRPORTS_SOURCE_ID,
                                    id: hoveredAirportIdRef.current
                                }, {
                                    hover: false
                                });
                            }
                            if (nextId !== undefined && nextId !== null && hoveredAirportIdRef.current !== nextId) {
                                hoveredAirportIdRef.current = nextId;
                                map.setFeatureState({
                                    source: AIRPORTS_SOURCE_ID,
                                    id: nextId
                                }, {
                                    hover: true
                                });
                            }
                        }
                    }["BookFlightMap.useEffect"]);
                    map.on('mouseleave', 'book-airports-layer', {
                        "BookFlightMap.useEffect": ()=>{
                            map.getCanvas().style.cursor = '';
                            if (hoveredAirportIdRef.current !== null) {
                                map.setFeatureState({
                                    source: AIRPORTS_SOURCE_ID,
                                    id: hoveredAirportIdRef.current
                                }, {
                                    hover: false
                                });
                                hoveredAirportIdRef.current = null;
                            }
                        }
                    }["BookFlightMap.useEffect"]);
                    setMapReady(true);
                }
            }["BookFlightMap.useEffect"]);
            mapRef.current = map;
            return ({
                "BookFlightMap.useEffect": ()=>{
                    if (weatherTimerRef.current) {
                        clearTimeout(weatherTimerRef.current);
                        weatherTimerRef.current = null;
                    }
                    if (markerAnimationRef.current !== null) {
                        window.cancelAnimationFrame(markerAnimationRef.current);
                        markerAnimationRef.current = null;
                    }
                    map.remove();
                    mapRef.current = null;
                    setMapReady(false);
                }
            })["BookFlightMap.useEffect"];
        }
    }["BookFlightMap.useEffect"], [
        onSelectDestination
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookFlightMap.useEffect": ()=>{
            if (!mapReady || !mapRef.current) return;
            const map = mapRef.current;
            const hub = airportsByIcao[hubIcao];
            if (!hub) return;
            const routeFeatures = destinations.map({
                "BookFlightMap.useEffect.routeFeatures": (destination)=>{
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
                }
            }["BookFlightMap.useEffect.routeFeatures"]).filter(Boolean);
            const glowFeatures = destinations.filter({
                "BookFlightMap.useEffect.glowFeatures": (destination)=>selectedDestinationIcao === destination.icao
            }["BookFlightMap.useEffect.glowFeatures"]).map({
                "BookFlightMap.useEffect.glowFeatures": (destination)=>{
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
                }
            }["BookFlightMap.useEffect.glowFeatures"]).filter(Boolean);
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
                ...destinations.map({
                    "BookFlightMap.useEffect": (destination)=>{
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
                    }
                }["BookFlightMap.useEffect"]).filter(Boolean)
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
        }
    }["BookFlightMap.useEffect"], [
        mapReady,
        hubIcao,
        destinations,
        airportsByIcao,
        selectedDestinationIcao
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookFlightMap.useEffect": ()=>{
            if (!mapReady || !mapRef.current) return;
            let disposed = false;
            const animateMarkers = {
                "BookFlightMap.useEffect.animateMarkers": ()=>{
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
                    } catch (e) {
                        return;
                    }
                    markerAnimationRef.current = window.requestAnimationFrame(animateMarkers);
                }
            }["BookFlightMap.useEffect.animateMarkers"];
            markerAnimationRef.current = window.requestAnimationFrame(animateMarkers);
            return ({
                "BookFlightMap.useEffect": ()=>{
                    disposed = true;
                    if (markerAnimationRef.current !== null) {
                        window.cancelAnimationFrame(markerAnimationRef.current);
                        markerAnimationRef.current = null;
                    }
                }
            })["BookFlightMap.useEffect"];
        }
    }["BookFlightMap.useEffect"], [
        mapReady
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookFlightMap.useEffect": ()=>{
            if (!mapReady || !mapRef.current) return;
            const map = mapRef.current;
            const hub = airportsByIcao[hubIcao];
            if (!hub) return;
            const bounds = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$mapbox$2d$gl$2f$dist$2f$mapbox$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].LngLatBounds([
                hub.lng,
                hub.lat
            ], [
                hub.lng,
                hub.lat
            ]);
            destinations.forEach({
                "BookFlightMap.useEffect": (destination)=>{
                    const airport = airportsByIcao[destination.icao];
                    if (!airport) return;
                    bounds.extend([
                        airport.lng,
                        airport.lat
                    ]);
                }
            }["BookFlightMap.useEffect"]);
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
        }
    }["BookFlightMap.useEffect"], [
        mapReady,
        hubIcao,
        destinations,
        airportsByIcao
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookFlightMap.useEffect": ()=>{
            if (!mapReady || !mapRef.current) return;
            const map = mapRef.current;
            const hub = airportsByIcao[hubIcao];
            const clearWeatherSources = {
                "BookFlightMap.useEffect.clearWeatherSources": ()=>{
                    setGeoJsonData(map, RANGE_RINGS_SOURCE_ID, emptyFeatureCollection());
                    setGeoJsonData(map, WEATHER_VISIBILITY_SOURCE_ID, emptyFeatureCollection());
                    setGeoJsonData(map, WEATHER_WIND_SOURCE_ID, emptyFeatureCollection());
                }
            }["BookFlightMap.useEffect.clearWeatherSources"];
            if (!hub) {
                clearWeatherSources();
                return;
            }
            let disposed = false;
            const drawWeatherData = {
                "BookFlightMap.useEffect.drawWeatherData": (cells, weatherRows, step)=>{
                    const visibilityFeatures = [];
                    const windFeatures = [];
                    cells.forEach({
                        "BookFlightMap.useEffect.drawWeatherData": (cell, index)=>{
                            var _weatherRows_index;
                            const current = (_weatherRows_index = weatherRows[index]) === null || _weatherRows_index === void 0 ? void 0 : _weatherRows_index.current;
                            if (!current) return;
                            if (visibilityEnabled) {
                                var _current_visibility;
                                const visibilityKm = Number((_current_visibility = current.visibility) !== null && _current_visibility !== void 0 ? _current_visibility : 10000) / 1000;
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
                                var _current_wind_speed_10m;
                                const windSpeed = Number((_current_wind_speed_10m = current.wind_speed_10m) !== null && _current_wind_speed_10m !== void 0 ? _current_wind_speed_10m : 0);
                                var _current_wind_direction_10m;
                                const windDirection = Number((_current_wind_direction_10m = current.wind_direction_10m) !== null && _current_wind_direction_10m !== void 0 ? _current_wind_direction_10m : 0);
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
                        }
                    }["BookFlightMap.useEffect.drawWeatherData"]);
                    setGeoJsonData(map, WEATHER_VISIBILITY_SOURCE_ID, {
                        type: 'FeatureCollection',
                        features: visibilityFeatures
                    });
                    setGeoJsonData(map, WEATHER_WIND_SOURCE_ID, {
                        type: 'FeatureCollection',
                        features: windFeatures
                    });
                }
            }["BookFlightMap.useEffect.drawWeatherData"];
            const renderWeather = {
                "BookFlightMap.useEffect.renderWeather": async ()=>{
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
                    ].map({
                        "BookFlightMap.useEffect.renderWeather": (distanceNm)=>createCircleRingFeature(hub.lng, hub.lat, distanceNm)
                    }["BookFlightMap.useEffect.renderWeather"]) : [];
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
                        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=".concat(cells.map({
                            "BookFlightMap.useEffect.renderWeather": (cell)=>cell.centerLat.toFixed(3)
                        }["BookFlightMap.useEffect.renderWeather"]).join(','), "&longitude=").concat(cells.map({
                            "BookFlightMap.useEffect.renderWeather": (cell)=>cell.centerLng.toFixed(3)
                        }["BookFlightMap.useEffect.renderWeather"]).join(','), "&current=").concat(currentVars.join(','), "&wind_speed_unit=kn"));
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
                    } catch (e) {
                        if (disposed || requestId !== weatherRequestRef.current) {
                            return;
                        }
                    }
                }
            }["BookFlightMap.useEffect.renderWeather"];
            const scheduleWeatherRender = {
                "BookFlightMap.useEffect.scheduleWeatherRender": ()=>{
                    if (weatherTimerRef.current) {
                        clearTimeout(weatherTimerRef.current);
                    }
                    weatherTimerRef.current = setTimeout({
                        "BookFlightMap.useEffect.scheduleWeatherRender": ()=>{
                            renderWeather();
                        }
                    }["BookFlightMap.useEffect.scheduleWeatherRender"], WEATHER_DEBOUNCE_MS);
                }
            }["BookFlightMap.useEffect.scheduleWeatherRender"];
            renderWeather();
            map.on('moveend', scheduleWeatherRender);
            map.on('zoomend', scheduleWeatherRender);
            return ({
                "BookFlightMap.useEffect": ()=>{
                    disposed = true;
                    if (weatherTimerRef.current) {
                        clearTimeout(weatherTimerRef.current);
                        weatherTimerRef.current = null;
                    }
                    map.off('moveend', scheduleWeatherRender);
                    map.off('zoomend', scheduleWeatherRender);
                    clearWeatherSources();
                }
            })["BookFlightMap.useEffect"];
        }
    }["BookFlightMap.useEffect"], [
        mapReady,
        hubIcao,
        airportsByIcao,
        windEnabled,
        cloudEnabled,
        visibilityEnabled,
        rangeRingEnabled
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
_s(BookFlightMap, "lmr9MGMZnWA2+vyVHPAiVXZDz2A=");
_c = BookFlightMap;
var _c;
__turbopack_context__.k.register(_c, "BookFlightMap");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/dashboard/booking/[id]/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BookingDetailsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plane$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plane$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plane.js [app-client] (ecmascript) <export default as Plane>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$book$2f$book$2d$flight$2d$map$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/book/book-flight-map.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function formatHm(minutes) {
    const h = Math.floor(Math.max(minutes, 0) / 60);
    const m = Math.max(minutes, 0) % 60;
    return "".concat(h.toString().padStart(2, '0'), ":").concat(m.toString().padStart(2, '0'));
}
function BookingDetailsPage() {
    var _dispatchData_callsign, _dispatchData_flightNumber, _booking_aircraft, _booking_aircraft1, _dispatchData_costIndex, _dispatchData_passengers, _dispatchData_passengersWithLuggage, _dispatchData_freight, _dispatchData_network;
    _s();
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    var _params_id;
    const bookingId = ((_params_id = params === null || params === void 0 ? void 0 : params.id) !== null && _params_id !== void 0 ? _params_id : '').trim();
    const { data: booking, isLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            'booking-details',
            bookingId
        ],
        queryFn: {
            "BookingDetailsPage.useQuery": async ()=>{
                const response = await fetch("/api/bookings/".concat(bookingId));
                const data = await response.json();
                if (!response.ok) {
                    throw new Error((data === null || data === void 0 ? void 0 : data.error) || 'Failed to load booking');
                }
                return data;
            }
        }["BookingDetailsPage.useQuery"],
        enabled: Boolean(bookingId)
    });
    const route = booking === null || booking === void 0 ? void 0 : booking.route;
    const dispatchData = booking === null || booking === void 0 ? void 0 : booking.dispatchData;
    const savedCallsign = (dispatchData === null || dispatchData === void 0 ? void 0 : (_dispatchData_callsign = dispatchData.callsign) === null || _dispatchData_callsign === void 0 ? void 0 : _dispatchData_callsign.trim()) || '';
    const savedFlightNumber = (dispatchData === null || dispatchData === void 0 ? void 0 : (_dispatchData_flightNumber = dispatchData.flightNumber) === null || _dispatchData_flightNumber === void 0 ? void 0 : _dispatchData_flightNumber.trim()) || '';
    const effectiveFlightNumber = savedFlightNumber || (route === null || route === void 0 ? void 0 : route.flightNumber) || 'N/A';
    const airportQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[airportQuery]": ()=>{
            if (!route) return '';
            return [
                route.depIcao,
                route.arrIcao
            ].map({
                "BookingDetailsPage.useMemo[airportQuery]": (icao)=>icao.trim().toUpperCase()
            }["BookingDetailsPage.useMemo[airportQuery]"]).filter(Boolean).join(',');
        }
    }["BookingDetailsPage.useMemo[airportQuery]"], [
        route
    ]);
    const { data: mapAirports = [] } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            'booking-map-airports',
            airportQuery
        ],
        queryFn: {
            "BookingDetailsPage.useQuery": async ()=>{
                const response = await fetch("/api/tracking/airports?icao=".concat(encodeURIComponent(airportQuery)));
                if (!response.ok) return [];
                return response.json();
            }
        }["BookingDetailsPage.useQuery"],
        enabled: airportQuery.length > 0
    });
    const airportsByIcao = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[airportsByIcao]": ()=>Object.fromEntries(mapAirports.map({
                "BookingDetailsPage.useMemo[airportsByIcao]": (airport)=>[
                        airport.icao.toUpperCase(),
                        airport
                    ]
            }["BookingDetailsPage.useMemo[airportsByIcao]"]))
    }["BookingDetailsPage.useMemo[airportsByIcao]"], [
        mapAirports
    ]);
    const mapDestinations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[mapDestinations]": ()=>{
            if (!route) return [];
            return [
                {
                    icao: route.arrIcao,
                    name: route.arrName,
                    distance: route.distance,
                    durationMin: route.flightTime,
                    aircraftTypes: route.aircraftType ? [
                        route.aircraftType
                    ] : [],
                    routeIds: [
                        route.id
                    ],
                    connections: 1
                }
            ];
        }
    }["BookingDetailsPage.useMemo[mapDestinations]"], [
        route
    ]);
    const depAirportName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[depAirportName]": ()=>{
            var _airportsByIcao_route_depIcao_toUpperCase;
            if (!route) return '';
            const fromLookup = (_airportsByIcao_route_depIcao_toUpperCase = airportsByIcao[route.depIcao.toUpperCase()]) === null || _airportsByIcao_route_depIcao_toUpperCase === void 0 ? void 0 : _airportsByIcao_route_depIcao_toUpperCase.name;
            return fromLookup || route.depName;
        }
    }["BookingDetailsPage.useMemo[depAirportName]"], [
        airportsByIcao,
        route
    ]);
    const arrAirportName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[arrAirportName]": ()=>{
            var _airportsByIcao_route_arrIcao_toUpperCase;
            if (!route) return '';
            const fromLookup = (_airportsByIcao_route_arrIcao_toUpperCase = airportsByIcao[route.arrIcao.toUpperCase()]) === null || _airportsByIcao_route_arrIcao_toUpperCase === void 0 ? void 0 : _airportsByIcao_route_arrIcao_toUpperCase.name;
            return fromLookup || route.arrName;
        }
    }["BookingDetailsPage.useMemo[arrAirportName]"], [
        airportsByIcao,
        route
    ]);
    const timeline = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[timeline]": ()=>{
            if (!route) return {
                std: '--:--',
                sta: '--:--',
                duration: '00:00'
            };
            const toHHmm = {
                "BookingDetailsPage.useMemo[timeline].toHHmm": (isoLike)=>{
                    if (!isoLike) return '';
                    const parsed = new Date(isoLike);
                    if (Number.isNaN(parsed.getTime())) return '';
                    return "".concat(parsed.getHours().toString().padStart(2, '0'), ":").concat(parsed.getMinutes().toString().padStart(2, '0'));
                }
            }["BookingDetailsPage.useMemo[timeline].toHHmm"];
            var _dispatchData_departureTime;
            const savedStd = toHHmm((_dispatchData_departureTime = dispatchData === null || dispatchData === void 0 ? void 0 : dispatchData.departureTime) !== null && _dispatchData_departureTime !== void 0 ? _dispatchData_departureTime : null);
            var _dispatchData_arrivalTime;
            const savedSta = toHHmm((_dispatchData_arrivalTime = dispatchData === null || dispatchData === void 0 ? void 0 : dispatchData.arrivalTime) !== null && _dispatchData_arrivalTime !== void 0 ? _dispatchData_arrivalTime : null);
            if (savedStd && savedSta) {
                return {
                    std: savedStd,
                    sta: savedSta,
                    duration: formatHm(route.flightTime)
                };
            }
            const now = new Date();
            const std = "".concat(now.getHours().toString().padStart(2, '0'), ":").concat(now.getMinutes().toString().padStart(2, '0'));
            const arr = new Date(now.getTime() + route.flightTime * 60 * 1000);
            const sta = "".concat(arr.getHours().toString().padStart(2, '0'), ":").concat(arr.getMinutes().toString().padStart(2, '0'));
            return {
                std,
                sta,
                duration: formatHm(route.flightTime)
            };
        }
    }["BookingDetailsPage.useMemo[timeline]"], [
        route,
        dispatchData === null || dispatchData === void 0 ? void 0 : dispatchData.departureTime,
        dispatchData === null || dispatchData === void 0 ? void 0 : dispatchData.arrivalTime
    ]);
    const displayCallsign = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[displayCallsign]": ()=>{
            if (savedCallsign) return savedCallsign;
            if (!route) return 'N/A';
            return route.flightNumber.startsWith('FIY') ? route.flightNumber : "FIY".concat(route.flightNumber.replace(/\D/g, ''));
        }
    }["BookingDetailsPage.useMemo[displayCallsign]"], [
        route,
        savedCallsign
    ]);
    const routingText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[routingText]": ()=>{
            var _dispatchData_routing;
            if (!route) return 'N/A';
            const savedRouting = dispatchData === null || dispatchData === void 0 ? void 0 : (_dispatchData_routing = dispatchData.routing) === null || _dispatchData_routing === void 0 ? void 0 : _dispatchData_routing.trim();
            if (savedRouting) return savedRouting;
            return "".concat(route.depIcao.toUpperCase(), " DCT ").concat(route.arrIcao.toUpperCase());
        }
    }["BookingDetailsPage.useMemo[routingText]"], [
        route,
        dispatchData === null || dispatchData === void 0 ? void 0 : dispatchData.routing
    ]);
    const expiresText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "BookingDetailsPage.useMemo[expiresText]": ()=>{
            if (!(booking === null || booking === void 0 ? void 0 : booking.expiresAt)) return null;
            const expiry = new Date(booking.expiresAt);
            const diffMs = expiry.getTime() - Date.now();
            if (diffMs <= 0) return 'Booking window expired.';
            const totalMinutes = Math.floor(diffMs / 60000);
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            return "Please start your flight before ".concat(expiry.toLocaleString(), " (").concat(hours, " hours ").concat(mins, " minutes from now).");
        }
    }["BookingDetailsPage.useMemo[expiresText]"], [
        booking === null || booking === void 0 ? void 0 : booking.expiresAt
    ]);
    const hasGeneratedSimBriefOFP = Boolean(booking === null || booking === void 0 ? void 0 : booking.simBriefStaticId);
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "h-4 w-4 animate-spin"
                    }, void 0, false, {
                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                        lineNumber: 189,
                        columnNumber: 11
                    }, this),
                    "Loading booking..."
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                lineNumber: 188,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
            lineNumber: 187,
            columnNumber: 7
        }, this);
    }
    if (!booking || !route) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm",
            children: "Booking not found."
        }, void 0, false, {
            fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
            lineNumber: 198,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative h-72",
                    children: airportsByIcao[route.depIcao.toUpperCase()] && airportsByIcao[route.arrIcao.toUpperCase()] ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$book$2f$book$2d$flight$2d$map$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        hubIcao: route.depIcao.toUpperCase(),
                        destinations: mapDestinations,
                        airportsByIcao: airportsByIcao,
                        selectedDestinationIcao: route.arrIcao.toUpperCase(),
                        onSelectDestination: ()=>{},
                        windEnabled: false,
                        cloudEnabled: false,
                        visibilityEnabled: false,
                        rangeRingEnabled: false
                    }, void 0, false, {
                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                        lineNumber: 209,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex h-full items-center justify-center bg-gradient-to-br from-cyan-300 via-sky-200 to-slate-100",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-xl border border-slate-200 bg-white/95 px-6 py-4 text-center shadow",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-[10px] uppercase tracking-wide text-slate-500",
                                    children: "Route Preview"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                    lineNumber: 223,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-1 text-3xl font-black text-slate-900",
                                    children: [
                                        route.depIcao,
                                        " ",
                                        '->',
                                        " ",
                                        route.arrIcao
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                    lineNumber: 224,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-xs text-slate-600",
                                    children: [
                                        route.depName,
                                        " to ",
                                        route.arrName
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                    lineNumber: 225,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                            lineNumber: 222,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                        lineNumber: 221,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                    lineNumber: 207,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                lineNumber: 206,
                columnNumber: 7
            }, this),
            expiresText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600",
                children: expiresText
            }, void 0, false, {
                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                lineNumber: 233,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-4 xl:grid-cols-[2fr_1fr]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-sm font-semibold uppercase tracking-wide text-slate-800",
                                        children: "Flight Information"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 241,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 grid gap-4 md:grid-cols-4 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Callsign | Flight Number"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 244,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: [
                                                            displayCallsign,
                                                            " | ",
                                                            effectiveFlightNumber
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 245,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 243,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Departure"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 248,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: route.depIcao
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 249,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-slate-600",
                                                        children: depAirportName
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 250,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 247,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Arrival"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 253,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: route.arrIcao
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 254,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-slate-600",
                                                        children: arrAirportName
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 255,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 252,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Booking | Route Number"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 258,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: [
                                                            "#",
                                                            booking.id.slice(0, 8).toUpperCase()
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 259,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 257,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 242,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 grid items-center gap-4 border-y border-slate-200 py-4 md:grid-cols-[1fr_auto_1fr]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Departure"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 265,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-2xl font-semibold text-slate-900",
                                                        children: route.depIcao
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 266,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-sm text-slate-600",
                                                        children: depAirportName
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 267,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 264,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3 text-slate-400",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "h-px w-16 bg-slate-300"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 270,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plane$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plane$3e$__["Plane"], {
                                                        className: "h-5 w-5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 271,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "h-px w-16 bg-slate-300"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 272,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 269,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-left md:text-right",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Arrival"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 275,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-2xl font-semibold text-slate-900",
                                                        children: route.arrIcao
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 276,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-sm text-slate-600",
                                                        children: arrAirportName
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 277,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 274,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 263,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-5 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-4 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "STD"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 283,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: timeline.std
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 284,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 282,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Duration"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 287,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: timeline.duration
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 288,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 286,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Distance"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 291,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: [
                                                            route.distance.toLocaleString(),
                                                            " NM"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 292,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 290,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "STA"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 295,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: timeline.sta
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 296,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 294,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 281,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 grid gap-3 border-t border-slate-200 pt-3 md:grid-cols-2 text-[11px] text-slate-500",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-semibold uppercase",
                                                        children: "METAR "
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 302,
                                                        columnNumber: 17
                                                    }, this),
                                                    route.depIcao,
                                                    " 121620Z AUTO 28012KT 250V310 CAVOK"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 301,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "md:text-right",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-semibold uppercase",
                                                        children: "METAR "
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 306,
                                                        columnNumber: 17
                                                    }, this),
                                                    route.arrIcao,
                                                    " 121550Z 11006KT 070V230 9999 FEW045"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 305,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 300,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 flex flex-wrap gap-2 text-[11px]",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>router.push("/dashboard/airports/".concat(route.depIcao.toUpperCase())),
                                            className: "rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700",
                                            children: "Airport Information"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                            lineNumber: 312,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 311,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                lineNumber: 240,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-sm font-semibold uppercase tracking-wide text-slate-800",
                                        children: "Pilot Information"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 323,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 grid gap-4 md:grid-cols-5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Aircraft"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 326,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: ((_booking_aircraft = booking.aircraft) === null || _booking_aircraft === void 0 ? void 0 : _booking_aircraft.registration) || route.aircraftType || 'Assigned by fleet'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 327,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-slate-600",
                                                        children: ((_booking_aircraft1 = booking.aircraft) === null || _booking_aircraft1 === void 0 ? void 0 : _booking_aircraft1.type) || route.aircraftType || 'N/A'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 328,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 325,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Cost Index"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 331,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: (dispatchData === null || dispatchData === void 0 ? void 0 : (_dispatchData_costIndex = dispatchData.costIndex) === null || _dispatchData_costIndex === void 0 ? void 0 : _dispatchData_costIndex.trim()) || 'N/A'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 332,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 330,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Passengers"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 335,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: (dispatchData === null || dispatchData === void 0 ? void 0 : (_dispatchData_passengers = dispatchData.passengers) === null || _dispatchData_passengers === void 0 ? void 0 : _dispatchData_passengers.trim()) || 'N/A'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 336,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 334,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Luggage"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 339,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: (dispatchData === null || dispatchData === void 0 ? void 0 : (_dispatchData_passengersWithLuggage = dispatchData.passengersWithLuggage) === null || _dispatchData_passengersWithLuggage === void 0 ? void 0 : _dispatchData_passengersWithLuggage.trim()) || 'N/A'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 340,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 338,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Freight"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 343,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: (dispatchData === null || dispatchData === void 0 ? void 0 : (_dispatchData_freight = dispatchData.freight) === null || _dispatchData_freight === void 0 ? void 0 : _dispatchData_freight.trim()) ? "".concat(dispatchData.freight.trim(), " kg") : 'N/A'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 344,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 342,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 324,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 grid gap-4 border-t border-slate-200 pt-3 md:grid-cols-4 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Routing"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 350,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900 break-words",
                                                        children: routingText
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 351,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 349,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Route Type"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 354,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: "Scheduled"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 355,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 353,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Network"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 358,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: (dispatchData === null || dispatchData === void 0 ? void 0 : (_dispatchData_network = dispatchData.network) === null || _dispatchData_network === void 0 ? void 0 : _dispatchData_network.trim()) || 'Offline'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 359,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 357,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[10px] uppercase text-slate-500",
                                                        children: "Remarks"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 362,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-semibold text-slate-900",
                                                        children: "-"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                        lineNumber: 363,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 361,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 348,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 flex flex-wrap gap-2 text-[11px]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                className: "rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700",
                                                children: "Aircraft Information"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 368,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                className: "rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700",
                                                children: "Favorite"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                                lineNumber: 369,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 367,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                lineNumber: 322,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                        lineNumber: 239,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit xl:sticky xl:top-20",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-sm font-semibold text-slate-900",
                                children: "Booking Actions"
                            }, void 0, false, {
                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                lineNumber: 375,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-3 space-y-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>router.push("/dashboard/dispatch/".concat(route.id)),
                                        className: "w-full rounded-md border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50",
                                        children: "Change Booking Details"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 377,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>{
                                            if (!hasGeneratedSimBriefOFP) router.push("/dashboard/dispatch/".concat(route.id));
                                        },
                                        disabled: hasGeneratedSimBriefOFP,
                                        className: "w-full rounded-md border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:bg-slate-100",
                                        children: hasGeneratedSimBriefOFP ? 'SimBrief OFP Generated' : 'Generate SimBrief OFP'
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 378,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "w-full rounded-md border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50",
                                        children: "Make Additional Booking"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 388,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>router.push("/dashboard/pireps/submit?bookingId=".concat(booking.id)),
                                        className: "w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50",
                                        children: "Manual PIREP / File a Claim"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 389,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "w-full rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50",
                                        children: "Cancel Booking"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 390,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "w-full rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50",
                                        children: "Cancel & Rebook"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                        lineNumber: 391,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                                lineNumber: 376,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                        lineNumber: 374,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
                lineNumber: 238,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/dashboard/booking/[id]/page.tsx",
        lineNumber: 205,
        columnNumber: 5
    }, this);
}
_s(BookingDetailsPage, "hCC6TPVISkpw2N4b4xLa3IuiW10=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"]
    ];
});
_c = BookingDetailsPage;
var _c;
__turbopack_context__.k.register(_c, "BookingDetailsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_1a72e9a6._.js.map