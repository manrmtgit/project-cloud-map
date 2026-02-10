import { ref, onValue, off } from 'firebase/database';
import { database } from '@/config/firebase';
import type { Signalement, SignalementStatut } from '@/models';
import { toastController } from '@ionic/vue';
import { Capacitor } from '@capacitor/core';

// Interface pour stocker l'état précédent des signalements
interface SignalementStatusCache {
  [id: string]: SignalementStatut;
}

// Compteur pour les IDs de notification locale
let notificationIdCounter = 1;

// Importer dynamiquement LocalNotifications si disponible (Capacitor natif)
let LocalNotifications: any = null;
async function loadLocalNotifications() {
  if (Capacitor.isNativePlatform()) {
    try {
      const mod = await import('@capacitor/local-notifications');
      LocalNotifications = mod.LocalNotifications;
    } catch {
      console.log('LocalNotifications plugin non disponible, fallback Web API');
    }
  }
}

// Service de notification pour les changements de statut et nouveaux signalements
export const notificationService = {
  // Cache pour stocker les statuts précédents
  statusCache: {} as SignalementStatusCache,

  // Cache pour stocker les IDs connus
  knownIds: new Set<string>(),

  // Flag pour le premier chargement (ne pas notifier au lancement)
  initialLoadDone: false,

  // Référence pour le listener
  unsubscribe: null as (() => void) | null,

  // Permission déjà accordée
  permissionGranted: false,

  // Initialiser le suivi des notifications pour un utilisateur
  initNotifications(userId: string): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.initialLoadDone = false;
    this.knownIds.clear();
    this.statusCache = {};

    const signalementsRef = ref(database, 'signalements');

    const callback = onValue(signalementsRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const allKeys = Object.keys(data);

      // Premier chargement : remplir le cache sans notifier
      if (!this.initialLoadDone) {
        allKeys.forEach((key) => {
          const signalement = data[key] as Signalement & { id: string; user_id?: string; utilisateur_id?: string };
          this.knownIds.add(key);
          if (signalement.user_id === userId || signalement.utilisateur_id === userId) {
            this.statusCache[key] = signalement.statut;
          }
        });
        this.initialLoadDone = true;
        return;
      }

      // Parcourir tous les signalements
      for (const key of allKeys) {
        const signalement = data[key] as Signalement & { id: string; user_id?: string; utilisateur_id?: string };
        signalement.id = key;

        // === Notification de NOUVEAU signalement (pour tous les utilisateurs) ===
        if (!this.knownIds.has(key)) {
          this.knownIds.add(key);
          await this.showNewSignalementNotification(signalement);
        }

        // === Notification de CHANGEMENT DE STATUT (pour ses propres signalements) ===
        if (signalement.user_id === userId || signalement.utilisateur_id === userId) {
          const previousStatus = this.statusCache[key];
          const currentStatus = signalement.statut;

          if (previousStatus && previousStatus !== currentStatus) {
            await this.showStatusChangeNotification(signalement, previousStatus, currentStatus);
          }

          // Mettre à jour le cache
          this.statusCache[key] = currentStatus;
        }
      }
    });

    this.unsubscribe = () => off(signalementsRef, 'value', callback);
  },

  // Afficher une notification pour un nouveau signalement
  async showNewSignalementNotification(signalement: Signalement): Promise<void> {
    const message = `Nouveau signalement : "${signalement.titre}"`;

    const toast = await toastController.create({
      header: 'Nouveau signalement',
      message,
      duration: 4000,
      position: 'top',
      color: 'primary',
      icon: 'add-circle-outline',
      buttons: [{ text: 'OK', role: 'cancel' }],
      cssClass: 'new-signalement-toast'
    });
    await toast.present();

    // Notification système (native ou web)
    await this.sendSystemNotification('Nouveau signalement', message);
  },

  // Afficher une notification de changement de statut
  async showStatusChangeNotification(
    signalement: Signalement,
    previousStatus: SignalementStatut,
    newStatus: SignalementStatut
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      'nouveau': 'Nouveau', 'NOUVEAU': 'Nouveau',
      'en_cours': 'En cours', 'EN_COURS': 'En cours',
      'termine': 'Terminé', 'TERMINE': 'Terminé'
    };

    const statusColors: Record<string, string> = {
      'nouveau': 'danger', 'NOUVEAU': 'danger',
      'en_cours': 'warning', 'EN_COURS': 'warning',
      'termine': 'success', 'TERMINE': 'success'
    };

    const from = statusLabels[previousStatus] || previousStatus;
    const to = statusLabels[newStatus] || newStatus;
    const message = `"${signalement.titre}" : ${from} → ${to}`;

    const toast = await toastController.create({
      header: 'Changement de statut',
      message,
      duration: 5000,
      position: 'top',
      color: statusColors[newStatus] || 'primary',
      buttons: [{ text: 'OK', role: 'cancel' }],
      cssClass: 'status-notification-toast'
    });
    await toast.present();

    // Notification système (native ou web)
    await this.sendSystemNotification('Changement de statut', message);
  },

  // Envoyer une notification système — Capacitor Local Notifications OU Web Notification API
  async sendSystemNotification(title: string, body: string): Promise<void> {
    // 1) Capacitor natif → LocalNotifications
    if (Capacitor.isNativePlatform() && LocalNotifications) {
      try {
        await LocalNotifications.schedule({
          notifications: [{
            title: `CloudMap - ${title}`,
            body,
            id: notificationIdCounter++,
            schedule: { at: new Date(Date.now() + 100) }, // quasi-instantané
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            sound: 'default'
          }]
        });
        return;
      } catch (e) {
        console.warn('LocalNotifications schedule error:', e);
      }
    }

    // 2) Fallback Web Notification API (PWA / navigateur)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`CloudMap - ${title}`, {
          body,
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: `notification-${Date.now()}`
        });
      } catch (e) {
        console.warn('Web Notification error:', e);
      }
    }
  },

  // Demander la permission de notification (Capacitor natif ou Web)
  async requestPermission(): Promise<boolean> {
    // Charger le plugin natif si nécessaire
    await loadLocalNotifications();

    // Capacitor natif
    if (Capacitor.isNativePlatform() && LocalNotifications) {
      try {
        const result = await LocalNotifications.requestPermissions();
        this.permissionGranted = result.display === 'granted';
        return this.permissionGranted;
      } catch (e) {
        console.warn('Permission request error:', e);
        return false;
      }
    }

    // Web API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
        return this.permissionGranted;
      }
    }

    return false;
  },

  // Charger le cache initial des statuts — corrig : check user_id ET utilisateur_id
  loadInitialCache(signalements: Signalement[], userId: string): void {
    signalements.forEach((s: any) => {
      this.knownIds.add(s.id);
      if (s.user_id === userId || s.utilisateur_id === userId) {
        this.statusCache[s.id] = s.statut;
      }
    });
  },

  // Nettoyer le service
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.statusCache = {};
    this.knownIds.clear();
    this.initialLoadDone = false;
    this.permissionGranted = false;
  }
};

export default notificationService;
