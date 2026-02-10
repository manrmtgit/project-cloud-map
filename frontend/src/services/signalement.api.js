import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Services pour les signalements
export const signalementService = {
  // Récupérer tous les signalements (avec option filtre par user)
  getAll: async (statut = null, userId = null) => {
    const params = {}
    if (statut) params.statut = statut
    if (userId) params.user_id = userId
    const response = await api.get('/api/signalements', { params })
    return response.data.signalements || response.data
  },

  // Récupérer les statistiques
  getStats: async () => {
    const response = await api.get('/api/signalements/stats')
    return response.data.stats || response.data
  },

  // Récupérer les statistiques détaillées (manager)
  getDetailedStats: async () => {
    const response = await api.get('/api/signalements/stats/detailed')
    return response.data.stats || response.data
  },

  // Récupérer un signalement par ID
  getById: async (id) => {
    const response = await api.get(`/api/signalements/${id}`)
    return response.data.signalement || response.data
  },

  // Créer un signalement
  create: async (data) => {
    const response = await api.post('/api/signalements', data)
    return response.data.signalement || response.data
  },

  // Mettre à jour un signalement
  update: async (id, data) => {
    const response = await api.put(`/api/signalements/${id}`, data)
    return response.data.signalement || response.data
  },

  // Supprimer un signalement
  delete: async (id) => {
    const response = await api.delete(`/api/signalements/${id}`)
    return response.data
  },

  // Suggérer des coordonnées (quartiers)
  suggestCoordinates: async () => {
    const response = await api.get('/api/signalements/suggest-coordinates')
    return response.data
  },

  // === PHOTOS ===
  // Récupérer les photos d'un signalement
  getPhotos: async (signalementId) => {
    const response = await api.get(`/api/signalements/${signalementId}/photos`)
    return response.data.photos || []
  },

  // Ajouter des photos à un signalement
  uploadPhotos: async (signalementId, files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('photos', file))
    const response = await axios.post(
      `${API_URL}/api/signalements/${signalementId}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  // Supprimer une photo
  deletePhoto: async (photoId) => {
    const response = await api.delete(`/api/signalements/photos/${photoId}`)
    return response.data
  },

  // === NOTIFICATIONS ===
  // Récupérer les notifications d'un utilisateur
  getNotifications: async (userId) => {
    const response = await api.get(`/api/signalements/notifications/${userId}`)
    return response.data
  },

  // Marquer une notification comme lue
  markNotificationRead: async (notifId) => {
    const response = await api.put(`/api/signalements/notifications/${notifId}/read`)
    return response.data
  },

  // Marquer toutes les notifications comme lues
  markAllNotificationsRead: async (userId) => {
    const response = await api.put(`/api/signalements/notifications/${userId}/read-all`)
    return response.data
  },

  // === FIREBASE SYNC ===
  // Envoyer les données vers Firebase
  pushToFirebase: async () => {
    const response = await api.post('/api/signalements/sync/push')
    return response.data
  },

  // Récupérer les données depuis Firebase
  pullFromFirebase: async () => {
    const response = await api.post('/api/signalements/sync/pull')
    return response.data
  },

  // Synchronisation bidirectionnelle
  syncBidirectional: async () => {
    const response = await api.post('/api/signalements/sync/bidirectional')
    return response.data
  },

  // Obtenir le statut de synchronisation
  getSyncStatus: async () => {
    const response = await api.get('/api/signalements/sync/status')
    return response.data
  },

  // === BACKOFFICE ===
  // Récupérer la config backoffice (prix par m²)
  getBackofficeConfig: async () => {
    const response = await api.get('/api/signalements/backoffice/config')
    return response.data
  },

  // Mettre à jour le prix par m²
  updatePrixParM2: async (prix_par_m2) => {
    const response = await api.put('/api/signalements/backoffice/prix-m2', { prix_par_m2 })
    return response.data
  },

  // Simuler un budget
  simulerBudget: async (niveau, surface_m2) => {
    const response = await api.get('/api/signalements/backoffice/simuler-budget', {
      params: { niveau, surface_m2 }
    })
    return response.data
  }
}

export default api
