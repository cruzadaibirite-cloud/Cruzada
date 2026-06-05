import { useEffect, useRef } from 'react'

export default function MapaEvangelismo({ abordagens }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const marcadoresRef = useRef([])

  useEffect(() => {
    const L = window.L
    if (!L) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapRef.current).setView([-20.0509, -44.0558], 13)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const L = window.L
    if (!L || !mapInstanceRef.current) return

    marcadoresRef.current.forEach(m => m.remove())
    marcadoresRef.current = []

    geocodificarTodas(L, mapInstanceRef.current, abordagens)
  }, [abordagens])

  async function geocodificarTodas(L, map, abordagens) {
    const pontos = []

    for (const ab of abordagens) {
      if (!ab.endereco) continue
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ab.endereco)}&format=json&limit=1`)
        const data = await res.json()
        if (!data.length) continue
        const { lat, lon } = data[0]

        const icone = L.divIcon({
          className: '',
          html: `<svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 8 12 24 12 24S24 20 24 12C24 5.373 18.627 0 12 0z" fill="#F97310"/>
            <circle cx="12" cy="12" r="5" fill="#fff"/>
          </svg>`,
          iconSize: [24, 36],
          iconAnchor: [12, 36],
          popupAnchor: [0, -36],
        })

        const data_hora = ab.data_hora
          ? new Date(ab.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          : '—'

        const marker = L.marker([parseFloat(lat), parseFloat(lon)], { icon: icone })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; min-width: 160px;">
              <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;">${ab.endereco}</div>
              <div style="font-size: 12px; color: #666;">${data_hora}</div>
              <div style="font-size: 13px; font-weight: 700; color: #F97310; margin-top: 6px;">${ab.total_pessoas || 0} pessoa(s) evangelizada(s)</div>
              ${ab.observacao ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">${ab.observacao}</div>` : ''}
            </div>
          `)

        marcadoresRef.current.push(marker)
        pontos.push([parseFloat(lat), parseFloat(lon)])
      } catch {}
    }

    if (pontos.length === 1) {
      map.setView(pontos[0], 15)
    } else if (pontos.length > 1) {
      const bounds = L.latLngBounds(pontos)
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }

  return (
    <>
      <style>{`
        .mapa-evangelismo { height: calc(100vh - 200px); }
        @media (max-width: 768px) { .mapa-evangelismo { height: calc(100vh - 280px); } }
      `}</style>
      <div ref={mapRef} className="mapa-evangelismo" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }} />
    </>
  )
}
