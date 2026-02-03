import { ref, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase';
import type { Signalement, SignalementStatut } from '@/models';
import { toastController } from '@ionic/vue';

// Interface pour stocker l'état précédent des signalements
interface SignalementStatusCache {
  [id: string]: SignalementStatut;
}

// Service de notification pour les changements de statut
export const notificationService = {
  // Cache pour stocker les statuts précédents
  statusCache: {} as SignalementStatusCache,

  // Référence pour le listener
  unsubscribe: null as (() => void) | null,

  // Initialiser le suivi des notifications pour un utilisateur
  initNotifications(userId: string): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const signalementsRef = ref(database, 'signalements');

    const callback = onValue(signalementsRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // Parcourir les signalements
      Object.keys(data).forEach(async (key) => {
        const signalement = data[key] as Signalement & { id: string };
        signalement.id = key;

        // Vérifier si c'est un signalement de l'utilisateur
        if (signalement.user_id === userId) {
          const previousStatus = this.statusCache[key];
          const currentStatus = signalement.statut;

          // Si le statut a changé et qu'on avait un statut précédent (pas la première fois)
          if (previousStatus && previousStatus !== currentStatus) {
            await this.showStatusChangeNotification(signalement, previousStatus, currentStatus);
          }

          // Mettre à jour le cache
          this.statusCache[key] = currentStatus;
        }
      });
    });

    this.unsubscribe = () => off(signalementsRef, 'value', callback);
  },

  // Afficher une notification de changement de statut
  async showStatusChangeNotification(
    signalement: Signalement,
    previousStatus: SignalementStatut,
    newStatus: SignalementStatut
  ): Promise<void> {
    const statusLabels: Record<SignalementStatut, string> = {
      'nouveau': 'Nouveau',
      'en_cours': 'En cours',
      'termine': 'Terminé'
    };

    const statusColors: Record<SignalementStatut, string> = {
      'nouveau': 'danger',
      'en_cours': 'warning',
      'termine': 'success'
    };

    const message = `"${signalement.titre}" est passé de "${statusLabels[previousStatus]}" à "${statusLabels[newStatus]}"`;

    const toast = await toastController.create({
      message,
      duration: 5000,
      position: 'top',
      color: statusColors[newStatus],
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ],
      cssClass: 'status-notification-toast'
    });

    await toast.present();

    // Également envoyer une notification système si supporté
    this.sendSystemNotification(signalement.titre, message);
  },

  // Envoyer une notification système (Web Notification API)
  async sendSystemNotification(title: string, body: string): Promise<void> {
    // Vérifier si les notifications sont supportées
    if (!('Notification' in window)) {
      return;
    }

    // Demander la permission si nécessaire
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Envoyer la notification si permission accordée
    if (Notification.permission === 'granted') {
      new Notification('CloudMap - Changement de statut', {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: `status-change-${Date.now()}`
      });
    }
  },

  // Demander la permission de notification
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Les notifications ne sont pas supportées');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  // Charger le cache initial des statuts
  loadInitialCache(signalements: Signalement[], userId: string): void {
    signalements
      .filter(s => s.user_id === userId)
      .forEach(s => {
        this.statusCache[s.id] = s.statut;
      });
  },

  // Nettoyer le service
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.statusCache = {};
  }
};

export default notificationService;
