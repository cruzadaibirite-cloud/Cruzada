import { useEffect, useRef, useState } from 'react'

export default function MapaEvangelismo({ abordagens }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const marcadoresRef = useRef([])
  const [telaCheia, setTelaCheia] = useState(false)

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
          html: `
            <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;width:20px;height:20px;background:rgba(249,115,16,0.4);border-radius:50%;animation:ping 1.5s ease-in-out infinite;"></div>
              <div style="width:10px;height:10px;background:#F97310;border-radius:50%;border:0.5px solid #fff;position:relative;z-index:1;"></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -12],
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
        .mapa-evangelismo-tela-cheia { height: 100vh !important; border-radius: 0 !important; }
        .mapa-evangelismo .leaflet-tile { outline: 1px solid transparent; }
        .mapa-evangelismo img.leaflet-tile { margin: 0; padding: 0; }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'relative', ...(telaCheia ? { position: 'fixed', inset: 0, zIndex: 9999 } : {}) }}>
        <button
          onClick={() => { setTelaCheia(v => !v); setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100) }}
          style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1000, background: '#fff', border: 'none', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          {telaCheia
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          }
        </button>
        <div ref={mapRef} className={`mapa-evangelismo${telaCheia ? ' mapa-evangelismo-tela-cheia' : ''}`} style={{ borderRadius: telaCheia ? '0' : '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }} />
      </div>
    </>
  )
}
