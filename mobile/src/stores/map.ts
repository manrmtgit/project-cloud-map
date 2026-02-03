import { defineStore } from 'pinia';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { MAP_CONFIG } from '@/utils/constants';

interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  userLocation: { lat: number; lng: number } | null;
  isLocating: boolean;
  locationError: string | null;
  isPlacingMarker: boolean;
  placingLocation: { lat: number; lng: number } | null;
}

export const useMapStore = defineStore('map', {
  state: (): MapState => ({
    center: MAP_CONFIG.DEFAULT_CENTER,
    zoom: MAP_CONFIG.DEFAULT_ZOOM,
    userLocation: null,
    isLocating: false,
    locationError: null,
    isPlacingMarker: false,
    placingLocation: null
  }),

  getters: {
    hasUserLocation: (state) => state.userLocation !== null,
    currentCenter: (state) => state.center
  },

  actions: {
    // Obtenir la position actuelle de l'utilisateur
    async getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
      this.isLocating = true;
      this.locationError = null;

      try {
        // Vérifier les permissions
        const permission = await Geolocation.checkPermissions();

        if (permission.location !== 'granted') {
          const requested = await Geolocation.requestPermissions();
          if (requested.location !== 'granted') {
            throw new Error('Permission de localisation refusée');
          }
        }

        // Obtenir la position
        const position: Position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        this.userLocation = location;
        return location;
      } catch (error: any) {
        this.locationError = error.message || 'Impossible d\'obtenir la position';
        console.error('Erreur de géolocalisation:', error);
        return null;
      } finally {
        this.isLocating = false;
      }
    },

    // Mettre à jour le centre de la carte
    setCenter(lat: number, lng: number): void {
      this.center = { lat, lng };
    },

    // Mettre à jour le zoom
    setZoom(zoom: number): void {
      this.zoom = Math.max(MAP_CONFIG.MIN_ZOOM, Math.min(MAP_CONFIG.MAX_ZOOM, zoom));
    },

    // Centrer sur la position utilisateur
    centerOnUser(): void {
      if (this.userLocation) {
        this.center = { ...this.userLocation };
      }
    },

    // Activer le mode placement de marqueur
    startPlacingMarker(): void {
      this.isPlacingMarker = true;
      this.placingLocation = null;
    },

    // Définir la position du marqueur en cours de placement
    setPlacingLocation(lat: number, lng: number): void {
      this.placingLocation = { lat, lng };
    },

    // Annuler le placement de marqueur
    cancelPlacingMarker(): void {
      this.isPlacingMarker = false;
      this.placingLocation = null;
    },

    // Confirmer le placement de marqueur
    confirmPlacingMarker(): { lat: number; lng: number } | null {
      const location = this.placingLocation;
      this.isPlacingMarker = false;
      this.placingLocation = null;
      return location;
    },

    // Réinitialiser la carte à la position par défaut
    resetToDefault(): void {
      this.center = MAP_CONFIG.DEFAULT_CENTER;
      this.zoom = MAP_CONFIG.DEFAULT_ZOOM;
    },

    // Effacer l'erreur de localisation
    clearLocationError(): void {
      this.locationError = null;
    }
  }
});
