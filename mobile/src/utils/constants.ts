// Constantes de l'application

// API d'authentification
export const API_AUTH_URL = import.meta.env.VITE_API_AUTH_URL || 'http://localhost:3000';

// Configuration de la carte
export const MAP_CONFIG = {
  // Coordonnées d'Antananarivo
  DEFAULT_CENTER: {
    lat: -18.8792,
    lng: 47.5079
  },
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

// Configuration des sessions
export const SESSION_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 3,
  TOKEN_KEY: 'auth_token',
  USER_KEY: 'auth_user'
};

// Couleurs du thème (inspiré Magic Earth)
export const THEME_COLORS = {
  primary: '#6B4FFF',
  primaryDark: '#5A3FD9',
  secondary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB'
};

// Configuration des marqueurs
export const MARKER_CONFIG = {
  size: 40,
  iconAnchor: [20, 40] as [number, number],
  popupAnchor: [0, -40] as [number, number]
};

// Messages d'erreur
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Pas de connexion Internet. Veuillez vérifier votre connexion.',
  LOGIN_FAILED: 'Email ou mot de passe incorrect.',
  ACCOUNT_BLOCKED: 'Votre compte est bloqué. Contactez un administrateur.',
  SESSION_EXPIRED: 'Votre session a expiré. Veuillez vous reconnecter.',
  SYNC_FAILED: 'Impossible de synchroniser les données. Veuillez réessayer.',
  LOCATION_ERROR: 'Impossible d\'obtenir votre position.',
  PHOTO_ERROR: 'Impossible de prendre la photo.',
  CREATE_SIGNALEMENT_ERROR: 'Impossible de créer le signalement.',
  GENERIC_ERROR: 'Une erreur est survenue. Veuillez réessayer.'
};

// Messages de succès
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie.',
  LOGOUT_SUCCESS: 'Déconnexion réussie.',
  PROFILE_UPDATED: 'Profil mis à jour avec succès.',
  SIGNALEMENT_CREATED: 'Signalement créé avec succès.',
  SYNC_SUCCESS: 'Synchronisation réussie.'
};
