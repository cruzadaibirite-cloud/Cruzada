import { useEffect, useRef } from 'react'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function MapaLocal({ local, height }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapRef.current).setView([-20.0509, -44.0558], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    mapInstanceRef.current = map

    if (local) geocodificar(map, local)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!local || !mapInstanceRef.current) return
    geocodificar(mapInstanceRef.current, local)
  }, [local])

  async function geocodificar(map, local) {
    if (!local.endereco) return
    const query = `${local.endereco}, ${local.bairro || ''}, Ibirité, MG, Brasil`
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
      const data = await res.json()
      if (!data.length) return
      const { lat, lon } = data[0]
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<b>${local.nome}</b><br>${local.endereco}`)
        .openPopup()
      map.setView([lat, lon], 16)
    } catch {}
  }

  return (
    <>
      <style>{`
        .mapa-local { height: ${height || 'calc(100vh - 240px)'}; }
        @media (max-width: 768px) { .mapa-local { height: calc(100vh - 320px) !important; } }
      `}</style>
      <div ref={mapRef} className="mapa-local" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }} />
    </>
  )
}
