import { defineStore } from 'pinia';
import type { SignalementsState, Signalement, CreateSignalementData, SignalementStats } from '@/models';
import { firebaseService } from '@/services/firebaseService';
import { useAuthStore } from './auth';

export const useSignalementsStore = defineStore('signalements', {
  state: (): SignalementsState => ({
    signalements: [],
    mySignalements: [],
    selectedSignalement: null,
    stats: null,
    loading: false,
    error: null,
    showOnlyMine: false
  }),

  getters: {
    // Signalements filtrés (tous ou uniquement les miens)
    filteredSignalements: (state) => {
      if (state.showOnlyMine) {
        return state.mySignalements;
      }
      return state.signalements;
    },

    // Compter les signalements par statut
    countByStatus: (state) => (statut: string) => {
      return state.signalements.filter(s => s.statut === statut).length;
    },

    // Nombre total de signalements
    totalCount: (state) => state.signalements.length,

    // Nombre de mes signalements
    myCount: (state) => state.mySignalements.length,

    // Statistiques calculées
    computedStats: (state): SignalementStats | null => {
      if (state.signalements.length === 0) return null;
      return firebaseService.calculateStats(state.signalements);
    },

    // Signalements récents (5 derniers)
    recentSignalements: (state) => {
      return [...state.signalements]
        .sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
        .slice(0, 5);
    }
  },

  actions: {
    // S'abonner aux mises à jour en temps réel
    subscribeToUpdates(): () => void {
      this.loading = true;

      const unsubscribe = firebaseService.subscribeToSignalements((signalements) => {
        this.signalements = signalements;
        this.stats = firebaseService.calculateStats(signalements);

        // Filtrer mes signalements
        const authStore = useAuthStore();
        if (authStore.user?.id) {
          this.mySignalements = firebaseService.filterByUser(signalements, authStore.user.id);
        }

        this.loading = false;
      });

      return unsubscribe;
    },

    // Créer un nouveau signalement
    async createSignalement(data: CreateSignalementData): Promise<Signalement | null> {
      const authStore = useAuthStore();

      if (!authStore.user?.id) {
        this.error = 'Vous devez être connecté pour créer un signalement';
        return null;
      }

      this.loading = true;
      this.error = null;

      try {
        const signalement = await firebaseService.createSignalement(
          data,
          authStore.user.id,
          authStore.user.email
        );

        return signalement;
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de la création du signalement';
        return null;
      } finally {
        this.loading = false;
      }
    },

    // Uploader une photo et obtenir l'URL
    async uploadPhoto(file: Blob, signalementId: string): Promise<string | null> {
      try {
        const url = await firebaseService.uploadPhoto(file, signalementId);
        return url;
      } catch (error: any) {
        this.error = error.message || 'Erreur lors de l\'upload de la photo';
        return null;
      }
    },

    // Sélectionner un signalement
    selectSignalement(signalement: Signalement | null): void {
      this.selectedSignalement = signalement;
    },

    // Toggle filtre "Mes signalements"
    toggleShowOnlyMine(): void {
      this.showOnlyMine = !this.showOnlyMine;
    },

    // Définir le filtre
    setShowOnlyMine(value: boolean): void {
      this.showOnlyMine = value;
    },

    // Effacer l'erreur
    clearError(): void {
      this.error = null;
    },

    // Rafraîchir les statistiques
    refreshStats(): void {
      this.stats = firebaseService.calculateStats(this.signalements);
    }
  }
});
