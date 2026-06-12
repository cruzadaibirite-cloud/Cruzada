import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

function pinIcon(L, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12.5" cy="12.5" r="5" fill="#fff" opacity="0.8"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

const MapaLocal = forwardRef(function MapaLocal({ local, height }, ref) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const userMarkerRef = useRef(null)

  useImperativeHandle(ref, () => ({
    ativarLocalizacao() {
      const L = window.L
      const map = mapInstanceRef.current
      if (!L || !map || !navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const { latitude, longitude } = coords
          if (userMarkerRef.current) userMarkerRef.current.remove()
          userMarkerRef.current = L.marker([latitude, longitude], { icon: pinIcon(L, '#f97316'), zIndexOffset: 100 })
            .addTo(map)
            .bindPopup('<b>Você está aqui</b>')
          ajustarZoom(map)
        },
        () => {}
      )
    },
    ajustarZoom() {
      ajustarZoom(mapInstanceRef.current)
    }
  }))

  function ajustarZoom(map) {
    if (!map) return
    const L = window.L
    const pontos = [markerRef.current, userMarkerRef.current].filter(Boolean)
    if (pontos.length === 0) return
    if (pontos.length === 1) {
      map.setView(pontos[0].getLatLng(), 16)
      return
    }
    const bounds = L.latLngBounds(pontos.map(m => m.getLatLng()))
    map.fitBounds(bounds, { padding: [40, 40] })
  }

  useEffect(() => {
    const L = window.L
    if (!L) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const map = L.map(mapRef.current).setView([-20.0509, -44.0558], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    mapInstanceRef.current = map

    adicionarLocalizacaoAtual(map, L)

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

  function adicionarLocalizacaoAtual(map, L) {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords
        if (userMarkerRef.current) userMarkerRef.current.remove()
        userMarkerRef.current = L.marker([latitude, longitude], { icon: pinIcon(L, '#f97316'), zIndexOffset: 100 })
          .addTo(map)
          .bindPopup('<b>Você está aqui</b>')
        ajustarZoom(map)
      },
      () => {}
    )
  }

async function geocodificar(map, local) {
    if (!local.endereco) return
    const L = window.L
    const query = `${local.endereco}, ${local.bairro || ''}, Ibirité, MG, Brasil`
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
      const data = await res.json()
      if (!data.length) return
      const { lat, lon } = data[0]
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = L.marker([lat, lon], { icon: pinIcon(L, '#ef4444') })
        .addTo(map)
        .bindPopup(`<b>${local.nome}</b><br>${local.endereco}`)
      ajustarZoom(map)
      markerRef.current.openPopup()
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
})

export default MapaLocal
