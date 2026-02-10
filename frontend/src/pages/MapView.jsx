import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hybridSignalementService } from '../services/hybridService'
import StatsPanel from '../components/StatsPanel'
import Legend from '../components/Legend'
import ConnectionIndicator from '../components/ConnectionIndicator'
import './MapView.css'

const MapView = () => {
  const { user, logout, connectionMode } = useAuth()
  const navigate = useNavigate()
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [signalements, setSignalements] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('TOUS')
  const [mapLoaded, setMapLoaded] = useState(false)
  const markersRef = useRef([])
  const popupRef = useRef(null)

  // Vérifier si l'utilisateur est manager
  const isManager = user?.role === 'manager' || user?.email === 'manager@cloudmap.local'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Icônes SVG par type de problème
  const getMarkerIcon = (statut) => {
    const icons = {
      'NOUVEAU': `
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0 C31 0 40 9 40 20 C40 35 20 50 20 50 C20 50 0 35 0 20 C0 9 9 0 20 0Z" fill="#e74c3c"/>
          <circle cx="20" cy="20" r="12" fill="white"/>
          <text x="20" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#e74c3c">!</text>
        </svg>
      `,
      'EN_COURS': `
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0 C31 0 40 9 40 20 C40 35 20 50 20 50 C20 50 0 35 0 20 C0 9 9 0 20 0Z" fill="#f39c12"/>
          <circle cx="20" cy="20" r="12" fill="white"/>
          <path d="M14 20 L18 20 L18 14 L22 14 L22 20 L26 20 L20 26 Z" fill="#f39c12"/>
        </svg>
      `,
      'TERMINE': `
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0 C31 0 40 9 40 20 C40 35 20 50 20 50 C20 50 0 35 0 20 C0 9 9 0 20 0Z" fill="#27ae60"/>
          <circle cx="20" cy="20" r="12" fill="white"/>
          <path d="M14 20 L18 24 L26 16" stroke="#27ae60" stroke-width="3" fill="none" stroke-linecap="round"/>
        </svg>
      `
    }
    return icons[statut] || icons['NOUVEAU']
  }

  const formatBudget = (budget) => {
    if (!budget) return 'Non défini'
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      maximumFractionDigits: 0
    }).format(budget)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusLabel = (statut) => {
    const labels = {
      'NOUVEAU': 'Nouveau',
      'EN_COURS': 'En cours',
      'TERMINE': 'Terminé'
    }
    return labels[statut] || statut
  }

  const getStatusClass = (statut) => {
    const classes = {
      'NOUVEAU': 'status-nouveau',
      'EN_COURS': 'status-en-cours',
      'TERMINE': 'status-termine'
    }
    return classes[statut] || ''
  }

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [signalementsData, statsData] = await Promise.all([
          hybridSignalementService.getAll(),
          hybridSignalementService.getStats()
        ])
        setSignalements(Array.isArray(signalementsData) ? signalementsData : [])
        setStats(statsData)
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
      center: [47.5079, -18.8792],
      zoom: 14
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

    // Supprimer popup existante
    if (popupRef.current) {
      popupRef.current.remove()
    }

    // Filtrer les signalements
    const filteredSignalements = filterStatut === 'TOUS' 
      ? signalements 
      : signalements.filter(s => s.statut === filterStatut)

    // Ajouter les nouveaux marqueurs
    filteredSignalements.forEach(signalement => {
      const el = document.createElement('div')
      el.className = 'custom-marker-icon'
      el.innerHTML = getMarkerIcon(signalement.statut)
      el.style.cursor = 'pointer'
      el.style.width = '40px'
      el.style.height = '50px'

      // Popup HTML avec infos détaillées
      const popupHTML = `
        <div class="marker-popup">
          <div class="popup-header">
            <span class="popup-status ${getStatusClass(signalement.statut)}">${getStatusLabel(signalement.statut)}</span>
          </div>
          <h3 class="popup-title">${signalement.titre}</h3>
          ${signalement.description ? `<p class="popup-desc">${signalement.description}</p>` : ''}
          <div class="popup-info-grid">
            <div class="popup-info-item">
              <span class="popup-label">📅 Date</span>
              <span class="popup-value">${formatDate(signalement.date_creation)}</span>
            </div>
            <div class="popup-info-item">
              <span class="popup-label">📐 Surface</span>
              <span class="popup-value">${signalement.surface_m2 ? signalement.surface_m2 + ' m²' : 'Non définie'}</span>
            </div>
            <div class="popup-info-item">
              <span class="popup-label">💰 Budget</span>
              <span class="popup-value">${formatBudget(signalement.budget)}</span>
            </div>
            <div class="popup-info-item">
              <span class="popup-label">🏢 Entreprise</span>
              <span class="popup-value">${signalement.entreprise || 'Non assignée'}</span>
            </div>
          </div>
        </div>
      `

      const popup = new window.maplibregl.Popup({
        offset: [0, -40],
        closeButton: true,
        closeOnClick: false,
        maxWidth: '320px'
      }).setHTML(popupHTML)

      // Afficher popup au survol
      el.addEventListener('mouseenter', () => {
        if (popupRef.current) {
          popupRef.current.remove()
        }
        popup.setLngLat([signalement.longitude, signalement.latitude]).addTo(map.current)
        popupRef.current = popup
      })

      const marker = new window.maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([signalement.longitude, signalement.latitude])
        .addTo(map.current)
      
      markersRef.current.push(marker)
    })

  }, [signalements, filterStatut, mapLoaded])

  return (
    <div className="map-view">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>🛣️ Signalement Routier - Antananarivo</h1>
          <ConnectionIndicator />
          {user ? (
            <span className={`badge ${isManager ? 'manager' : 'user'}`}>
              {isManager ? '👔 Manager' : '👤 Utilisateur'}
            </span>
          ) : (
            <span className="badge visitor">🌍 Mode Visiteur</span>
          )}
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
          
          {user ? (
            <>
              <span className="user-name">👤 {user.name || user.email}</span>
              {isManager && (
                <Link to="/dashboard" className="btn-manager">
                  📊 Dashboard
                </Link>
              )}
              <Link to="/profile" className="btn-profile">
                ⚙️ Profil
              </Link>
              <button onClick={handleLogout} className="btn-logout">
                🚪 Déconnexion
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-login">
              🔐 Se connecter
            </Link>
          )}
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
          <Legend />
        </div>
      </div>

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
