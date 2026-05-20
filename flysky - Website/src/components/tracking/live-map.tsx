'use client'
import { useEffect, useRef } from 'react'
import mapboxgl, { type LngLatBoundsLike, type Map as MapboxMap, type Marker as MapboxMarker } from 'mapbox-gl'

const DEFAULT_MAPBOX_TOKEN = 'pk.eyJ1IjoiZmlubm95YWlyd2F5cyIsImEiOiJjbWJhNWk2aHAwaGFxMmlzaTZrZjVxcTYyIn0.ulHtSfoUvNyDHc7EIdiLOg'
const SOURCE_ID = 'tracking-routes'
const HEADING_LAYER_ID = 'tracking-heading-lines'
const PLANNED_LAYER_ID = 'tracking-planned-routes'
const TRAIL_LAYER_ID = 'tracking-live-trails'

interface Flight {
  id: string
  callsign: string
  aircraftType?: string | null
  routeText?: string | null
  routePath?: Array<{ lat: number; lng: number }> | null
  trailPath?: Array<{ lat: number; lng: number }> | null
  depIcao: string
  arrIcao: string
  lat: number
  lng: number
  altitude: number
  groundSpeed: number
  heading: number
  phase: string
  pilot: { callsign: string; firstName: string; lastName: string }
}

interface AirportPoint {
  icao: string
  lat: number
  lng: number
  name: string
}

interface LiveMapProps {
  flights: Flight[]
  airportsByIcao: Record<string, AirportPoint>
  selectedId: string | null
  onSelect: (id: string) => void
  theme?: 'light' | 'dark'
}

type AircraftMarkerVariant = 'super' | 'wide' | 'narrow' | 'regional' | 'prop' | 'generic'

type AircraftMarkerAsset = {
  src: string
  size: number
}

function normalizeAircraftType(code?: string | null) {
  return (code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function pickAircraftMarkerVariant(aircraftType?: string | null): AircraftMarkerVariant {
  const code = normalizeAircraftType(aircraftType)
  if (!code) return 'generic'

  if (code.startsWith('A38')) return 'super'

  if (
    code.startsWith('A33') ||
    code.startsWith('A34') ||
    code.startsWith('A35') ||
    code.startsWith('B74') ||
    code.startsWith('B76') ||
    code.startsWith('B77') ||
    code.startsWith('B78') ||
    code.startsWith('B79')
  ) {
    return 'wide'
  }

  if (
    code.startsWith('A31') ||
    code.startsWith('A32') ||
    code.startsWith('A20') ||
    code.startsWith('A21') ||
    code.startsWith('B73') ||
    code.startsWith('B38') ||
    code.startsWith('B39') ||
    code.startsWith('B37') ||
    code.startsWith('B72')
  ) {
    return 'narrow'
  }

  if (
    code.startsWith('E17') ||
    code.startsWith('E19') ||
    code.startsWith('E2') ||
    code.startsWith('CRJ') ||
    code.startsWith('C56')
  ) {
    return 'regional'
  }

  if (code.startsWith('AT') || code.startsWith('DH8') || code.startsWith('C208') || code.startsWith('BE')) {
    return 'prop'
  }

  return 'generic'
}

function getAircraftMarkerAsset(aircraftType?: string | null): AircraftMarkerAsset {
  const code = normalizeAircraftType(aircraftType)

  if (code.startsWith('A38')) {
    return { src: '/tracking-icons/A380.png', size: 34 }
  }

  if (
    code.startsWith('A35') ||
    code.startsWith('A33') ||
    code.startsWith('B78') ||
    code.startsWith('B77')
  ) {
    return { src: '/tracking-icons/A350,B787,A330,B777.png', size: 34 }
  }

  if (code.startsWith('A34') || code.startsWith('B74') || code.startsWith('B76')) {
    return { src: '/tracking-icons/A340,B747.png', size: 34 }
  }

  if (
    code.startsWith('A31') ||
    code.startsWith('A32') ||
    code.startsWith('A20') ||
    code.startsWith('A21') ||
    code.startsWith('B73') ||
    code.startsWith('B37') ||
    code.startsWith('B38') ||
    code.startsWith('B39')
  ) {
    return { src: '/tracking-icons/A319,A320,A31,B737.png', size: 32 }
  }

  if (pickAircraftMarkerVariant(aircraftType) === 'wide') {
    return { src: '/tracking-icons/4eng heavyplene.png', size: 34 }
  }

  return { src: '/tracking-icons/A319,A320,A31,B737.png', size: 30 }
}

function projectHeadingPoint(lat: number, lng: number, headingDeg: number, distanceNm: number): [number, number] {
  const headingRad = (headingDeg * Math.PI) / 180
  const deltaLat = (distanceNm * Math.cos(headingRad)) / 60
  const safeCos = Math.max(0.01, Math.cos((lat * Math.PI) / 180))
  const deltaLng = (distanceNm * Math.sin(headingRad)) / (60 * safeCos)
  return [lat + deltaLat, lng + deltaLng]
}

export default function LiveMap({ flights, airportsByIcao, selectedId, onSelect, theme = 'dark' }: LiveMapProps) {
  const mapRef = useRef<MapboxMap | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const trailHistoryRef = useRef<Record<string, [number, number][]>>({})
  const markersRef = useRef<MapboxMarker[]>([])
  const hasFittedInitialBoundsRef = useRef(false)

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? DEFAULT_MAPBOX_TOKEN
  const style = theme === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11'

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return
    mapboxgl.accessToken = token
    hasFittedInitialBoundsRef.current = false

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center: [12, 30],
      zoom: 2.2,
      projection: 'mercator',
      attributionControl: true,
      antialias: true,
    })

    const suppressContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }
    map.getCanvas().addEventListener('contextmenu', suppressContextMenu)

    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()

    mapRef.current = map

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.getCanvas().removeEventListener('contextmenu', suppressContextMenu)
      map.remove()
      mapRef.current = null
    }
  }, [style, token])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    const headingFeatures: Array<any> = []
    const plannedFeatures: Array<any> = []
    const trailFeatures: Array<any> = []

    const syncMap = () => {
      const activeIds = new Set(flights.map((flight) => flight.id))
      Object.keys(trailHistoryRef.current).forEach((flightId) => {
        if (!activeIds.has(flightId)) {
          delete trailHistoryRef.current[flightId]
        }
      })

      flights.forEach((f) => {
        const current: [number, number] = [f.lat, f.lng]
        const persistedTrail = (f.trailPath ?? [])
          .map((point) => [point.lat, point.lng] as [number, number])
          .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
          .slice(-200)
        const existing = trailHistoryRef.current[f.id] ?? persistedTrail
        const previous = existing.length > 0 ? existing[existing.length - 1] : null
        const movedEnough =
          !previous || Math.abs(previous[0] - current[0]) > 0.0001 || Math.abs(previous[1] - current[1]) > 0.0001

        if (movedEnough) {
          trailHistoryRef.current[f.id] = [...existing, current].slice(-200)
        }
      })

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      flights.forEach((f) => {
        const isSelected = f.id === selectedId
        const dep = airportsByIcao[f.depIcao.toUpperCase()]
        const arr = airportsByIcao[f.arrIcao.toUpperCase()]
        const lookAheadNm = Math.max(0.35, Math.min(2.4, (f.groundSpeed * 2) / 60))
        const headingTip = projectHeadingPoint(f.lat, f.lng, f.heading, lookAheadNm)

        if (isSelected) {
          headingFeatures.push({
            type: 'Feature',
            properties: {
              kind: 'heading',
              color: theme === 'light' ? '#ea580c' : '#f59e0b',
              width: 3,
              opacity: 0.95,
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [f.lng, f.lat],
                [headingTip[1], headingTip[0]],
              ],
            },
          })
        }

        if (isSelected && f.routePath && f.routePath.length > 1) {
          plannedFeatures.push({
            type: 'Feature',
            properties: {
              kind: 'planned',
              color: theme === 'light' ? '#1d4ed8' : '#60a5fa',
              width: 3,
              opacity: 0.95,
            },
            geometry: {
              type: 'LineString',
              coordinates: f.routePath.map((point) => [point.lng, point.lat]),
            },
          })
        } else if (isSelected && dep && arr) {
          plannedFeatures.push({
            type: 'Feature',
            properties: {
              kind: 'planned',
              color: theme === 'light' ? '#1d4ed8' : '#60a5fa',
              width: 3,
              opacity: 0.95,
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [dep.lng, dep.lat],
                [arr.lng, arr.lat],
              ],
            },
          })
        }

        const trail = trailHistoryRef.current[f.id] ?? []
        if (isSelected && trail.length > 1) {
          trailFeatures.push({
            type: 'Feature',
            properties: {
              kind: 'trail',
              color: theme === 'light' ? '#dc2626' : '#fb7185',
              width: 3,
              opacity: 0.95,
            },
            geometry: {
              type: 'LineString',
              coordinates: trail.map(([lat, lng]) => [lng, lat]),
            },
          })
        }

        const markerElement = document.createElement('div')
        markerElement.style.display = 'flex'
        markerElement.style.alignItems = 'center'
        markerElement.style.justifyContent = 'center'
        markerElement.style.cursor = 'pointer'
        markerElement.style.border = '0'
        markerElement.style.background = 'none'
        markerElement.style.padding = '0'
        markerElement.style.margin = '0'
        markerElement.style.lineHeight = '0'
        markerElement.style.userSelect = 'none'
        markerElement.style.outline = 'none'
        markerElement.style.boxShadow = 'none'

        const markerAsset = getAircraftMarkerAsset(f.aircraftType)
        markerElement.style.width = `${markerAsset.size}px`
        markerElement.style.height = `${markerAsset.size}px`

        const markerImage = document.createElement('img')
        markerImage.src = markerAsset.src
        markerImage.alt = `${f.aircraftType ?? 'aircraft'} icon`
        markerImage.draggable = false
        markerImage.style.width = `${markerAsset.size}px`
        markerImage.style.height = `${markerAsset.size}px`
        markerImage.style.display = 'block'
        markerImage.style.pointerEvents = 'none'
        markerImage.style.transform = `rotate(${f.heading}deg)`
        markerImage.style.transformOrigin = 'center center'
        markerImage.style.filter = theme === 'light' ? 'brightness(0)' : 'brightness(0) invert(1)'
        markerImage.style.opacity = isSelected ? '1' : '0.9'
        markerImage.style.background = 'transparent'
        markerImage.style.border = '0'
        markerImage.style.outline = 'none'
        markerImage.style.boxShadow = 'none'
        markerElement.replaceChildren(markerImage)
        markerElement.setAttribute('aria-label', `${f.callsign} ${f.aircraftType ?? 'aircraft'} marker`)
        markerElement.addEventListener('click', () => onSelect(f.id))

        const marker = new mapboxgl.Marker({ element: markerElement, anchor: 'center' })
          .setLngLat([f.lng, f.lat])
          .addTo(map)

        markersRef.current.push(marker)
      })

      const lineCollection = {
        type: 'FeatureCollection' as const,
        features: [...plannedFeatures, ...trailFeatures, ...headingFeatures],
      }

      const existingSource = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
      if (existingSource) {
        existingSource.setData(lineCollection as any)
      } else {
        map.addSource(SOURCE_ID, { type: 'geojson', data: lineCollection as any })

        map.addLayer({
          id: PLANNED_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['get', 'kind'], 'planned'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width'],
            'line-opacity': ['get', 'opacity'],
            'line-dasharray': [3, 3],
          },
        })

        map.addLayer({
          id: TRAIL_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['get', 'kind'], 'trail'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width'],
            'line-opacity': ['get', 'opacity'],
          },
        })

        map.addLayer({
          id: HEADING_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['get', 'kind'], 'heading'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width'],
            'line-opacity': ['get', 'opacity'],
          },
        })
      }

      if (flights.length === 0) {
        hasFittedInitialBoundsRef.current = false
      }

      if (flights.length > 0 && !hasFittedInitialBoundsRef.current) {
        const bounds = flights.reduce((acc, flight) => {
          acc.extend([flight.lng, flight.lat])
          return acc
        }, new mapboxgl.LngLatBounds([flights[0].lng, flights[0].lat], [flights[0].lng, flights[0].lat]))

        map.fitBounds(bounds as LngLatBoundsLike, { padding: 80, maxZoom: 6, duration: 0 })
        hasFittedInitialBoundsRef.current = true
      }
    }

    if (!map.isStyleLoaded()) {
      map.once('load', syncMap)
      return () => {
        map.off('load', syncMap)
      }
    }

    syncMap()
  }, [flights, airportsByIcao, selectedId, onSelect, theme])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[420px] rounded-xl overflow-hidden border ${
        theme === 'light' ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-slate-900'
      }`}
    />
  )
}
