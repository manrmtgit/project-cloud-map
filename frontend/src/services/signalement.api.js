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
  // Récupérer tous les signalements
  getAll: async (statut = null) => {
    const params = statut ? { statut } : {}
    const response = await api.get('/api/signalements', { params })
    return response.data.signalements || response.data
  },

  // Récupérer les statistiques
  getStats: async () => {
    const response = await api.get('/api/signalements/stats')
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
  }
}

export default api
