/**
 * Service Firebase Realtime Database pour le frontend web
 * Synchronisation en temps réel des signalements entre Web <-> Firebase <-> Mobile
 */
import { database, ref, onValue, update, off } from '../config/firebase';

// Mapper les statuts PostgreSQL (MAJUSCULE) <-> Firebase/Mobile (minuscule)
const STATUS_TO_FIREBASE = {
  'NOUVEAU': 'nouveau',
  'EN_COURS': 'en_cours',
  'TERMINE': 'termine'
};

const STATUS_FROM_FIREBASE = {
  'nouveau': 'NOUVEAU',
  'en_cours': 'EN_COURS',
  'termine': 'TERMINE'
};

/**
 * Service de synchronisation Firebase pour le web
 */
export const firebaseRealtimeService = {
  // Listener actif
  _unsubscribe: null,
  _callbacks: [],

  /**
   * Écouter les signalements en temps réel depuis Firebase RTDB
   * @param {Function} callback - Fonction appelée avec les signalements mis à jour
   * @returns {Function} Fonction pour se désabonner
   */
  subscribeToSignalements(callback) {
    const signalementsRef = ref(database, 'signalements');

    const listener = onValue(signalementsRef, (snapshot) => {
      const data = snapshot.val();
      const signalements = [];

      if (data) {
        Object.keys(data).forEach((key) => {
          const s = data[key];
          signalements.push({
            id: s.pg_id || key, // Utiliser pg_id si disponible, sinon la clé Firebase
            firebase_key: key,
            titre: s.titre || '',
            description: s.description || '',
            latitude: parseFloat(s.latitude),
            longitude: parseFloat(s.longitude),
            statut: STATUS_FROM_FIREBASE[s.statut] || s.statut?.toUpperCase() || 'NOUVEAU',
            avancement: s.avancement || 0,
            surface_m2: s.surface_m2 ? parseFloat(s.surface_m2) : null,
            budget: s.budget ? parseFloat(s.budget) : null,
            entreprise: s.entreprise || null,
            user_id: s.user_id,
            user_email: s.user_email,
            date_creation: s.date_creation,
            date_mise_a_jour: s.date_modification || s.sync_timestamp,
            date_nouveau: s.date_nouveau || s.date_creation,
            date_en_cours: s.date_en_cours,
            date_termine: s.date_termine,
            photos: s.photos || [],
            photo_url: s.photo_url
          });
        });

        // Trier par date de création (plus récent en premier)
        signalements.sort((a, b) => 
          new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
        );
      }

      callback(signalements);
    }, (error) => {
      console.error('Erreur écoute Firebase RTDB:', error);
      callback([]);
    });

    this._unsubscribe = () => off(signalementsRef, 'value', listener);
    return this._unsubscribe;
  },

  /**
   * Mettre à jour un signalement dans Firebase RTDB (depuis le web)
   * @param {string} firebaseKey - Clé Firebase du signalement  
   * @param {Object} data - Données à mettre à jour
   */
  async updateSignalement(firebaseKey, data) {
    try {
      const signalementRef = ref(database, `signalements/${firebaseKey}`);
      
      const updateData = {};
      
      if (data.statut) {
        updateData.statut = STATUS_TO_FIREBASE[data.statut] || data.statut.toLowerCase();
      }
      if (data.surface_m2 !== undefined) updateData.surface_m2 = data.surface_m2;
      if (data.budget !== undefined) updateData.budget = data.budget;
      if (data.entreprise !== undefined) updateData.entreprise = data.entreprise;
      if (data.titre) updateData.titre = data.titre;
      if (data.description !== undefined) updateData.description = data.description;

      // Calculer l'avancement selon le statut
      const statut = updateData.statut || STATUS_TO_FIREBASE[data.statut];
      if (statut === 'nouveau') updateData.avancement = 0;
      else if (statut === 'en_cours') {
        updateData.avancement = 50;
        if (!data.date_en_cours) updateData.date_en_cours = new Date().toISOString();
      }
      else if (statut === 'termine') {
        updateData.avancement = 100;
        if (!data.date_en_cours) updateData.date_en_cours = new Date().toISOString();
        updateData.date_termine = new Date().toISOString();
      }

      updateData.date_modification = new Date().toISOString();
      updateData.sync_timestamp = new Date().toISOString();

      await update(signalementRef, updateData);
      return true;
    } catch (error) {
      console.error('Erreur mise à jour Firebase RTDB:', error);
      throw error;
    }
  },

  /**
   * Calculer les statistiques à partir des signalements
   * @param {Array} signalements - Liste des signalements
   * @returns {Object} Statistiques calculées
   */
  calculateStats(signalements) {
    const stats = {
      total_signalements: signalements.length,
      total_surface_m2: 0,
      total_budget: 0,
      avancement_global: 0,
      par_statut: {
        nouveau: 0,
        en_cours: 0,
        termine: 0
      }
    };

    signalements.forEach(s => {
      const statut = s.statut?.toUpperCase() || 'NOUVEAU';
      if (statut === 'NOUVEAU') stats.par_statut.nouveau++;
      else if (statut === 'EN_COURS') stats.par_statut.en_cours++;
      else if (statut === 'TERMINE') stats.par_statut.termine++;

      if (s.surface_m2) stats.total_surface_m2 += parseFloat(s.surface_m2);
      if (s.budget) stats.total_budget += parseFloat(s.budget);
    });

    if (stats.total_signalements > 0) {
      stats.avancement_global = (
        (stats.par_statut.nouveau * 0 + stats.par_statut.en_cours * 50 + stats.par_statut.termine * 100)
        / stats.total_signalements
      ).toFixed(1);
    }

    return stats;
  },

  /**
   * Nettoyer tous les listeners
   */
  cleanup() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }
};

export default firebaseRealtimeService;
