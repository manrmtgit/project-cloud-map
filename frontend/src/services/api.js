import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Services d'authentification
export const authService = {
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData)
    return response.data
  },

  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials)
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    return response.data
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  verify: async () => {
    const response = await api.get('/api/auth/verify')
    return response.data
  },

  refreshToken: async () => {
    const response = await api.post('/api/auth/refresh')
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data
  }
}

// Services utilisateur
export const userService = {
  getProfile: async () => {
    const response = await api.get('/api/users/profile')
    return response.data
  },

  updateProfile: async (userData) => {
    const response = await api.put('/api/users/profile', userData)
    return response.data
  },

  deleteAccount: async () => {
    const response = await api.delete('/api/users/profile')
    return response.data
  },

  getAllUsers: async () => {
    const response = await api.get('/api/users')
    return response.data
  }
}

export default api
