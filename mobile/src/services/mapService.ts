import L from 'leaflet';
import { MAP_CONFIG } from '@/utils/constants';
import type { SignalementStatut, SignalementType } from '@/models';

// SVG icons identiques au module web
const SVG_ICONS = {
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
};

// Mapping des statuts vers les clés SVG
const STATUS_TO_SVG_KEY: Record<SignalementStatut, keyof typeof SVG_ICONS> = {
  'nouveau': 'NOUVEAU',
  'en_cours': 'EN_COURS',
  'termine': 'TERMINE'
};

// Créer une icône de marqueur personnalisée selon le statut
export const createMarkerIcon = (statut: SignalementStatut, type?: SignalementType): L.DivIcon => {
  const svgKey = STATUS_TO_SVG_KEY[statut] || 'NOUVEAU';
  const svg = SVG_ICONS[svgKey];

  return L.divIcon({
    className: 'custom-marker',
    html: svg,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50]
  });
};

// Créer un marqueur pour la position utilisateur
export const createUserLocationMarker = (): L.DivIcon => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: #4285F4;
        border: 4px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(66, 133, 244, 0.6);
        position: relative;
      ">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          background-color: rgba(66, 133, 244, 0.2);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s infinite;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// Initialiser la carte Leaflet
export const initMap = (containerId: string): L.Map => {
  const map = L.map(containerId, {
    center: [MAP_CONFIG.DEFAULT_CENTER.lat, MAP_CONFIG.DEFAULT_CENTER.lng],
    zoom: MAP_CONFIG.DEFAULT_ZOOM,
    minZoom: MAP_CONFIG.MIN_ZOOM,
    maxZoom: MAP_CONFIG.MAX_ZOOM,
    zoomControl: false // On utilise nos propres boutons
  });

  // Ajouter les tuiles OpenStreetMap
  L.tileLayer(MAP_CONFIG.TILE_URL, {
    attribution: MAP_CONFIG.TILE_ATTRIBUTION
  }).addTo(map);

  return map;
};

// Obtenir les limites (bounds) de la carte visible
export const getMapBounds = (map: L.Map) => {
  return map.getBounds();
};

// Centrer la carte sur une position
export const centerMap = (map: L.Map, lat: number, lng: number, zoom?: number) => {
  if (zoom) {
    map.setView([lat, lng], zoom);
  } else {
    map.panTo([lat, lng]);
  }
};

// Calculer la distance entre deux points (en km)
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default {
  createMarkerIcon,
  createUserLocationMarker,
  initMap,
  getMapBounds,
  centerMap,
  calculateDistance
};
