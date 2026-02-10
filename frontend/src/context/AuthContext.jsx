import React, { createContext, useContext, useState, useEffect } from 'react'
import { hybridAuthService } from '../services/hybridService'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connectionMode, setConnectionMode] = useState('checking')

  // Écouter les changements de mode de connexion
  useEffect(() => {
    const unsubscribe = hybridAuthService.onModeChange((mode) => {
      setConnectionMode(mode)
      console.log(`🌐 Mode de connexion: ${mode}`)
    })
    return unsubscribe
  }, [])

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      
      if (token && savedUser) {
        try {
          // Vérifier si le token est toujours valide
          await hybridAuthService.verify()
          setUser(JSON.parse(savedUser))
        } catch (err) {
          // Token invalide, nettoyer le stockage
          console.warn('Token invalide, nettoyage...')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('authMode')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (credentials) => {
    try {
      setError(null)
      const data = await hybridAuthService.login(credentials)
      setUser(data.user)
      return data
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Erreur de connexion'
      setError(message)
      throw new Error(message)
    }
  }

  const register = async (userData) => {
    try {
      setError(null)
      const data = await hybridAuthService.register(userData)
      // Après inscription, connecter automatiquement
      if (data.user) {
        setUser(data.user)
      }
      return data
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Erreur d\'inscription'
      setError(message)
      throw new Error(message)
    }
  }

  const logout = async () => {
    await hybridAuthService.logout()
    setUser(null)
  }

  const value = {
    user,
    loading,
    error,
    connectionMode, // 'online' (Firebase) | 'offline' (PostgreSQL) | 'checking' | 'disconnected'
    isOnline: connectionMode === 'online',
    login,
    register,
    logout,
    setError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
