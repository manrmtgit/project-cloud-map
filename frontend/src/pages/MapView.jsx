import React, { useEffect, useRef, useState } from 'react'
import { signalementService } from '../services/signalement.api'
import StatsPanel from '../components/StatsPanel'
import SignalementPopup from '../components/SignalementPopup'
import Legend from '../components/Legend'
import './MapView.css'

const MapView = () => {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [signalements, setSignalements] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSignalement, setSelectedSignalement] = useState(null)
  const [filterStatut, setFilterStatut] = useState('TOUS')
  const [mapLoaded, setMapLoaded] = useState(false)
  const markersRef = useRef([])

  // Couleurs par statut
  const statusColors = {
    'NOUVEAU': '#e74c3c',
    'EN_COURS': '#f39c12',
    'TERMINE': '#27ae60'
  }

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [signalementsData, statsData] = await Promise.all([
          signalementService.getAll(),
          signalementService.getStats()
        ])
        setSignalements(signalementsData.signalements || [])
        setStats(statsData.stats)
      } catch (error) {
        console.error('Erreur chargement données:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Initialiser la carte
  useEffect(() => {
    if (map.current || !window.maplibregl) return

    map.current = new window.maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [47.5079, -18.8792], // Antananarivo
      zoom: 13
    })

    map.current.addControl(new window.maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(new window.maplibregl.ScaleControl(), 'bottom-left')
    
    map.current.on('load', () => {
      setMapLoaded(true)
    })

  }, [])

  // Ajouter les marqueurs
  useEffect(() => {
    if (!map.current || !mapLoaded || signalements.length === 0) return

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Filtrer les signalements
    const filteredSignalements = filterStatut === 'TOUS' 
      ? signalements 
      : signalements.filter(s => s.statut === filterStatut)

    // Ajouter les nouveaux marqueurs
    filteredSignalements.forEach(signalement => {
      const el = document.createElement('div')
      el.className = 'custom-marker'
      el.style.backgroundColor = statusColors[signalement.statut] || '#999'
      el.style.width = '24px'
      el.style.height = '24px'
      el.style.borderRadius = '50%'
      el.style.border = '3px solid white'
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
      el.style.cursor = 'pointer'

      el.addEventListener('click', () => {
        setSelectedSignalement(signalement)
      })

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)'
      })

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)'
      })

      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat([signalement.longitude, signalement.latitude])
        .addTo(map.current)
      
      markersRef.current.push(marker)
    })

  }, [signalements, filterStatut, mapLoaded])

  const formatBudget = (budget) => {
    if (!budget) return 'Non défini'
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      maximumFractionDigits: 0
    }).format(budget)
  }

  return (
    <div className="map-view">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>🛣️ Signalement Routier - Antananarivo</h1>
          <span className="badge visitor">Mode Visiteur</span>
        </div>
        <div className="header-right">
          <select 
            value={filterStatut} 
            onChange={(e) => setFilterStatut(e.target.value)}
            className="filter-select"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="NOUVEAU">🔴 Nouveau</option>
            <option value="EN_COURS">🟡 En cours</option>
            <option value="TERMINE">🟢 Terminé</option>
          </select>
        </div>
      </header>

      {/* Container principal */}
      <div className="main-container">
        {/* Panneau des statistiques */}
        <StatsPanel stats={stats} loading={loading} formatBudget={formatBudget} />

        {/* Carte */}
        <div className="map-container">
          <div ref={mapContainer} className="map" />
          
          {/* Légende */}
          <Legend statusColors={statusColors} />
        </div>
      </div>

      {/* Popup signalement */}
      {selectedSignalement && (
        <SignalementPopup 
          signalement={selectedSignalement}
          onClose={() => setSelectedSignalement(null)}
          formatBudget={formatBudget}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Chargement des données...</p>
        </div>
      )}
    </div>
  )
}

export default MapView
