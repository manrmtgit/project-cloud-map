<template>
  <ion-page>
    <ion-content :fullscreen="true" class="map-content">
      <!-- Carte Leaflet -->
      <div id="map" ref="mapContainer"></div>

      <!-- Bouton Couches/Options (haut droit) -->
      <ion-fab vertical="top" horizontal="end" slot="fixed" class="fab-options">
        <ion-fab-button size="small" color="light" @click="showLayerOptions = true">
          <ion-icon :icon="layersOutline" size="small"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Bouton géolocalisation (bas droit) -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="fab-location">
        <ion-fab-button
            size="small"
            color="light"
            :disabled="mapStore.isLocating"
            @click="centerOnUserLocation"
        >
          <ion-spinner v-if="mapStore.isLocating" name="crescent"></ion-spinner>
          <ion-icon v-else :icon="locateOutline" size="small"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Bouton créer signalement (bas droit, sous le bouton localisation) -->
      <ion-fab
          vertical="bottom"
          horizontal="end"
          slot="fixed"
          class="fab-create"
          v-if="!mapStore.isPlacingMarker"
      >
        <ion-fab-button color="primary" @click="startCreateSignalement">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Mode placement de marqueur -->
      <div v-if="mapStore.isPlacingMarker" class="placing-mode">
        <div class="placing-instructions">
          <ion-icon :icon="locationOutline" style="font-size: 18px;"></ion-icon>
          <span>Cliquez sur la carte pour positionner le signalement</span>
        </div>
        <div class="placing-actions">
          <ion-button fill="outline" @click="cancelPlacing">Annuler</ion-button>
          <ion-button
              :disabled="!mapStore.placingLocation"
              @click="confirmPlacing"
          >
            Confirmer
          </ion-button>
        </div>
      </div>

      <!-- Barre de recherche (bas) -->
      <div class="search-bar" v-if="!mapStore.isPlacingMarker">
        <ion-searchbar
            v-model="searchQuery"
            placeholder="Rechercher un lieu..."
            :animated="true"
            @ionInput="onSearchInput"
            @ionClear="clearSearch"
        ></ion-searchbar>

        <!-- Toggle Mes signalements -->
        <ion-chip
            :color="signalementsStore.showOnlyMine ? 'primary' : 'medium'"
            @click="toggleMySignalements"
        >
          <ion-icon :icon="personOutline" style="margin-right: 6px; font-size: 16px;"></ion-icon>
          <ion-label>Mes signalements ({{ signalementsStore.myCount }})</ion-label>
        </ion-chip>

        <!-- Résultats de recherche -->
        <div v-if="searchResults.length > 0" class="search-results">
          <div
              v-for="result in searchResults"
              :key="result.place_id"
              class="search-result-item"
              @click="selectSearchResult(result)"
          >
            <ion-icon :icon="locationOutline" style="color: #6B4FFF; font-size: 20px;"></ion-icon>
            <span>{{ result.display_name }}</span>
          </div>
        </div>
      </div>

      <!-- Bottom Sheet signalement -->
      <SignalementBottomSheet
          :is-open="showBottomSheet"
          :signalement="selectedSignalement"
          @close="closeBottomSheet"
      />

      <!-- Modal création signalement -->
      <CreateSignalementModal
          :is-open="showCreateModal"
          :location="mapStore.placingLocation"
          @close="showCreateModal = false"
          @submit="handleCreateSignalement"
      />

      <!-- Options de couches -->
      <ion-action-sheet
          :is-open="showLayerOptions"
          header="Options de la carte"
          :buttons="layerButtons"
          @didDismiss="showLayerOptions = false"
      ></ion-action-sheet>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted, watch, nextTick} from 'vue';
import {
  IonPage,
  IonContent,
  IonFab,
  IonFabButton,
  IonSearchbar,
  IonChip,
  IonLabel,
  IonButton,
  IonSpinner,
  IonActionSheet,
  IonIcon,
  toastController,
  onIonViewDidEnter
} from '@ionic/vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';
import {useMapStore, useSignalementsStore} from '@/stores';
import {mapService} from '@/services';
import {MAP_CONFIG, SUCCESS_MESSAGES, ERROR_MESSAGES} from '@/utils/constants';
import type {Signalement, CreateSignalementData} from '@/models';
import SignalementBottomSheet from '@/components/SignalementBottomSheet.vue';
import CreateSignalementModal from '@/components/CreateSignalementModal.vue';
import {
  layersOutline,
  locateOutline,
  addOutline,
  locationOutline,
  personOutline
} from 'ionicons/icons';

const mapStore = useMapStore();
const signalementsStore = useSignalementsStore();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let markersLayer: L.LayerGroup | null = null;
let userMarker: L.Marker | null = null;
let placingMarker: L.Marker | null = null;

const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const showBottomSheet = ref(false);
const selectedSignalement = ref<Signalement | null>(null);
const showCreateModal = ref(false);
const showLayerOptions = ref(false);

let unsubscribe: (() => void) | null = null;

const layerButtons = [
  {
    text: 'Standard',
    handler: () => setMapStyle('standard')
  },
  {
    text: 'Satellite',
    handler: () => setMapStyle('satellite')
  },
  {
    text: 'Annuler',
    role: 'cancel'
  }
];

// Initialisation de la carte
onMounted(async () => {
  // Initialiser la carte
  map = L.map('map', {
    center: [MAP_CONFIG.DEFAULT_CENTER.lat, MAP_CONFIG.DEFAULT_CENTER.lng],
    zoom: MAP_CONFIG.DEFAULT_ZOOM,
    minZoom: MAP_CONFIG.MIN_ZOOM,
    maxZoom: MAP_CONFIG.MAX_ZOOM,
    zoomControl: false
  });

  // Utiliser MapLibre GL pour un rendu vectoriel optimisé (WebGL)
  try {
    (L as any).maplibreGL({
      style: MAP_CONFIG.VECTOR_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'
    }).addTo(map);
  } catch (e) {
    // Fallback vers les tuiles raster si MapLibre échoue
    L.tileLayer(MAP_CONFIG.TILE_URL, {
      attribution: MAP_CONFIG.TILE_ATTRIBUTION,
      subdomains: ['a', 'b', 'c'],
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 4
    }).addTo(map);
  }

  markersLayer = L.layerGroup().addTo(map);

  // Click sur la carte pour placement de marqueur
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (mapStore.isPlacingMarker) {
      mapStore.setPlacingLocation(e.latlng.lat, e.latlng.lng);
      updatePlacingMarker(e.latlng.lat, e.latlng.lng);
    }
  });

  // S'abonner aux signalements
  unsubscribe = signalementsStore.subscribeToUpdates();

  // Forcer le redimensionnement après le rendu initial
  await nextTick();
  setTimeout(() => {
    map?.invalidateSize();
  }, 200);

  // Obtenir la position de l'utilisateur
  await mapStore.getCurrentLocation();
  if (mapStore.userLocation) {
    updateUserMarker();
    map.setView([mapStore.userLocation.lat, mapStore.userLocation.lng], 15);
  }
});

// Fix critique: forcer invalidateSize quand la page Ionic devient visible
onIonViewDidEnter(() => {
  if (map) {
    map.invalidateSize();
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  if (map) {
    map.remove();
  }
});

// Mettre à jour les marqueurs quand les signalements changent
watch(
    () => signalementsStore.filteredSignalements,
    (signalements) => {
      updateMarkers(signalements);
    },
    {immediate: true}
);

// Mettre à jour les marqueurs sur la carte (function declaration pour le hoisting)
function updateMarkers(signalements: Signalement[]) {
  if (!markersLayer || !map) return;

  markersLayer.clearLayers();

  signalements.forEach((s) => {
    const icon = mapService.createMarkerIcon(s.statut, s.type);
    const marker = L.marker([s.latitude, s.longitude], {icon})
        .on('click', () => {
          selectedSignalement.value = s;
          showBottomSheet.value = true;
        });

    markersLayer?.addLayer(marker);
  });
}

// Mettre à jour le marqueur utilisateur
const updateUserMarker = () => {
  if (!map || !mapStore.userLocation) return;

  if (userMarker) {
    userMarker.setLatLng([mapStore.userLocation.lat, mapStore.userLocation.lng]);
  } else {
    const icon = mapService.createUserLocationMarker();
    userMarker = L.marker(
        [mapStore.userLocation.lat, mapStore.userLocation.lng],
        {icon, zIndexOffset: 1000}
    ).addTo(map);
  }
};

// Mettre à jour le marqueur de placement
const updatePlacingMarker = (lat: number, lng: number) => {
  if (!map) return;

  if (placingMarker) {
    placingMarker.setLatLng([lat, lng]);
  } else {
    const icon = L.divIcon({
      className: 'placing-marker',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background: none;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          animation: bounce 0.5s ease;
        ">
          <span style="font-size: 18px;">
            <svg width="18" height="18" viewBox="0 0 512 512" fill="#6B4FFF"><path d="M256 0C167.6 0 96 71.6 96 160c0 128 160 352 160 352s160-224 160-352C416 71.6 344.4 0 256 0zm0 240c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"/></svg>
          </span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
    placingMarker = L.marker([lat, lng], {icon}).addTo(map);
  }
};

// Centrer sur la position utilisateur
const centerOnUserLocation = async () => {
  const location = await mapStore.getCurrentLocation();
  if (location && map) {
    updateUserMarker();
    map.setView([location.lat, location.lng], 16, {animate: true});
  } else if (mapStore.locationError) {
    const toast = await toastController.create({
      message: mapStore.locationError,
      duration: 3000,
      color: 'danger'
    });
    toast.present();
  }
};

// Commencer la création d'un signalement
const startCreateSignalement = () => {
  mapStore.startPlacingMarker();
};

// Annuler le placement
const cancelPlacing = () => {
  mapStore.cancelPlacingMarker();
  if (placingMarker) {
    placingMarker.remove();
    placingMarker = null;
  }
};

// Confirmer le placement et ouvrir le formulaire
const confirmPlacing = () => {
  if (mapStore.placingLocation) {
    showCreateModal.value = true;
  }
};

// Créer le signalement
const handleCreateSignalement = async (data: CreateSignalementData & { photoDataUrls?: string[] }) => {
  const {photoDataUrls, ...signalementData} = data;

  const signalement = await signalementsStore.createSignalement(signalementData);

  if (signalement) {
    // Sauvegarder les photos localement si présentes
    if (photoDataUrls && photoDataUrls.length > 0) {
      await signalementsStore.uploadMultiplePhotos(photoDataUrls, signalement.id);
    }

    showCreateModal.value = false;
    cancelPlacing();

    const toast = await toastController.create({
      message: SUCCESS_MESSAGES.SIGNALEMENT_CREATED,
      duration: 3000,
      color: 'success'
    });
    toast.present();

    // Centrer sur le nouveau signalement
    if (map) {
      map.setView([signalement.latitude, signalement.longitude], 16, {animate: true});
    }
  } else {
    const toast = await toastController.create({
      message: signalementsStore.error || ERROR_MESSAGES.CREATE_SIGNALEMENT_ERROR,
      duration: 3000,
      color: 'danger'
    });
    toast.present();
  }
};

// Fermer le bottom sheet
const closeBottomSheet = () => {
  showBottomSheet.value = false;
  selectedSignalement.value = null;
};

// Toggle mes signalements
const toggleMySignalements = () => {
  signalementsStore.toggleShowOnlyMine();
};

// Recherche de lieu
let searchTimeout: ReturnType<typeof setTimeout>;
const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (searchQuery.value.length < 3) {
      searchResults.value = [];
      return;
    }

    try {
      const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}, Antananarivo, Madagascar&limit=5`
      );
      searchResults.value = await response.json();
    } catch (error) {
      console.error('Erreur de recherche:', error);
    }
  }, 500);
};

const clearSearch = () => {
  searchResults.value = [];
};

const selectSearchResult = (result: any) => {
  if (map) {
    map.setView([parseFloat(result.lat), parseFloat(result.lon)], 16, {animate: true});
  }
  searchQuery.value = '';
  searchResults.value = [];
};

// Changer le style de carte
const setMapStyle = (style: string) => {
  if (!map) return;

  // Supprimer les couches de tuiles actuelles
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer || (layer as any)._maplibreMap) {
      map?.removeLayer(layer);
    }
  });

  if (style === 'satellite') {
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: MAP_CONFIG.TILE_ATTRIBUTION
    }).addTo(map);
  } else {
    try {
      (L as any).maplibreGL({
        style: MAP_CONFIG.VECTOR_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'
      }).addTo(map);
    } catch {
      L.tileLayer(MAP_CONFIG.TILE_URL, {
        attribution: MAP_CONFIG.TILE_ATTRIBUTION,
        subdomains: ['a', 'b', 'c']
      }).addTo(map);
    }
  }
};
</script>

<style scoped>
.map-content {
  --background: transparent;
}

#map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.fab-options {
  margin-top: 60px;
  margin-right: 16px;
}

.fab-location {
  margin-bottom: 200px;
  margin-right: 16px;
}

.fab-create {
  margin-bottom: 130px;
  margin-right: 16px;
}

.fab-create ion-fab-button {
  --background: #6B4FFF;
  --background-hover: #5A3FD9;
  width: 56px;
  height: 56px;
  --box-shadow: 0 6px 20px rgba(107, 79, 255, 0.4);
}

ion-fab-button[size="small"] {
  --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.placing-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 60px 16px 16px;
  background: linear-gradient(180deg, rgba(107, 79, 255, 0.95) 0%, rgba(107, 79, 255, 0) 100%);
  z-index: 1000;
}

.placing-instructions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  margin-bottom: 12px;
}

.placing-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.placing-actions ion-button {
  --border-radius: 20px;
}

.search-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: white;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  backdrop-filter: blur(10px);
}

ion-searchbar {
  --color: #111827;
  --placeholder-color: #9CA3AF;
  --placeholder-opacity: 1;
  --background: #F3F4F6;
  --border-radius: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
  padding: 0;
}

ion-chip {
  margin-top: 8px;
}

.search-results {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
}

.search-result-item:active {
  background: #F3F4F6;
}

.search-result-item ion-icon {
  color: #6B4FFF;
  font-size: 20px;
  flex-shrink: 0;
}

.search-result-item span {
  font-size: 14px;
  color: #000000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ================================= */
/* FIX LEAFLET - VERY IMPORTANT */
/* ================================= */

/* Remove default Leaflet icon background */
:deep(.leaflet-default-icon-path) {
  background-image: none !important;
}

/* Custom marker styles */
:deep(.signalement-marker-icon) {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.signalement-marker-icon > div) {
  cursor: pointer;
  pointer-events: auto;
}

:deep(.user-location-marker-icon) {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.placing-marker) {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* Fix z-index for proper layering */
:deep(.leaflet-pane) {
  z-index: 400;
}

:deep(.leaflet-tile-pane) {
  z-index: 200;
}

:deep(.leaflet-overlay-pane) {
  z-index: 400;
}

:deep(.leaflet-shadow-pane) {
  z-index: 500;
}

:deep(.leaflet-marker-pane) {
  z-index: 600;
}

:deep(.leaflet-tooltip-pane) {
  z-index: 650;
}

:deep(.leaflet-popup-pane) {
  z-index: 700;
}

/* Ensure markers are clickable and visible */
:deep(.leaflet-marker-icon) {
  background: transparent !important;
  border: none !important;
  pointer-events: auto !important;
}

/* Map container full size */
:deep(.leaflet-container) {
  width: 100% !important;
  height: 100% !important;
  background: #e8e8e8;
  font-family: inherit;
}

/* Fix for map tiles loading */
:deep(.leaflet-tile) {
  filter: none;
}

:deep(.leaflet-tile-container) {
  pointer-events: none;
}

/* Ensure attribution is visible but not blocking */
:deep(.leaflet-control-attribution) {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 5px;
}
</style>
