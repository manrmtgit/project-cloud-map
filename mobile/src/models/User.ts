// Interface utilisateur
export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'mobile_user' | 'manager' | 'admin';
  signalements_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

// Interface pour les données de connexion
export interface LoginCredentials {
  email: string;
  password: string;
}

// Interface pour la mise à jour du profil
export interface ProfileUpdateData {
  nom?: string;
  prenom?: string;
  email?: string;
  password?: string;
}

// Interface pour la réponse d'authentification
export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  expiresIn?: number;
}

// Interface pour l'état d'authentification
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loginAttempts: number;
  isBlocked: boolean;
  loading: boolean;
  error: string | null;
}
