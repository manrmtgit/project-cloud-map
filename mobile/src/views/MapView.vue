<template>
  <ion-page>
    <ion-content :fullscreen="true" class="map-content">
      <!-- Carte Leaflet -->
      <div id="map" ref="mapContainer"></div>

      <!-- Bouton Couches/Options (haut droit) -->
      <ion-fab vertical="top" horizontal="end" slot="fixed" class="fab-options">
        <ion-fab-button size="small" color="light" @click="showLayerOptions = true">
          <ion-icon :icon="layersOutline"></ion-icon>
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
          <ion-icon v-else :icon="locateOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Bouton créer signalement (centre bas) -->
      <ion-fab
          vertical="bottom"
          horizontal="center"
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
          <ion-icon :icon="locationOutline"></ion-icon>
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
          <ion-icon :icon="personOutline"></ion-icon>
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
            <ion-icon :icon="locationOutline"></ion-icon>
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
import {ref, onMounted, onUnmounted, watch} from 'vue';
import {
  IonPage,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSearchbar,
  IonChip,
  IonLabel,
  IonButton,
  IonSpinner,
  IonActionSheet,
  toastController
} from '@ionic/vue';
import {
  addOutline,
  locateOutline,
  layersOutline,
  locationOutline,
  personOutline
} from 'ionicons/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {useMapStore, useSignalementsStore} from '@/stores';
import {mapService} from '@/services';
import {MAP_CONFIG, SUCCESS_MESSAGES, ERROR_MESSAGES} from '@/utils/constants';
import type {Signalement, CreateSignalementData} from '@/models';
import SignalementBottomSheet from '@/components/SignalementBottomSheet.vue';
import CreateSignalementModal from '@/components/CreateSignalementModal.vue';

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

  L.tileLayer(MAP_CONFIG.TILE_URL, {
    attribution: MAP_CONFIG.TILE_ATTRIBUTION
  }).addTo(map);

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

  // Obtenir la position de l'utilisateur
  await mapStore.getCurrentLocation();
  if (mapStore.userLocation) {
    updateUserMarker();
    map.setView([mapStore.userLocation.lat, mapStore.userLocation.lng], 15);
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

// Mettre à jour les marqueurs sur la carte
const updateMarkers = (signalements: Signalement[]) => {
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
};

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
          <span style="font-size: 18px;">📍</span>
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
const handleCreateSignalement = async (data: CreateSignalementData & { photoBlob?: Blob }) => {
  const {photoBlob, ...signalementData} = data;

  const signalement = await signalementsStore.createSignalement(signalementData);

  if (signalement) {
    // Upload de la photo si présente
    if (photoBlob) {
      const photoUrl = await signalementsStore.uploadPhoto(photoBlob, signalement.id);
      if (photoUrl) {
        // La mise à jour avec la photo sera faite via Firebase
      }
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

  // Supprimer les tuiles actuelles
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) {
      map?.removeLayer(layer);
    }
  });

  let tileUrl = MAP_CONFIG.TILE_URL;
  if (style === 'satellite') {
    tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  }

  L.tileLayer(tileUrl, {
    attribution: MAP_CONFIG.TILE_ATTRIBUTION
  }).addTo(map);
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
  margin-bottom: 180px;
  margin-right: 16px;
}

.fab-create {
  margin-bottom: 120px;
}

.fab-create ion-fab-button {
  --background: #6B4FFF;
  width: 56px;
  height: 56px;
}

ion-fab-button[size="small"] {
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: white;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
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
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Fix Leaflet icons */
:deep(.leaflet-default-icon-path) {
  background-image: none;
}
</style>
