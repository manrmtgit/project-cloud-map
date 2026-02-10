import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Intercepteur — ajouter le token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Intercepteur — gérer 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Auth ──
export const authService = {
  register: async (userData) => {
    // userData: { nom, email, password }
    const response = await api.post('/api/auth/register', userData)
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.utilisateur))
    }
    return response.data
  },

  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials)
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.utilisateur))
    }
    return response.data
  },

  logout: async () => {
    try { await api.post('/api/auth/logout') } catch (e) {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  verify: async () => {
    const response = await api.get('/api/auth/verify')
    return response.data
  },

  refreshToken: async () => {
    const response = await api.post('/api/auth/refresh')
    if (response.data.token) localStorage.setItem('token', response.data.token)
    return response.data
  },

  resetBlock: async (userId) => {
    const response = await api.post(`/api/auth/reset-block/${userId}`)
    return response.data
  }
}

// ── Utilisateurs ──
export const userService = {
  getProfile: async () => {
    const response = await api.get('/api/users/profile')
    return response.data
  },

  updateProfile: async (data) => {
    const response = await api.put('/api/users/profile', data)
    return response.data
  },

  deleteAccount: async () => {
    const response = await api.delete('/api/users/profile')
    return response.data
  },

  getAllUsers: async () => {
    const response = await api.get('/api/users')
    return response.data
  },

  getParametres: async () => {
    const response = await api.get('/api/users/parametres')
    return response.data
  },

  updateParametre: async (cle, valeur) => {
    const response = await api.put(`/api/users/parametres/${cle}`, { valeur })
    return response.data
  },

  getTypesReparation: async () => {
    const response = await api.get('/api/users/types-reparation')
    return response.data
  },

  createUser: async (data) => {
    const response = await api.post('/api/users', data)
    return response.data
  },

  updateUser: async (id, data) => {
    const response = await api.put(`/api/users/${id}`, data)
    return response.data
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/api/users/${id}`)
    return response.data
  },

  unblockByEmail: async (email) => {
    const response = await api.post('/api/users/unblock', { email })
    return response.data
  }
}

// ── Signalements ──
export const signalementService = {
  getAll: async () => {
    const response = await api.get('/api/signalements')
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/api/signalements/${id}`)
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/api/signalements', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/api/signalements/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/api/signalements/${id}`)
    return response.data
  },

  uploadPhotos: async (id, formData) => {
    const response = await api.post(`/api/signalements/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  getStats: async () => {
    const response = await api.get('/api/signalements/stats')
    return response.data
  },

  getDetailedStats: async () => {
    const response = await api.get('/api/signalements/stats/detailed')
    return response.data
  },

  // Sync Firebase
  syncPush: async () => {
    const response = await api.post('/api/signalements/sync/push')
    return response.data
  },

  syncPull: async () => {
    const response = await api.post('/api/signalements/sync/pull')
    return response.data
  },

  syncBidirectional: async () => {
    const response = await api.post('/api/signalements/sync/bidirectional')
    return response.data
  },

  syncStats: async () => {
    const response = await api.get('/api/signalements/sync/status')
    return response.data
  }
}

export default api
