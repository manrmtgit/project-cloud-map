import { defineStore } from 'pinia';
import type { AuthState, LoginCredentials, ProfileUpdateData } from '@/models';
import { firebaseAuthService } from '@/services/firebaseAuthService';
import { SESSION_CONFIG, ERROR_MESSAGES } from '@/utils/constants';

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: firebaseAuthService.getStoredUser(),
    token: firebaseAuthService.getStoredToken(),
    isAuthenticated: firebaseAuthService.isLoggedIn(),
    loginAttempts: 0,
    isBlocked: false,
    loading: false,
    error: null
  }),

  getters: {
    currentUser: (state) => state.user,
    isLoggedIn: (state) => state.isAuthenticated && !!state.token,
    remainingAttempts: (state) => SESSION_CONFIG.MAX_LOGIN_ATTEMPTS - state.loginAttempts,
    userFullName: (state) => {
      if (!state.user) return '';
      return `${state.user.prenom || ''} ${state.user.nom || ''}`.trim();
    },
    userInitials: (state) => {
      if (!state.user) return '?';
      const p = state.user.prenom?.charAt(0).toUpperCase() || '';
      const n = state.user.nom?.charAt(0).toUpperCase() || '';
      return `${p}${n}` || '?';
    }
  },

  actions: {
    // Connexion via Firebase
    async login(credentials: LoginCredentials): Promise<boolean> {
      this.loading = true;
      this.error = null;

      try {
        const response = await firebaseAuthService.login(credentials);

        this.user = response.user;
        this.token = response.token;
        this.isAuthenticated = true;
        this.loginAttempts = 0;
        this.isBlocked = false;

        return true;
      } catch (error: any) {
        // Vérifier si le message indique un blocage
        if (error.message.includes('bloqué')) {
          this.isBlocked = true;
          this.error = error.message;
        } else if (error.message.includes('Tentative')) {
          // Extraire le nombre de tentatives du message
          const match = error.message.match(/Tentative (\d+)/);
          if (match) {
            this.loginAttempts = parseInt(match[1], 10);
          }
          this.error = error.message;
        } else {
          this.error = error.message || ERROR_MESSAGES.LOGIN_FAILED;
        }

        return false;
      } finally {
        this.loading = false;
      }
    },

    // Déconnexion
    async logout(): Promise<void> {
      this.loading = true;

      try {
        await firebaseAuthService.logout();
      } finally {
        this.user = null;
        this.token = null;
        this.isAuthenticated = false;
        this.loginAttempts = 0;
        this.isBlocked = false;
        this.error = null;
        this.loading = false;
      }
    },

    // Vérifier la session
    async checkSession(): Promise<boolean> {
      if (!this.token) return false;

      try {
        const result = await firebaseAuthService.checkSession();

        if (result.valid && result.user) {
          this.user = result.user;
          this.isAuthenticated = true;
          return true;
        } else {
          await this.logout();
          return false;
        }
      } catch (error) {
        await this.logout();
        return false;
      }
    },

    // Mise à jour du profil
    async updateProfile(data: ProfileUpdateData): Promise<boolean> {
      this.loading = true;
      this.error = null;

      try {
        this.user = await firebaseAuthService.updateProfile(data);
        return true;
      } catch (error: any) {
        this.error = error.message;
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Réinitialiser les erreurs
    clearError(): void {
      this.error = null;
    },

    // Initialiser le store au démarrage
    initialize(): void {
      this.user = firebaseAuthService.getStoredUser();
      this.token = firebaseAuthService.getStoredToken();
      this.isAuthenticated = firebaseAuthService.isLoggedIn();
    }
  }
});
