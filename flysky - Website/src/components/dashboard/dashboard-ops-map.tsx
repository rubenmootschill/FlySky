'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl, { type GeoJSONSource, type Map as MapboxMap } from 'mapbox-gl'

type MapPoint = {
  id: string
  lat: number
  lng: number
  title: string
  subtitle?: string
  heading?: number
}

type DashboardOpsMapProps = {
  liveFlights: MapPoint[]
  events: MapPoint[]
  notifications: MapPoint[]
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmlubm95YWlyd2F5cyIsImEiOiJjbWJhNWk2aHAwaGFxMmlzaTZrZjVxcTYyIn0.ulHtSfoUvNyDHc7EIdiLOg'

function toFeatureCollection(points: MapPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((point) => ({
      type: 'Feature' as const,
      properties: {
        id: point.id,
        title: point.title,
        subtitle: point.subtitle || '',
        heading: Number.isFinite(point.heading) ? point.heading : 0,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [point.lng, point.lat],
      },
    })),
  }
}

export default function DashboardOpsMap({
  liveFlights,
  events,
  notifications,
}: DashboardOpsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const hasFitLiveRef = useRef(false)

  const [showLive, setShowLive] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [showNotifications, setShowNotifications] = useState(true)

  const liveData = useMemo(() => toFeatureCollection(showLive ? liveFlights : []), [showLive, liveFlights])
  const eventsData = useMemo(() => toFeatureCollection(showEvents ? events : []), [showEvents, events])
  const notificationsData = useMemo(
    () => toFeatureCollection(showNotifications ? notifications : []),
    [showNotifications, notifications],
  )
  const visibleLiveCount = showLive ? liveFlights.length : 0

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [12, 48],
      zoom: 2.4,
      projection: 'globe',
      attributionControl: true,
    })

    map.on('load', () => {
      map.addSource('ops-live', { type: 'geojson', data: liveData as any })
      map.addSource('ops-events', { type: 'geojson', data: eventsData as any })
      map.addSource('ops-notifications', { type: 'geojson', data: notificationsData as any })

      map.addLayer({
        id: 'ops-live-layer',
        type: 'symbol',
        source: 'ops-live',
        layout: {
          'text-field': '✈',
          'text-size': 20,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-rotate': ['to-number', ['coalesce', ['get', 'heading'], 0]],
          'text-rotation-alignment': 'map',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#16a34a',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.4,
        },
      })

      map.addLayer({
        id: 'ops-events-layer',
        type: 'circle',
        source: 'ops-events',
        paint: {
          'circle-radius': 6,
          'circle-color': '#2563eb',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      map.addLayer({
        id: 'ops-notifications-layer',
        type: 'circle',
        source: 'ops-notifications',
        paint: {
          'circle-radius': 6,
          'circle-color': '#9333ea',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      const popupHandler = (event: mapboxgl.MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return
        const [lng, lat] = feature.geometry.coordinates as [number, number]
        const title = String(feature.properties?.title || 'Item')
        const subtitle = String(feature.properties?.subtitle || '')

        new mapboxgl.Popup({ closeButton: false, closeOnClick: true })
          .setLngLat([lng, lat])
          .setHTML(`<div style=\"font-weight:600\">${title}</div><div style=\"font-size:12px;color:#64748b\">${subtitle}</div>`)
          .addTo(map)
      }

      ;['ops-live-layer', 'ops-events-layer', 'ops-notifications-layer'].forEach((layerId) => {
        map.on('click', layerId, popupHandler)
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
        })
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [eventsData, liveData, notificationsData])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    ;(map.getSource('ops-live') as GeoJSONSource | undefined)?.setData(liveData as any)
    ;(map.getSource('ops-events') as GeoJSONSource | undefined)?.setData(eventsData as any)
    ;(map.getSource('ops-notifications') as GeoJSONSource | undefined)?.setData(notificationsData as any)
  }, [liveData, eventsData, notificationsData])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !showLive || liveFlights.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    for (const flight of liveFlights) {
      bounds.extend([flight.lng, flight.lat])
    }

    if (!hasFitLiveRef.current) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 6, duration: 900 })
      hasFitLiveRef.current = true
    }
  }, [liveFlights, showLive])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative h-80 w-full overflow-hidden rounded-xl border border-slate-200">
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-emerald-600">Live {visibleLiveCount}</span>
        </div>
        {visibleLiveCount === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-4 text-center">
            <div className="mx-auto inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              No live aircraft currently
            </div>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  )
}
