<template>
  <ion-page>
    <ion-content class="login-content" :fullscreen="true">
      <div class="login-container">
        <!-- Logo et titre -->
        <div class="login-header">
          <div class="app-logo">
            <img src="/favicon.png" alt="Logo"/>
          </div>
          <h1 class="app-title">CloudMap</h1>
          <p class="app-subtitle">Gestion des travaux routiers</p>
        </div>

        <!-- Formulaire -->
        <div class="login-form">
          <div class="form-group">
            <label class="input-label">Email</label>
            <div class="input-wrapper">
              <ion-icon :icon="mailOutline" class="input-icon"></ion-icon>
              <ion-input
                  v-model="email"
                  type="email"
                  placeholder="votre@email.com"
                  :disabled="loading"
                  @ionInput="clearError"
                  class="custom-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="input-label">Mot de passe</label>
            <div class="input-wrapper">
              <ion-icon :icon="lockClosedOutline" class="input-icon"></ion-icon>
              <ion-input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Votre mot de passe"
                  :disabled="loading"
                  @ionInput="clearError"
                  @keyup.enter="handleLogin"
                  class="custom-input"
              />
              <ion-button
                  fill="clear"
                  size="small"
                  @click="showPassword = !showPassword"
                  class="password-toggle"
              >
                <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline"></ion-icon>
              </ion-button>
            </div>
          </div>

          <!-- Message d'erreur -->
          <div v-if="authStore.error" class="error-message">
            <ion-icon :icon="alertCircleOutline" style="color: #EF4444; font-size: 20px; flex-shrink: 0;"></ion-icon>
            <span>{{ authStore.error }}</span>
          </div>

          <!-- Info tentatives restantes -->
          <div v-if="authStore.loginAttempts > 0 && !authStore.isBlocked" class="warning-message">
            <ion-icon :icon="warningOutline" style="color: #F59E0B; font-size: 20px; flex-shrink: 0;"></ion-icon>
            <span>Attention: {{ authStore.remainingAttempts }} tentative(s) restante(s) avant blocage.</span>
          </div>

          <!-- Bouton de connexion -->
          <ion-button
              expand="block"
              class="login-button"
              :disabled="!isFormValid || loading || authStore.isBlocked"
              @click="handleLogin"
          >
            <ion-spinner v-if="loading" name="crescent"></ion-spinner>
            <span v-else>Se connecter</span>
          </ion-button>

          <!-- Message pour les utilisateurs -->
          <div class="login-info">
            <ion-icon :icon="informationCircleOutline" style="color: #6B4FFF; font-size: 20px; flex-shrink: 0;"></ion-icon>
            <p>Les comptes sont créés par un administrateur. Contactez votre manager si vous n'avez pas d'identifiants.</p>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';
import {useRouter} from 'vue-router';
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonSpinner,
  IonIcon
} from '@ionic/vue';
import { useAuthStore } from '@/stores';
import { isValidEmail, isValidPassword } from '@/utils/validators';
import {
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  alertCircleOutline,
  warningOutline,
  informationCircleOutline
} from 'ionicons/icons';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = computed(() => authStore.loading);

const isFormValid = computed(() => {
  return isValidEmail(email.value) && isValidPassword(password.value);
});

const clearError = () => {
  authStore.clearError();
};

const handleLogin = async () => {
  if (!isFormValid.value || authStore.isBlocked) return;

  const success = await authStore.login({
    email: email.value,
    password: password.value
  });

  if (success) {
    router.replace('/tabs/map');
  }
};
</script>

<style scoped>
.login-content {
  --background: linear-gradient(180deg, #6B4FFF 0%, #4F46E5 100%);
}

.login-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.app-logo {
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.app-logo img {
  width: 50px;
  height: 50px;
}

.app-title {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px 0;
}

.app-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.login-form {
  background: white;
  border-radius: 24px;
  padding: 32px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 0 12px;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: #6B4FFF;
}

.input-icon {
  color: #6B4FFF;
  font-size: 20px;
  margin-right: 12px;
}

.custom-input {
  flex: 1;
  --background: transparent;
  --color: #111827;
  --placeholder-color: #9CA3AF;
  --placeholder-opacity: 1;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 14px;
  --padding-bottom: 14px;
  font-size: 16px;
  color: #111827;
}

.custom-input::part(native) {
  color: #111827;
}

.password-toggle {
  --color: #6B4FFF;
  --padding-start: 8px;
  --padding-end: 0;
  margin: 0;
}

.password-toggle ion-icon {
  color: #6B4FFF;
  font-size: 20px;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 12px;
  margin-bottom: 16px;
}

.error-message ion-icon {
  flex-shrink: 0;
}

.error-message span {
  font-size: 13px;
  color: #B91C1C;
  line-height: 1.4;
}

.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 12px;
  margin-bottom: 16px;
}

.warning-message ion-icon {
  flex-shrink: 0;
}

.warning-message span {
  font-size: 13px;
  color: #92400E;
  line-height: 1.4;
}

.login-button {
  --background: #6B4FFF;
  --background-hover: #5A3FD9;
  --background-activated: #4F46E5;
  --border-radius: 12px;
  --padding-top: 16px;
  --padding-bottom: 16px;
  font-weight: 600;
  margin-top: 8px;
}

.login-button:disabled {
  --background: #C4B5FD;
}

.login-button ion-spinner {
  width: 20px;
  height: 20px;
}

.login-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 24px;
  padding: 12px;
  background: #F3F4F6;
  border-radius: 12px;
}

.login-info ion-icon {
  flex-shrink: 0;
}

.login-info p {
  font-size: 12px;
  color: #6B7280;
  margin: 0;
  line-height: 1.4;
}
</style>
