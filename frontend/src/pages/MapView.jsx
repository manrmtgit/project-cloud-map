import React, { useState, useEffect, useRef, useCallback } from 'react'
import { signalementService } from '../services/api'
import './MapView.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const getPhotoSrc = (photo) => {
  if (photo.base64_data) {
    if (photo.base64_data.startsWith('data:')) return photo.base64_data
    return `data:${photo.mimetype || 'image/jpeg'};base64,${photo.base64_data}`
  }
  return `${API_URL}/uploads/${photo.filename}`
}

const statutLabel = (s) => {
  const map = { NOUVEAU: 'Nouveau', EN_COURS: 'En cours', TERMINE: 'Terminé' }
  return map[s] || s
}

/* ── SVG Pin-Drop Marker Icons ── */
const svgToUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const PIN_SVGS = {
  NOUVEAU: svgToUrl(`
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0 C31 0 40 9 40 20 C40 35 20 50 20 50 C20 50 0 35 0 20 C0 9 9 0 20 0Z" fill="#e74c3c"/>
          <circle cx="20" cy="20" r="12" fill="white"/>
          <text x="20" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#e74c3c">!</text>
        </svg>`),
  EN_COURS: svgToUrl(`
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0 C31 0 40 9 40 20 C40 35 20 50 20 50 C20 50 0 35 0 20 C0 9 9 0 20 0Z" fill="#f39c12"/>
          <circle cx="20" cy="20" r="12" fill="white"/>
          <path d="M14 20 L18 20 L18 14 L22 14 L22 20 L26 20 L20 26 Z" fill="#f39c12"/>
        </svg>`),
  TERMINE: svgToUrl(`
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0 C31 0 40 9 40 20 C40 35 20 50 20 50 C20 50 0 35 0 20 C0 9 9 0 20 0Z" fill="#27ae60"/>
          <circle cx="20" cy="20" r="12" fill="white"/>
          <path d="M14 20 L18 24 L26 16" stroke="#27ae60" stroke-width="3" fill="none" stroke-linecap="round"/>
        </svg>`)
}

const MapView = () => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const popupRef = useRef(null)
  const hoverTimeoutRef = useRef(null)
  const [signalements, setSignalements] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('tous')
  const [selectedSig, setSelectedSig] = useState(null)
  const [showPhotos, setShowPhotos] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [sigData, statsData] = await Promise.all([
          signalementService.getAll(),
          signalementService.getStats().catch(() => null)
        ])
        setSignalements(sigData.signalements || sigData || [])
        if (statsData?.stats) {
          const s = statsData.stats
          setStats({
            total: parseInt(s.total_signalements) || 0,
            total_surface: parseFloat(s.total_surface_m2) || 0,
            total_budget: parseFloat(s.total_budget) || 0,
            avancement: parseFloat(s.avancement_global) || 0
          })
        }
      } catch (e) { console.error('Erreur chargement signalements:', e) }
      finally { setLoading(false) }
    })()
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }
        },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
      },
      center: [47.52, -18.91],
      zoom: 12
    })
    map.addControl(new window.maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  const buildPopupHTML = useCallback((sig) => {
    const badgeClass = sig.statut === 'TERMINE' ? 'success' : sig.statut === 'EN_COURS' ? 'warning' : 'danger'
    const hasPhotos = sig.photos && sig.photos.length > 0 && sig.photos[0]?.id
    return `
      <div class="popup-content">
        <div class="popup-title">${sig.titre || 'Signalement'}</div>
        <div class="popup-row"><i class="fa-regular fa-calendar"></i> ${sig.date_creation ? new Date(sig.date_creation).toLocaleDateString('fr-FR') : '—'}</div>
        <div class="popup-row"><i class="fa-solid fa-signal"></i> Statut: <span class="badge badge-${badgeClass}" style="margin-left:4px">${statutLabel(sig.statut)}</span></div>
        <div class="popup-row"><i class="fa-solid fa-ruler-combined"></i> Surface: <strong>${sig.surface_m2 ? sig.surface_m2 + ' m²' : '—'}</strong></div>
        <div class="popup-row"><i class="fa-solid fa-coins"></i> Budget: <strong>${sig.budget ? Number(sig.budget).toLocaleString('fr-FR') + ' Ar' : '—'}</strong></div>
        <div class="popup-row"><i class="fa-solid fa-building"></i> Entreprise: ${sig.entreprise || '—'}</div>
        <div class="popup-row"><i class="fa-solid fa-layer-group"></i> Niveau: <strong>${sig.niveau || 1}</strong>/10</div>
        ${hasPhotos ? `<div class="popup-row popup-photos-link" data-sig-id="${sig.id}"><i class="fa-solid fa-images"></i> <a href="#">Voir les photos (${sig.photos.length})</a></div>` : ''}
      </div>
    `
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }

    const filtered = filter === 'tous' ? signalements : signalements.filter(s => s.statut === filter)

    filtered.forEach(sig => {
      if (!sig.latitude || !sig.longitude) return
      const lngLat = [parseFloat(sig.longitude), parseFloat(sig.latitude)]

      // SVG pin-drop marker — img element prevents hover displacement
      const el = document.createElement('div')
      el.style.cssText = 'cursor:pointer;line-height:0;'
      const img = document.createElement('img')
      img.src = PIN_SVGS[sig.statut] || PIN_SVGS.NOUVEAU
      img.style.cssText = 'width:32px;height:44px;display:block;pointer-events:none;transition:transform .15s ease;transform-origin:bottom center;'
      img.draggable = false
      el.appendChild(img)

      // Hover — show popup, scale icon from bottom anchor
      el.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.25)'
        if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null }
        if (popupRef.current) popupRef.current.remove()

        const popup = new window.maplibregl.Popup({
          offset: [0, -48],
          closeButton: false,
          closeOnClick: false,
          maxWidth: '320px',
          anchor: 'bottom'
        })
          .setLngLat(lngLat)
          .setHTML(buildPopupHTML(sig))
          .addTo(mapRef.current)

        popupRef.current = popup

        // Keep popup alive when hovering over it
        const popupEl = popup.getElement()
        if (popupEl) {
          popupEl.addEventListener('mouseenter', () => {
            if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null }
          })
          popupEl.addEventListener('mouseleave', () => {
            hoverTimeoutRef.current = setTimeout(() => {
              if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
            }, 200)
          })
        }

        // Bind photo link
        setTimeout(() => {
          const photoLink = document.querySelector(`.popup-photos-link[data-sig-id="${sig.id}"] a`)
          if (photoLink) {
            photoLink.addEventListener('click', (e) => {
              e.preventDefault()
              setSelectedSig(sig)
              setShowPhotos(true)
              if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
            })
          }
        }, 50)
      })

      el.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)'
        hoverTimeoutRef.current = setTimeout(() => {
          if (popupRef.current) {
            const popupEl = popupRef.current.getElement()
            if (popupEl && !popupEl.matches(':hover')) {
              popupRef.current.remove()
              popupRef.current = null
            }
          }
        }, 300)
      })

      el.addEventListener('click', () => {
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
        setSelectedSig(sig)
        setShowPhotos(false)
      })

      const marker = new window.maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(lngLat)
        .addTo(mapRef.current)
      markersRef.current.push(marker)
    })
  }, [signalements, filter, buildPopupHTML])

  const statuts = [
    { key: 'tous', label: 'Tous', icon: 'fa-layer-group', color: 'var(--gray-600)' },
    { key: 'NOUVEAU', label: 'Nouveaux', icon: 'fa-circle-exclamation', color: 'var(--danger)' },
    { key: 'EN_COURS', label: 'En cours', icon: 'fa-hammer', color: 'var(--warning)' },
    { key: 'TERMINE', label: 'Terminés', icon: 'fa-circle-check', color: 'var(--success)' },
  ]

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <div className="map-filters">
          {statuts.map(s => (
            <button key={s.key} className={`filter-chip ${filter === s.key ? 'active' : ''}`} onClick={() => setFilter(s.key)}>
              <i className={`fa-solid ${s.icon}`} style={{color: filter === s.key ? '#fff' : s.color}}></i>
              {s.label}
              <span className="chip-count">{s.key === 'tous' ? signalements.length : signalements.filter(x => x.statut === s.key).length}</span>
            </button>
          ))}
        </div>
        <div className="map-info"><i className="fa-solid fa-map-pin"></i> Antananarivo</div>
      </div>

      <div className="map-container" ref={mapContainerRef} />

      {stats && (
        <div className="map-recap">
          <div className="recap-item"><i className="fa-solid fa-map-pin"></i><span><strong>{stats.total}</strong> points</span></div>
          <div className="recap-divider"></div>
          <div className="recap-item"><i className="fa-solid fa-ruler-combined"></i><span><strong>{Number(stats.total_surface).toLocaleString('fr-FR')}</strong> m²</span></div>
          <div className="recap-divider"></div>
          <div className="recap-item"><i className="fa-solid fa-chart-line"></i><span><strong>{stats.avancement}%</strong> avancement</span></div>
          <div className="recap-divider"></div>
          <div className="recap-item"><i className="fa-solid fa-coins"></i><span><strong>{Number(stats.total_budget).toLocaleString('fr-FR')}</strong> Ar</span></div>
        </div>
      )}

      {selectedSig && !showPhotos && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3>{selectedSig.titre || 'Signalement'}</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setSelectedSig(null)}><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="detail-body">
            <div className="detail-row"><i className="fa-solid fa-info-circle"></i><span>{selectedSig.description || 'Aucune description'}</span></div>
            <div className="detail-row"><i className="fa-solid fa-signal"></i><span>Statut : <span className={`badge badge-${selectedSig.statut === 'TERMINE' ? 'success' : selectedSig.statut === 'EN_COURS' ? 'warning' : 'danger'}`}>{statutLabel(selectedSig.statut)}</span></span></div>
            <div className="detail-row"><i className="fa-solid fa-layer-group"></i><span>Niveau : <strong>{selectedSig.niveau || 1}</strong>/10</span></div>
            <div className="detail-row"><i className="fa-solid fa-ruler-combined"></i><span>Surface : <strong>{selectedSig.surface_m2 ? selectedSig.surface_m2 + ' m²' : '—'}</strong></span></div>
            <div className="detail-row"><i className="fa-solid fa-coins"></i><span>Budget : <strong>{selectedSig.budget ? Number(selectedSig.budget).toLocaleString('fr-FR') + ' Ar' : '—'}</strong></span></div>
            {selectedSig.utilisateur_nom && <div className="detail-row"><i className="fa-regular fa-user"></i><span>Signalé par : {selectedSig.utilisateur_nom}</span></div>}
            {selectedSig.entreprise && <div className="detail-row"><i className="fa-solid fa-building"></i><span>Entreprise : {selectedSig.entreprise}</span></div>}
            <div className="detail-row"><i className="fa-regular fa-calendar"></i><span>Créé le : {new Date(selectedSig.date_creation).toLocaleDateString('fr-FR')}</span></div>
            {selectedSig.date_en_cours && <div className="detail-row"><i className="fa-solid fa-play"></i><span>En cours le : {new Date(selectedSig.date_en_cours).toLocaleDateString('fr-FR')}</span></div>}
            {selectedSig.date_termine && <div className="detail-row"><i className="fa-solid fa-check"></i><span>Terminé le : {new Date(selectedSig.date_termine).toLocaleDateString('fr-FR')}</span></div>}
            {selectedSig.photos && selectedSig.photos.length > 0 && selectedSig.photos[0]?.id && (
              <div className="detail-row" style={{marginTop:8}}>
                <i className="fa-solid fa-images"></i>
                <a href="#" onClick={(e) => { e.preventDefault(); setShowPhotos(true) }} style={{color:'var(--primary)', fontWeight:600}}>Voir les photos ({selectedSig.photos.length})</a>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedSig && showPhotos && (
        <div className="modal-overlay" onClick={() => setShowPhotos(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:700, width:'95%'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
              <h2><i className="fa-solid fa-images" style={{marginRight:8}}></i> Photos — {selectedSig.titre}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPhotos(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            {selectedSig.photos && selectedSig.photos.length > 0 && selectedSig.photos[0]?.id ? (
              <div className="photo-modal-grid">
                {selectedSig.photos.map((p, i) => (
                  <div key={p.id || i} className="photo-modal-item">
                    <img src={getPhotoSrc(p)} alt={p.filename || `Photo ${i+1}`} />
                    <div className="photo-modal-name">{p.filename || `Photo ${i+1}`}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{textAlign:'center', color:'var(--gray-400)', padding:40}}>Aucune photo disponible</p>
            )}
            <div style={{display:'flex', justifyContent:'space-between', marginTop:16}}>
              <button className="btn btn-secondary" onClick={() => setShowPhotos(false)}><i className="fa-solid fa-arrow-left"></i> Retour</button>
              <button className="btn btn-secondary" onClick={() => { setShowPhotos(false); setSelectedSig(null) }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="map-loading"><div className="spinner"></div></div>}
    </div>
  )
}

export default MapView
