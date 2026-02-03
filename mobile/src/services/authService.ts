import axios from 'axios';
import type { User, LoginCredentials, ProfileUpdateData, AuthResponse } from '@/models';
import { API_AUTH_URL, SESSION_CONFIG } from '@/utils/constants';

// Instance Axios pour l'API d'authentification
const authApi = axios.create({
  baseURL: API_AUTH_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Intercepteur pour ajouter le token aux requêtes
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(SESSION_CONFIG.TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem(SESSION_CONFIG.TOKEN_KEY);
      localStorage.removeItem(SESSION_CONFIG.USER_KEY);
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }
    return Promise.reject(error);
  }
);

// Service d'authentification
export const authService = {
  // Connexion
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await authApi.post('/api/auth/login', credentials);
      const data = response.data;

      // Stocker le token et l'utilisateur
      if (data.token) {
        localStorage.setItem(SESSION_CONFIG.TOKEN_KEY, data.token);
      }
      if (data.user) {
        localStorage.setItem(SESSION_CONFIG.USER_KEY, JSON.stringify(data.user));
      }

      return data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur de connexion';
      throw new Error(errorMessage);
    }
  },

  // Déconnexion
  async logout(): Promise<void> {
    try {
      await authApi.post('/api/auth/logout');
    } catch (error) {
      console.warn('Erreur lors de la déconnexion côté serveur:', error);
    } finally {
      localStorage.removeItem(SESSION_CONFIG.TOKEN_KEY);
      localStorage.removeItem(SESSION_CONFIG.USER_KEY);
    }
  },

  // Vérification de session
  async checkSession(): Promise<{ valid: boolean; user?: User }> {
    try {
      const response = await authApi.get('/api/auth/check-session');
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  },

  // Mise à jour du profil
  async updateProfile(data: ProfileUpdateData): Promise<User> {
    try {
      const response = await authApi.put('/api/auth/profile', data);
      const user = response.data.user;

      // Mettre à jour le stockage local
      localStorage.setItem(SESSION_CONFIG.USER_KEY, JSON.stringify(user));

      return user;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur de mise à jour';
      throw new Error(errorMessage);
    }
  },

  // Récupérer l'utilisateur stocké localement
  getStoredUser(): User | null {
    const userJson = localStorage.getItem(SESSION_CONFIG.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Récupérer le token stocké
  getStoredToken(): string | null {
    return localStorage.getItem(SESSION_CONFIG.TOKEN_KEY);
  },

  // Vérifier si l'utilisateur est connecté
  isLoggedIn(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }
};

export default authService;
