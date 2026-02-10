<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Profil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="profile-content">
      <!-- En-tête du profil -->
      <div class="profile-header">
        <UserAvatar
          :initials="authStore.userInitials"
          size="xlarge"
        />
        <h1 class="profile-name">{{ authStore.userFullName || 'Utilisateur' }}</h1>
        <p class="profile-email">{{ authStore.user?.email }}</p>
      </div>

      <!-- Statistiques personnelles -->
      <div class="profile-stats">
        <div class="stat-item">
          <span class="stat-value">{{ myStats.total }}</span>
          <span class="stat-label">Signalements</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ myStats.termine }}</span>
          <span class="stat-label">Terminés</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ myStats.en_cours }}</span>
          <span class="stat-label">En cours</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="profile-actions">
        <ion-button expand="block" @click="goToEditProfile">
          <ion-icon slot="start" :icon="personOutline"></ion-icon>
          Modifier le profil
        </ion-button>

        <ion-button expand="block" fill="outline" @click="goToSettings">
          <ion-icon slot="start" :icon="settingsOutline"></ion-icon>
          Paramètres
        </ion-button>
      </div>

      <!-- Mes signalements récents -->
      <div class="my-signalements-section">
        <h2 class="section-title">Mes derniers signalements</h2>

        <div v-if="recentSignalements.length === 0" class="empty-state">
          <ion-icon :icon="mapOutline" style="font-size: 48px; color: #D1D5DB; margin-bottom: 12px;"></ion-icon>
          <p>Vous n'avez pas encore créé de signalement</p>
          <ion-button fill="clear" @click="goToMap">
            Créer mon premier signalement
          </ion-button>
        </div>

        <div v-else class="signalements-list">
          <SignalementCard
            v-for="signalement in recentSignalements"
            :key="signalement.id"
            :signalement="signalement"
            @click="goToSignalement"
          />
        </div>
      </div>

      <!-- Bouton déconnexion -->
      <div class="logout-section">
        <ion-button
          expand="block"
          color="dark"
          @click="confirmLogout"
          :disabled="loading"
        >
          <ion-spinner v-if="loading" name="crescent"></ion-spinner>
          <template v-else>
            <ion-icon slot="start" :icon="logOutOutline"></ion-icon>
            Déconnexion
          </template>
        </ion-button>
      </div>

      <!-- Modal modification profil -->
      <ion-modal :is-open="showEditModal" @didDismiss="showEditModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="showEditModal = false">Annuler</ion-button>
            </ion-buttons>
            <ion-title>Modifier le profil</ion-title>
            <ion-buttons slot="end">
              <ion-button
                strong
                :disabled="!isFormValid || savingProfile"
                @click="saveProfile"
              >
                <span v-if="savingProfile">...</span>
                <span v-else>Enregistrer</span>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <div class="form-group">
            <ion-label>Prénom</ion-label>
            <ion-input v-model="editForm.prenom" placeholder="Votre prénom"></ion-input>
          </div>

          <div class="form-group">
            <ion-label>Nom</ion-label>
            <ion-input v-model="editForm.nom" placeholder="Votre nom"></ion-input>
          </div>

          <div class="form-group">
            <ion-label>Email</ion-label>
            <ion-input v-model="editForm.email" type="email" placeholder="votre@email.com"></ion-input>
          </div>

          <div class="form-group">
            <ion-label>Nouveau mot de passe (optionnel)</ion-label>
            <ion-input
              v-model="editForm.password"
              type="password"
              placeholder="Laisser vide pour ne pas changer"
            ></ion-input>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Alert de confirmation déconnexion -->
      <ion-alert
        :is-open="showLogoutAlert"
        header="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        :buttons="logoutAlertButtons"
        @didDismiss="showLogoutAlert = false"
      ></ion-alert>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonSpinner,
  IonModal,
  IonButtons,
  IonLabel,
  IonInput,
  IonAlert,
  IonIcon,
  toastController
} from '@ionic/vue';
import { useAuthStore, useSignalementsStore } from '@/stores';
import type { Signalement } from '@/models';
import { isValidEmail, isValidName } from '@/utils/validators';
import { SUCCESS_MESSAGES } from '@/utils/constants';
import UserAvatar from '@/components/UserAvatar.vue';
import SignalementCard from '@/components/SignalementCard.vue';
import {
  personOutline,
  settingsOutline,
  mapOutline,
  logOutOutline
} from 'ionicons/icons';

const router = useRouter();
const authStore = useAuthStore();
const signalementsStore = useSignalementsStore();

const loading = ref(false);
const showEditModal = ref(false);
const savingProfile = ref(false);
const showLogoutAlert = ref(false);

const editForm = ref({
  prenom: '',
  nom: '',
  email: '',
  password: ''
});

// Mes statistiques
const myStats = computed(() => {
  const mySignalements = signalementsStore.mySignalements;
  return {
    total: mySignalements.length,
    nouveau: mySignalements.filter(s => s.statut === 'nouveau').length,
    en_cours: mySignalements.filter(s => s.statut === 'en_cours').length,
    termine: mySignalements.filter(s => s.statut === 'termine').length
  };
});

// 3 derniers signalements
const recentSignalements = computed(() => {
  return [...signalementsStore.mySignalements]
    .sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
    .slice(0, 3);
});

// Validation du formulaire
const isFormValid = computed(() => {
  return (
    isValidName(editForm.value.prenom) &&
    isValidName(editForm.value.nom) &&
    isValidEmail(editForm.value.email)
  );
});

// Initialiser le formulaire quand le modal s'ouvre
watch(showEditModal, (isOpen) => {
  if (isOpen && authStore.user) {
    editForm.value = {
      prenom: authStore.user.prenom || '',
      nom: authStore.user.nom || '',
      email: authStore.user.email || '',
      password: ''
    };
  }
});

// Boutons de l'alerte de déconnexion
const logoutAlertButtons = [
  {
    text: 'Annuler',
    role: 'cancel'
  },
  {
    text: 'Déconnexion',
    role: 'confirm',
    handler: () => handleLogout()
  }
];

// Ouvrir le modal de modification
const goToEditProfile = () => {
  showEditModal.value = true;
};

// Aller aux paramètres (placeholder)
const goToSettings = () => {
  // TODO: Implémenter la page paramètres
  console.log('Go to settings');
};

// Aller à la carte
const goToMap = () => {
  router.push('/tabs/map');
};

// Aller à un signalement sur la carte
const goToSignalement = (signalement: Signalement) => {
  router.push({
    path: '/tabs/map',
    query: { lat: signalement.latitude, lng: signalement.longitude }
  });
};

// Confirmer la déconnexion
const confirmLogout = () => {
  showLogoutAlert.value = true;
};

// Déconnexion
const handleLogout = async () => {
  loading.value = true;
  await authStore.logout();
  loading.value = false;
  router.replace('/login');
};

// Sauvegarder le profil
const saveProfile = async () => {
  if (!isFormValid.value) return;

  savingProfile.value = true;

  const updateData: any = {
    prenom: editForm.value.prenom.trim(),
    nom: editForm.value.nom.trim(),
    email: editForm.value.email.trim()
  };

  if (editForm.value.password) {
    updateData.password = editForm.value.password;
  }

  const success = await authStore.updateProfile(updateData);

  savingProfile.value = false;

  if (success) {
    showEditModal.value = false;
    const toast = await toastController.create({
      message: SUCCESS_MESSAGES.PROFILE_UPDATED,
      duration: 3000,
      color: 'success'
    });
    toast.present();
  } else {
    const toast = await toastController.create({
      message: authStore.error || 'Erreur lors de la mise à jour',
      duration: 3000,
      color: 'danger'
    });
    toast.present();
  }
};
</script>

<style scoped>
.profile-content {
  --background: #F9FAFB;
}

ion-toolbar {
  --background: white;
}

ion-title {
  font-weight: 700;
}

.profile-header {
  background: linear-gradient(135deg, #6B4FFF 0%, #4F46E5 100%);
  padding: 40px 20px;
  text-align: center;
  color: white;
}

.profile-name {
  font-size: 24px;
  font-weight: 700;
  margin: 16px 0 4px 0;
}

.profile-email {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.profile-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  padding: 20px;
  margin: -20px 16px 16px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #6B4FFF;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #6B7280;
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #E5E7EB;
}

.profile-actions {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.profile-actions ion-button {
  --border-radius: 12px;
}

.profile-actions ion-button:first-child {
  --background: #6B4FFF;
}

.profile-actions ion-button[fill="outline"] {
  --color: #6B4FFF;
  --border-color: #6B4FFF;
}

.my-signalements-section {
  padding: 0 16px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 16px;
}

.empty-state p {
  font-size: 14px;
  color: #6B7280;
  margin: 0 0 16px 0;
}

.empty-state ion-button {
  --color: #6B4FFF;
}

.signalements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logout-section {
  padding: 0 16px 32px;
}

.logout-section ion-button {
  --border-radius: 12px;
}

/* Modal styles */
.form-group {
  margin-bottom: 20px;
}

.form-group ion-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.form-group ion-input {
  --color: #111827;
  --placeholder-color: #9CA3AF;
  --placeholder-opacity: 1;
  --background: #F9FAFB;
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
}
</style>
