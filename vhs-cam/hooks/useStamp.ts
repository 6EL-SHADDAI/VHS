'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

export interface StampData {
  dateTime:        string
  location:        string | null
  enabled:         boolean
  locationEnabled: boolean
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function formatDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const mon = MONTHS[d.getMonth()]
  const yr  = d.getFullYear()
  const hr  = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${mon} ${yr}  ${hr}:${min}`
}

export function useStamp() {
  const [enabled, setEnabled]                 = useState(true)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [dateTime, setDateTime]               = useState(() => formatDateTime(new Date()))
  const [location, setLocation]               = useState<string | null>(null)
  const [locationStatus, setLocationStatus]   = useState<'idle'|'requesting'|'ready'|'denied'>('idle')
  const geoWatchRef    = useRef<number | null>(null)
  const lastCoordsRef  = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const id = setInterval(() => setDateTime(formatDateTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const addr = data.address
      const city = addr.city || addr.town || addr.village || addr.county || addr.state
      const cc   = addr.country_code?.toUpperCase() ?? ''
      if (city && cc)  setLocation(`${city}, ${cc}`)
      else if (city)   setLocation(city)
      else             setLocation(data.display_name?.split(',')[0] ?? null)
    } catch {}
  }, [])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return }
    setLocationStatus('requesting')
    geoWatchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        const last  = lastCoordsRef.current
        const moved = !last || Math.abs(lat - last.lat) > 0.005 || Math.abs(lng - last.lng) > 0.005
        if (moved) { lastCoordsRef.current = { lat, lng }; reverseGeocode(lat, lng) }
        setLocationStatus('ready')
      },
      () => { setLocationStatus('denied'); setLocation(null) },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }, [reverseGeocode])

  const stopLocation = useCallback(() => {
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current)
      geoWatchRef.current = null
    }
    setLocation(null)
    setLocationStatus('idle')
  }, [])

  const toggleLocation = useCallback(() => {
    if (locationEnabled) { setLocationEnabled(false); stopLocation() }
    else                 { setLocationEnabled(true);  requestLocation() }
  }, [locationEnabled, requestLocation, stopLocation])

  useEffect(() => () => {
    if (geoWatchRef.current !== null)
      navigator.geolocation.clearWatch(geoWatchRef.current)
  }, [])

  return {
    enabled, setEnabled,
    locationEnabled, toggleLocation,
    locationStatus,
    stamp: {
      dateTime,
      location: locationEnabled ? location : null,
      enabled,
      locationEnabled,
    } as StampData,
  }
}