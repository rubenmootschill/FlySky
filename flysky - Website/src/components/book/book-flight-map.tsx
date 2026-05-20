'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl, { type GeoJSONSource, type Map as MapboxMap } from 'mapbox-gl'

type AirportPoint = {
  icao: string
  name: string
  lat: number
  lng: number
}

type Destination = {
  icao: string
  name: string
  distance: number
  durationMin: number
  aircraftTypes: string[]
  routeIds: string[]
  connections: number
}

interface BookFlightMapProps {
  hubIcao: string
  destinations: Destination[]
  airportsByIcao: Record<string, AirportPoint>
  selectedDestinationIcao: string | null
  onSelectDestination: (destinationIcao: string) => void
  windEnabled?: boolean
  cloudEnabled?: boolean
  visibilityEnabled?: boolean
  rangeRingEnabled?: boolean
}

type WeatherCell = {
  centerLat: number
  centerLng: number
  south: number
  west: number
  north: number
  east: number
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmlubm95YWlyd2F5cyIsImEiOiJjbWJhNWk2aHAwaGFxMmlzaTZrZjVxcTYyIn0.ulHtSfoUvNyDHc7EIdiLOg'

const ROUTES_SOURCE_ID = 'book-routes'
const ROUTE_GLOW_SOURCE_ID = 'book-route-glow'
const AIRPORTS_SOURCE_ID = 'book-airports'
const RANGE_RINGS_SOURCE_ID = 'book-range-rings'
const WEATHER_CLOUDS_SOURCE_ID = 'book-weather-clouds-raster'
const WEATHER_CLOUDS_LAYER_ID = 'book-weather-clouds-layer'
const WEATHER_CLOUDS_ALT_SOURCE_ID = 'book-weather-clouds-raster-alt'
const WEATHER_CLOUDS_ALT_LAYER_ID = 'book-weather-clouds-layer-alt'
const WEATHER_VISIBILITY_SOURCE_ID = 'book-weather-visibility'
const WEATHER_WIND_SOURCE_ID = 'book-weather-wind'
const DEPARTURE_MARKER_ICON_ID = 'book-marker-departure'
const ARRIVAL_MARKER_ICON_ID = 'book-marker-arrival'

const WEATHER_DEBOUNCE_MS = 350
const WEATHER_COOLDOWN_MS = 60_000
const MAX_WEATHER_CELLS = 24

const emptyFeatureCollection = () => ({ type: 'FeatureCollection' as const, features: [] as any[] })

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const getWeatherGridStep = (zoom: number) => {
  if (zoom <= 2) return 45
  if (zoom <= 3) return 30
  if (zoom <= 4) return 20
  if (zoom <= 5) return 15
  return 10
}

const getWindColor = (speedKnots: number) => {
  if (speedKnots >= 45) return '#1d4ed8'
  if (speedKnots >= 30) return '#2563eb'
  if (speedKnots >= 20) return '#0ea5e9'
  if (speedKnots >= 10) return '#38bdf8'
  return '#7dd3fc'
}

const getVisibilityFill = (visibilityKm: number) => {
  if (visibilityKm < 2) return { color: '#dc2626', opacity: 0.24 }
  if (visibilityKm < 5) return { color: '#f97316', opacity: 0.18 }
  if (visibilityKm < 10) return { color: '#f59e0b', opacity: 0.12 }
  return { color: '#10b981', opacity: 0.06 }
}

const getCloudRasterDate = () => {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

const buildWeatherCells = (bounds: mapboxgl.LngLatBounds, step: number): WeatherCell[] => {
  const paddedSouth = clamp(bounds.getSouth() - step * 0.5, -80, 80)
  const paddedNorth = clamp(bounds.getNorth() + step * 0.5, -80, 80)
  const paddedWest = clamp(bounds.getWest() - step * 0.5, -180, 180)
  const paddedEast = clamp(bounds.getEast() + step * 0.5, -180, 180)

  const startLat = Math.floor(paddedSouth / step) * step
  const endLat = Math.ceil(paddedNorth / step) * step
  const startLng = Math.floor(paddedWest / step) * step
  const endLng = Math.ceil(paddedEast / step) * step

  const cells: WeatherCell[] = []

  for (let south = startLat; south < endLat; south += step) {
    for (let west = startLng; west < endLng; west += step) {
      const north = clamp(south + step, -80, 80)
      const east = clamp(west + step, -180, 180)
      const centerLat = clamp(south + step / 2, -80, 80)
      const centerLng = clamp(west + step / 2, -180, 180)
      cells.push({ centerLat, centerLng, south, west, north, east })
    }
  }

  return cells
}

const getWeatherCellsForBounds = (bounds: mapboxgl.LngLatBounds, zoom: number, maxCells: number) => {
  let step = getWeatherGridStep(zoom)
  let cells = buildWeatherCells(bounds, step)

  while (cells.length > maxCells && step < 90) {
    step = Math.min(step * 1.5, 90)
    cells = buildWeatherCells(bounds, step)
  }

  return { step, cells }
}

const createCircleRingFeature = (centerLng: number, centerLat: number, radiusNm: number, steps = 128) => {
  const radiusKm = radiusNm * 1.852
  const coordinates: [number, number][] = []

  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2
    const latOffset = (radiusKm / 111.32) * Math.sin(angle)
    const lngScale = Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2)
    const lngOffset = (radiusKm / (111.32 * lngScale)) * Math.cos(angle)
    coordinates.push([
      clamp(centerLng + lngOffset, -180, 180),
      clamp(centerLat + latOffset, -85, 85),
    ])
  }

  return {
    type: 'Feature' as const,
    properties: { label: `${radiusNm} NM` },
    geometry: {
      type: 'LineString' as const,
      coordinates,
    },
  }
}

const setGeoJsonData = (map: MapboxMap | null | undefined, sourceId: string, data: any) => {
  if (!map) return

  try {
    const style = map.getStyle()
    if (!style) return

    const source = map.getSource(sourceId) as GeoJSONSource | undefined
    source?.setData(data)
  } catch {
    // Ignore updates while style/map is tearing down.
  }
}

const createMarkerPlaneImage = (rotation: number, color: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to create marker canvas context')
  }

  context.translate(16, 16)
  context.rotate((rotation * Math.PI) / 180)
  context.fillStyle = color
  context.strokeStyle = color
  context.shadowColor = 'rgba(255, 255, 255, 0.2)'
  context.shadowBlur = 2
  context.lineCap = 'round'
  context.lineJoin = 'round'

  context.beginPath()
  context.moveTo(0, -10)
  context.lineTo(2.2, -4.2)
  context.lineTo(7.4, -1.4)
  context.lineTo(7.4, 0.8)
  context.lineTo(2.8, 0.3)
  context.lineTo(1.5, 9.5)
  context.lineTo(-1.5, 9.5)
  context.lineTo(-2.8, 0.3)
  context.lineTo(-7.4, 0.8)
  context.lineTo(-7.4, -1.4)
  context.lineTo(-2.2, -4.2)
  context.closePath()
  context.fill()

  context.beginPath()
  context.moveTo(-1.2, 6.4)
  context.lineTo(-4.4, 9.8)
  context.lineTo(-2.4, 10.4)
  context.lineTo(-0.7, 8.7)
  context.closePath()
  context.fill()

  context.beginPath()
  context.moveTo(1.2, 6.4)
  context.lineTo(4.4, 9.8)
  context.lineTo(2.4, 10.4)
  context.lineTo(0.7, 8.7)
  context.closePath()
  context.fill()

  context.beginPath()
  context.moveTo(0, -10.8)
  context.lineTo(1.2, -8.5)
  context.lineTo(0, -7.8)
  context.lineTo(-1.2, -8.5)
  context.closePath()
  context.fill()

  return context.getImageData(0, 0, canvas.width, canvas.height)
}

const addMapImage = (map: MapboxMap, id: string, image: ImageData) => {
  if (map.hasImage(id)) return
  map.addImage(id, image)
}

const ensureMarkerImages = async (map: MapboxMap) => {
  addMapImage(map, DEPARTURE_MARKER_ICON_ID, createMarkerPlaneImage(-35, '#0f766e'))
  addMapImage(map, ARRIVAL_MARKER_ICON_ID, createMarkerPlaneImage(145, '#0369a1'))
}

const ensureSourcesAndLayers = (map: MapboxMap) => {
  if (!map.getSource(ROUTE_GLOW_SOURCE_ID)) {
    map.addSource(ROUTE_GLOW_SOURCE_ID, { type: 'geojson', data: emptyFeatureCollection() })
    map.addLayer({
      id: 'book-route-glow-layer',
      type: 'line',
      source: ROUTE_GLOW_SOURCE_ID,
      paint: {
        'line-color': '#6ee7b7',
        'line-width': 9,
        'line-opacity': 0.28,
      },
    })
  }

  if (!map.getSource(ROUTES_SOURCE_ID)) {
    map.addSource(ROUTES_SOURCE_ID, { type: 'geojson', data: emptyFeatureCollection() })
    map.addLayer({
      id: 'book-routes-layer',
      type: 'line',
      source: ROUTES_SOURCE_ID,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    })
    map.addLayer({
      id: 'book-routes-hit-layer',
      type: 'line',
      source: ROUTES_SOURCE_ID,
      paint: {
        'line-color': '#000000',
        'line-opacity': 0,
        'line-width': 14,
      },
    })
  }

  if (!map.getSource(AIRPORTS_SOURCE_ID)) {
    map.addSource(AIRPORTS_SOURCE_ID, { type: 'geojson', data: emptyFeatureCollection() })
    map.addLayer({
      id: 'book-airports-pulse-layer',
      type: 'circle',
      source: AIRPORTS_SOURCE_ID,
      paint: {
        'circle-radius': [
          '*',
          ['get', 'pulseRadius'],
          ['case', ['boolean', ['feature-state', 'hover'], false], 1.14, 1],
        ],
        'circle-color': ['get', 'glowColor'],
        'circle-opacity': ['get', 'pulseOpacity'],
        'circle-blur': 0.82,
      },
    })
    map.addLayer({
      id: 'book-airports-glow-layer',
      type: 'circle',
      source: AIRPORTS_SOURCE_ID,
      paint: {
        'circle-radius': [
          '*',
          ['get', 'glowRadius'],
          ['case', ['boolean', ['feature-state', 'hover'], false], 1.18, 1],
        ],
        'circle-color': ['get', 'glowColor'],
        'circle-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          ['get', 'hoverGlowOpacity'],
          ['get', 'glowOpacity'],
        ],
        'circle-blur': 0.6,
      },
    })
    map.addLayer({
      id: 'book-airports-layer',
      type: 'circle',
      source: AIRPORTS_SOURCE_ID,
      paint: {
        'circle-radius': [
          '*',
          ['get', 'radius'],
          ['case', ['boolean', ['feature-state', 'hover'], false], 1.1, 1],
        ],
        'circle-color': ['get', 'fillColor'],
        'circle-stroke-color': ['get', 'strokeColor'],
        'circle-stroke-width': ['get', 'strokeWidth'],
        'circle-opacity': ['get', 'fillOpacity'],
      },
    })
    map.addLayer({
      id: 'book-airports-core-layer',
      type: 'circle',
      source: AIRPORTS_SOURCE_ID,
      paint: {
        'circle-radius': [
          '*',
          ['get', 'coreRadius'],
          ['case', ['boolean', ['feature-state', 'hover'], false], 1.08, 1],
        ],
        'circle-color': ['get', 'coreColor'],
        'circle-opacity': 0.98,
      },
    })
    map.addLayer({
      id: 'book-airports-symbol-layer',
      type: 'symbol',
      source: AIRPORTS_SOURCE_ID,
      layout: {
        'icon-image': ['get', 'markerIcon'],
        'icon-size': ['get', 'iconScale'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': 0.96,
      },
    })
  }

  if (!map.getSource(RANGE_RINGS_SOURCE_ID)) {
    map.addSource(RANGE_RINGS_SOURCE_ID, { type: 'geojson', data: emptyFeatureCollection() })
    map.addLayer({
      id: 'book-range-rings-layer',
      type: 'line',
      source: RANGE_RINGS_SOURCE_ID,
      paint: {
        'line-color': '#0f766e',
        'line-width': 2,
        'line-opacity': 0.72,
        'line-dasharray': [4, 2],
      },
    })
  }

  if (!map.getSource(WEATHER_CLOUDS_SOURCE_ID)) {
    map.addSource(WEATHER_CLOUDS_SOURCE_ID, {
      type: 'raster',
      tiles: [
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${getCloudRasterDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      ],
      tileSize: 256,
      scheme: 'xyz',
      bounds: [-180, -85.051129, 180, 85.051129],
    })
    map.addLayer({
      id: WEATHER_CLOUDS_LAYER_ID,
      type: 'raster',
      source: WEATHER_CLOUDS_SOURCE_ID,
      paint: {
        'raster-opacity': 0.22,
        'raster-saturation': -0.12,
        'raster-contrast': 0.12,
        'raster-brightness-max': 0.9,
        'raster-fade-duration': 200,
      },
      layout: {
        visibility: 'none',
      },
    })
  }

  if (!map.getSource(WEATHER_CLOUDS_ALT_SOURCE_ID)) {
    map.addSource(WEATHER_CLOUDS_ALT_SOURCE_ID, {
      type: 'raster',
      tiles: [
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/${getCloudRasterDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      ],
      tileSize: 256,
      scheme: 'xyz',
      bounds: [-180, -85.051129, 180, 85.051129],
    })
    map.addLayer({
      id: WEATHER_CLOUDS_ALT_LAYER_ID,
      type: 'raster',
      source: WEATHER_CLOUDS_ALT_SOURCE_ID,
      paint: {
        'raster-opacity': 0.14,
        'raster-saturation': -0.1,
        'raster-contrast': 0.08,
        'raster-brightness-max': 0.92,
        'raster-fade-duration': 200,
      },
      layout: {
        visibility: 'none',
      },
    })
  }

  if (!map.getSource(WEATHER_VISIBILITY_SOURCE_ID)) {
    map.addSource(WEATHER_VISIBILITY_SOURCE_ID, { type: 'geojson', data: emptyFeatureCollection() })
    map.addLayer({
      id: 'book-weather-visibility-layer',
      type: 'fill',
      source: WEATHER_VISIBILITY_SOURCE_ID,
      paint: {
        'fill-color': ['get', 'fillColor'],
        'fill-opacity': ['get', 'fillOpacity'],
      },
    })
  }

  if (!map.getSource(WEATHER_WIND_SOURCE_ID)) {
    map.addSource(WEATHER_WIND_SOURCE_ID, { type: 'geojson', data: emptyFeatureCollection() })
    map.addLayer({
      id: 'book-weather-wind-layer',
      type: 'line',
      source: WEATHER_WIND_SOURCE_ID,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    })
  }
}

export default function BookFlightMap({
  hubIcao,
  destinations,
  airportsByIcao,
  selectedDestinationIcao,
  onSelectDestination,
  windEnabled = true,
  cloudEnabled = false,
  visibilityEnabled = true,
  rangeRingEnabled = false,
}: BookFlightMapProps) {
  const mapRef = useRef<MapboxMap | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const weatherRequestRef = useRef(0)
  const weatherCacheRef = useRef(new Map<string, any[]>())
  const weatherCooldownUntilRef = useRef(0)
  const weatherTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const markerAnimationRef = useRef<number | null>(null)
  const hoveredAirportIdRef = useRef<string | number | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return
    if (mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [15, 44],
      zoom: 2.4,
      projection: 'globe',
      attributionControl: true,
      renderWorldCopies: false,
      antialias: true,
    })

    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()

    const container = containerRef.current
    container.style.userSelect = 'none'
    ;(container.style as any).webkitUserSelect = 'none'
    container.addEventListener('selectstart', (event) => event.preventDefault())
    container.addEventListener('mousedown', (event) => {
      if (event.detail > 1) event.preventDefault()
    })

    map.on('load', async () => {
      map.setFog({
        color: 'rgb(215, 232, 246)',
        'high-color': 'rgb(190, 215, 235)',
        'horizon-blend': 0.04,
        'space-color': 'rgb(13, 22, 33)',
        'star-intensity': 0.24,
      })

      await ensureMarkerImages(map)
      ensureSourcesAndLayers(map)

      map.on('click', 'book-routes-hit-layer', (event) => {
        const destinationIcao = event.features?.[0]?.properties?.destinationIcao
        if (typeof destinationIcao === 'string') {
          onSelectDestination(destinationIcao)
        }
      })

      map.on('click', 'book-airports-layer', (event) => {
        const feature = event.features?.[0]
        const destinationIcao = feature?.properties?.destinationIcao
        const selectable = feature?.properties?.selectable === 'true'

        if (selectable && typeof destinationIcao === 'string') {
          onSelectDestination(destinationIcao)
        }
      })

      map.on('mouseenter', 'book-routes-hit-layer', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'book-routes-hit-layer', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'book-airports-layer', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mousemove', 'book-airports-layer', (event) => {
        const nextId = event.features?.[0]?.id

        if (hoveredAirportIdRef.current !== null && hoveredAirportIdRef.current !== nextId) {
          map.setFeatureState({ source: AIRPORTS_SOURCE_ID, id: hoveredAirportIdRef.current }, { hover: false })
        }

        if (nextId !== undefined && nextId !== null && hoveredAirportIdRef.current !== nextId) {
          hoveredAirportIdRef.current = nextId
          map.setFeatureState({ source: AIRPORTS_SOURCE_ID, id: nextId }, { hover: true })
        }
      })
      map.on('mouseleave', 'book-airports-layer', () => {
        map.getCanvas().style.cursor = ''

        if (hoveredAirportIdRef.current !== null) {
          map.setFeatureState({ source: AIRPORTS_SOURCE_ID, id: hoveredAirportIdRef.current }, { hover: false })
          hoveredAirportIdRef.current = null
        }
      })

      setMapReady(true)
    })

    mapRef.current = map

    return () => {
      if (weatherTimerRef.current) {
        clearTimeout(weatherTimerRef.current)
        weatherTimerRef.current = null
      }
      if (markerAnimationRef.current !== null) {
        window.cancelAnimationFrame(markerAnimationRef.current)
        markerAnimationRef.current = null
      }
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [onSelectDestination])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const map = mapRef.current
    const hub = airportsByIcao[hubIcao]
    if (!hub) return

    const routeFeatures = destinations
      .map((destination) => {
        const airport = airportsByIcao[destination.icao]
        if (!airport) return null

        const isSelected = selectedDestinationIcao === destination.icao

        return {
          type: 'Feature' as const,
          properties: {
            destinationIcao: destination.icao,
            color: isSelected ? '#22c55e' : '#334155',
            width: isSelected ? 5.5 : 2.6,
            opacity: isSelected ? 0.95 : 0.62,
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [hub.lng, hub.lat],
              [airport.lng, airport.lat],
            ],
          },
        }
      })
      .filter(Boolean)

    const glowFeatures = destinations
      .filter((destination) => selectedDestinationIcao === destination.icao)
      .map((destination) => {
        const airport = airportsByIcao[destination.icao]
        if (!airport) return null

        return {
          type: 'Feature' as const,
          properties: { destinationIcao: destination.icao },
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [hub.lng, hub.lat],
              [airport.lng, airport.lat],
            ],
          },
        }
      })
      .filter(Boolean)

    const airportFeatures = [
      {
        type: 'Feature' as const,
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
          iconScale: 0.5,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [hub.lng, hub.lat],
        },
      },
      ...destinations
        .map((destination) => {
          const airport = airportsByIcao[destination.icao]
          if (!airport) return null

          const isSelected = selectedDestinationIcao === destination.icao
          return {
            type: 'Feature' as const,
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
              iconScale: isSelected ? 0.52 : 0.48,
            },
            geometry: {
              type: 'Point' as const,
              coordinates: [airport.lng, airport.lat],
            },
          }
        })
        .filter(Boolean),
    ]

    setGeoJsonData(map, ROUTES_SOURCE_ID, { type: 'FeatureCollection', features: routeFeatures })
    setGeoJsonData(map, ROUTE_GLOW_SOURCE_ID, { type: 'FeatureCollection', features: glowFeatures })
    setGeoJsonData(map, AIRPORTS_SOURCE_ID, { type: 'FeatureCollection', features: airportFeatures })
  }, [mapReady, hubIcao, destinations, airportsByIcao, selectedDestinationIcao])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    let disposed = false

    const animateMarkers = () => {
      if (disposed || !mapRef.current) return

      const pulsePhase = (Date.now() % 1800) / 1800
      const pulseWave = (Math.sin(pulsePhase * Math.PI * 2) + 1) / 2

      try {
        mapRef.current.setPaintProperty('book-airports-pulse-layer', 'circle-radius', [
          '*',
          ['+', ['get', 'pulseRadius'], pulseWave * 2.2],
          ['case', ['boolean', ['feature-state', 'hover'], false], 1.14, 1],
        ])
        mapRef.current.setPaintProperty('book-airports-pulse-layer', 'circle-opacity', [
          '+',
          ['get', 'pulseOpacity'],
          pulseWave * 0.07,
        ])
      } catch {
        return
      }

      markerAnimationRef.current = window.requestAnimationFrame(animateMarkers)
    }

    markerAnimationRef.current = window.requestAnimationFrame(animateMarkers)

    return () => {
      disposed = true
      if (markerAnimationRef.current !== null) {
        window.cancelAnimationFrame(markerAnimationRef.current)
        markerAnimationRef.current = null
      }
    }
  }, [mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const map = mapRef.current
    const hub = airportsByIcao[hubIcao]
    if (!hub) return

    const bounds = new mapboxgl.LngLatBounds([hub.lng, hub.lat], [hub.lng, hub.lat])
    destinations.forEach((destination) => {
      const airport = airportsByIcao[destination.icao]
      if (!airport) return
      bounds.extend([airport.lng, airport.lat])
    })

    map.fitBounds(bounds, {
      padding: { top: 60, right: 60, bottom: 60, left: 340 },
      maxZoom: 5,
      duration: 800,
    })
  }, [mapReady, hubIcao, destinations, airportsByIcao])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const map = mapRef.current
    const hub = airportsByIcao[hubIcao]

    const clearWeatherSources = () => {
      setGeoJsonData(map, RANGE_RINGS_SOURCE_ID, emptyFeatureCollection())
      setGeoJsonData(map, WEATHER_VISIBILITY_SOURCE_ID, emptyFeatureCollection())
      setGeoJsonData(map, WEATHER_WIND_SOURCE_ID, emptyFeatureCollection())
    }

    if (!hub) {
      clearWeatherSources()
      return
    }

    let disposed = false

    const drawWeatherData = (cells: WeatherCell[], weatherRows: any[], step: number) => {
      const visibilityFeatures: any[] = []
      const windFeatures: any[] = []

      cells.forEach((cell, index) => {
        const current = weatherRows[index]?.current
        if (!current) return

        if (visibilityEnabled) {
          const visibilityKm = Number(current.visibility ?? 10000) / 1000
          const visibilityFill = getVisibilityFill(visibilityKm)
          visibilityFeatures.push({
            type: 'Feature' as const,
            properties: {
              fillColor: visibilityFill.color,
              fillOpacity: visibilityFill.opacity,
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [cell.west, cell.south],
                [cell.east, cell.south],
                [cell.east, cell.north],
                [cell.west, cell.north],
                [cell.west, cell.south],
              ]],
            },
          })
        }

        if (windEnabled) {
          const windSpeed = Number(current.wind_speed_10m ?? 0)
          const windDirection = Number(current.wind_direction_10m ?? 0)
          const arrowLength = step * (0.14 + Math.min(windSpeed / 120, 0.18))
          const angle = ((windDirection - 90) * Math.PI) / 180
          const endLat = clamp(cell.centerLat + Math.sin(angle) * arrowLength, -85, 85)
          const endLng = clamp(cell.centerLng + Math.cos(angle) * arrowLength, -180, 180)
          const headSize = arrowLength * 0.3
          const leftAngle = angle + Math.PI * 0.78
          const rightAngle = angle - Math.PI * 0.78
          const leftHead: [number, number] = [
            clamp(endLng + Math.cos(leftAngle) * headSize, -180, 180),
            clamp(endLat + Math.sin(leftAngle) * headSize, -85, 85),
          ]
          const rightHead: [number, number] = [
            clamp(endLng + Math.cos(rightAngle) * headSize, -180, 180),
            clamp(endLat + Math.sin(rightAngle) * headSize, -85, 85),
          ]

          windFeatures.push({
            type: 'Feature' as const,
            properties: {
              color: getWindColor(windSpeed),
              width: 1.5,
              opacity: 0.75,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [cell.centerLng, cell.centerLat],
                [endLng, endLat],
              ],
            },
          })

          windFeatures.push({
            type: 'Feature' as const,
            properties: {
              color: getWindColor(windSpeed),
              width: 1.5,
              opacity: 0.75,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                leftHead,
                [endLng, endLat],
                rightHead,
              ],
            },
          })
        }
      })

      setGeoJsonData(map, WEATHER_VISIBILITY_SOURCE_ID, { type: 'FeatureCollection', features: visibilityFeatures })
      setGeoJsonData(map, WEATHER_WIND_SOURCE_ID, { type: 'FeatureCollection', features: windFeatures })
    }

    const renderWeather = async () => {
      if (map.getLayer(WEATHER_CLOUDS_LAYER_ID)) {
        map.setLayoutProperty(WEATHER_CLOUDS_LAYER_ID, 'visibility', cloudEnabled ? 'visible' : 'none')
      }
      if (map.getLayer(WEATHER_CLOUDS_ALT_LAYER_ID)) {
        map.setLayoutProperty(WEATHER_CLOUDS_ALT_LAYER_ID, 'visibility', cloudEnabled ? 'visible' : 'none')
      }

      const rangeRingFeatures = rangeRingEnabled
        ? [500, 1000, 1500, 2000, 3000, 5000].map((distanceNm) => createCircleRingFeature(hub.lng, hub.lat, distanceNm))
        : []

      setGeoJsonData(map, RANGE_RINGS_SOURCE_ID, { type: 'FeatureCollection', features: rangeRingFeatures })
      setGeoJsonData(map, WEATHER_VISIBILITY_SOURCE_ID, emptyFeatureCollection())
      setGeoJsonData(map, WEATHER_WIND_SOURCE_ID, emptyFeatureCollection())

      if (!windEnabled && !visibilityEnabled) {
        return
      }

      const bounds = map.getBounds()
      if (!bounds) {
        return
      }

      const { step, cells } = getWeatherCellsForBounds(bounds, map.getZoom(), MAX_WEATHER_CELLS)
      if (cells.length === 0) {
        return
      }

      const currentVars = [
        windEnabled ? 'wind_speed_10m' : null,
        windEnabled ? 'wind_direction_10m' : null,
        visibilityEnabled ? 'visibility' : null,
      ].filter(Boolean) as string[]

      if (currentVars.length === 0) {
        return
      }

      const cacheKey = [
        map.getZoom().toFixed(1),
        currentVars.join('|'),
        step,
        bounds.getSouth().toFixed(1),
        bounds.getWest().toFixed(1),
        bounds.getNorth().toFixed(1),
        bounds.getEast().toFixed(1),
      ].join(':')

      const cached = weatherCacheRef.current.get(cacheKey)
      if (cached) {
        drawWeatherData(cells, cached, step)
        return
      }

      if (Date.now() < weatherCooldownUntilRef.current) {
        return
      }

      const requestId = ++weatherRequestRef.current

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${cells.map((cell) => cell.centerLat.toFixed(3)).join(',')}&longitude=${cells.map((cell) => cell.centerLng.toFixed(3)).join(',')}&current=${currentVars.join(',')}&wind_speed_unit=kn`,
        )

        if (!response.ok) {
          if (response.status === 429) {
            weatherCooldownUntilRef.current = Date.now() + WEATHER_COOLDOWN_MS
          }
          return
        }

        const payload = await response.json()
        const weatherRows = Array.isArray(payload) ? payload : [payload]

        if (disposed || requestId !== weatherRequestRef.current) {
          return
        }

        weatherCacheRef.current.set(cacheKey, weatherRows)
        drawWeatherData(cells, weatherRows, step)
      } catch {
        if (disposed || requestId !== weatherRequestRef.current) {
          return
        }
      }
    }

    const scheduleWeatherRender = () => {
      if (weatherTimerRef.current) {
        clearTimeout(weatherTimerRef.current)
      }

      weatherTimerRef.current = setTimeout(() => {
        renderWeather()
      }, WEATHER_DEBOUNCE_MS)
    }

    renderWeather()
    map.on('moveend', scheduleWeatherRender)
    map.on('zoomend', scheduleWeatherRender)

    return () => {
      disposed = true
      if (weatherTimerRef.current) {
        clearTimeout(weatherTimerRef.current)
        weatherTimerRef.current = null
      }
      map.off('moveend', scheduleWeatherRender)
      map.off('zoomend', scheduleWeatherRender)
      clearWeatherSources()
    }
  }, [mapReady, hubIcao, airportsByIcao, windEnabled, cloudEnabled, visibilityEnabled, rangeRingEnabled])

  return (
    <div
      ref={containerRef}
      className="h-[80vh] min-h-[620px] w-full rounded-2xl border border-white/60 bg-[#dbe3ea] shadow-inner select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none' as any,
        MozUserSelect: 'none' as any,
        msUserSelect: 'none' as any,
      }}
    />
  )
}
