// Types de problèmes routiers
export type SignalementType =
  | 'nid_de_poule'
  | 'fissure'
  | 'affaissement'
  | 'inondation'
  | 'autre';

// Statuts possibles
export type SignalementStatut = 'nouveau' | 'en_cours' | 'termine';

// Interface principale Signalement
export interface Signalement {
  id: string;
  titre: string;
  description: string;
  latitude: number;
  longitude: number;
  type: SignalementType;
  statut: SignalementStatut;
  surface_m2?: number;
  budget?: number;
  entreprise?: string;
  date_creation: string;
  date_modification?: string;
  user_id: string;
  user_email?: string;
  photo_url?: string;
  photos?: string[]; // Support pour plusieurs photos
}

// Interface pour la création d'un signalement
export interface CreateSignalementData {
  titre: string;
  description: string;
  latitude: number;
  longitude: number;
  type: SignalementType;
  photo_url?: string;
}

// Interface pour les statistiques
export interface SignalementStats {
  total: number;
  nouveau: number;
  en_cours: number;
  termine: number;
  surface_totale: number;
  budget_total: number;
  avancement_pourcentage: number;
}

// Interface pour l'état des signalements dans le store
export interface SignalementsState {
  signalements: Signalement[];
  mySignalements: Signalement[];
  selectedSignalement: Signalement | null;
  stats: SignalementStats | null;
  loading: boolean;
  error: string | null;
  showOnlyMine: boolean;
}

// Configuration des types de signalement
export const SIGNALEMENT_TYPES: { value: SignalementType; label: string; icon: string }[] = [
  { value: 'nid_de_poule', label: 'Nid de poule', icon: '🕳️' },
  { value: 'fissure', label: 'Fissure', icon: '🔀' },
  { value: 'affaissement', label: 'Affaissement', icon: '⬇️' },
  { value: 'inondation', label: 'Inondation', icon: '💧' },
  { value: 'autre', label: 'Autre', icon: '❓' }
];

// Configuration des statuts
export const SIGNALEMENT_STATUS: { value: SignalementStatut; label: string; color: string; icon: string }[] = [
  { value: 'nouveau', label: 'Nouveau', color: '#e74c3c', icon: '⚠️' },
  { value: 'en_cours', label: 'En cours', color: '#f39c12', icon: '🔧' },
  { value: 'termine', label: 'Terminé', color: '#27ae60', icon: '✅' }
];

// Helper pour obtenir la couleur d'un statut
export const getStatusColor = (statut: SignalementStatut): string => {
  const status = SIGNALEMENT_STATUS.find(s => s.value === statut);
  return status?.color || '#6b7280';
};

// Helper pour obtenir l'icône d'un statut
export const getStatusIcon = (statut: SignalementStatut): string => {
  const status = SIGNALEMENT_STATUS.find(s => s.value === statut);
  return status?.icon || '❓';
};

// Helper pour obtenir le label d'un type
export const getTypeLabel = (type: SignalementType): string => {
  const typeConfig = SIGNALEMENT_TYPES.find(t => t.value === type);
  return typeConfig?.label || type;
};
