import {
  database,
  signalementRef,
  ref,
  push,
  set,
  onValue,
  update,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL
} from '@/config/firebase';
import type { Signalement, CreateSignalementData, SignalementStats } from '@/models';

// Service Firebase pour les signalements
export const firebaseService = {
  // Écouter tous les signalements en temps réel
  subscribeToSignalements(callback: (signalements: Signalement[]) => void): () => void {
    const unsubscribe = onValue(signalementRef, (snapshot) => {
      const data = snapshot.val();
      const signalements: Signalement[] = [];

      if (data) {
        Object.keys(data).forEach((key) => {
          signalements.push({
            id: key,
            ...data[key]
          });
        });
      }

      // Trier par date de création (plus récent en premier)
      signalements.sort((a, b) => {
        return new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime();
      });

      callback(signalements);
    }, (error) => {
      console.error('Erreur lors de l\'écoute des signalements:', error);
      callback([]);
    });

    // Retourner une fonction pour se désabonner
    return () => unsubscribe();
  },

  // Créer un nouveau signalement
  async createSignalement(data: CreateSignalementData, userId: string, userEmail?: string): Promise<Signalement> {
    try {
      const newSignalementRef = push(signalementRef);
      const signalement: Omit<Signalement, 'id'> = {
        ...data,
        statut: 'nouveau',
        date_creation: new Date().toISOString(),
        user_id: userId,
        user_email: userEmail
      };

      await set(newSignalementRef, signalement);

      return {
        id: newSignalementRef.key!,
        ...signalement
      };
    } catch (error) {
      console.error('Erreur lors de la création du signalement:', error);
      throw error;
    }
  },

  // Mettre à jour un signalement
  async updateSignalement(id: string, data: Partial<Signalement>): Promise<void> {
    try {
      const signalementRefToUpdate = ref(database, `signalements/${id}`);
      await update(signalementRefToUpdate, {
        ...data,
        date_modification: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du signalement:', error);
      throw error;
    }
  },

  // Upload d'une photo
  async uploadPhoto(file: Blob, signalementId: string): Promise<string> {
    try {
      const photoRef = storageRef(storage, `signalements/${signalementId}/${Date.now()}.jpg`);
      await uploadBytes(photoRef, file);
      const downloadURL = await getDownloadURL(photoRef);
      return downloadURL;
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo:', error);
      throw error;
    }
  },

  // Upload de plusieurs photos
  async uploadMultiplePhotos(files: Blob[], signalementId: string): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file, index) => {
        const photoRef = storageRef(storage, `signalements/${signalementId}/${Date.now()}_${index}.jpg`);
        await uploadBytes(photoRef, file);
        return await getDownloadURL(photoRef);
      });

      const urls = await Promise.all(uploadPromises);

      // Mettre à jour le signalement avec les URLs des photos
      const signalementRefToUpdate = ref(database, `signalements/${signalementId}`);
      await update(signalementRefToUpdate, {
        photos: urls,
        photo_url: urls[0], // La première photo comme photo principale
        date_modification: new Date().toISOString()
      });

      return urls;
    } catch (error) {
      console.error('Erreur lors de l\'upload des photos:', error);
      throw error;
    }
  },

  // Calculer les statistiques
  calculateStats(signalements: Signalement[]): SignalementStats {
    const stats: SignalementStats = {
      total: signalements.length,
      nouveau: 0,
      en_cours: 0,
      termine: 0,
      surface_totale: 0,
      budget_total: 0,
      avancement_pourcentage: 0
    };

    signalements.forEach((s) => {
      // Compter par statut
      if (s.statut === 'nouveau') stats.nouveau++;
      else if (s.statut === 'en_cours') stats.en_cours++;
      else if (s.statut === 'termine') stats.termine++;

      // Additionner surfaces et budgets
      if (s.surface_m2) stats.surface_totale += s.surface_m2;
      if (s.budget) stats.budget_total += s.budget;
    });

    // Calculer l'avancement
    if (stats.total > 0) {
      stats.avancement_pourcentage = (stats.termine / stats.total) * 100;
    }

    return stats;
  },

  // Filtrer les signalements par utilisateur
  filterByUser(signalements: Signalement[], userId: string): Signalement[] {
    return signalements.filter(s => s.user_id === userId);
  }
};

export default firebaseService;
