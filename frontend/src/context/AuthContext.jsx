import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/api'

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

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      
      if (token && savedUser) {
        try {
          // Vérifier si le token est toujours valide
          await authService.verify()
          setUser(JSON.parse(savedUser))
        } catch (err) {
          // Token invalide, nettoyer le stockage
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (credentials) => {
    try {
      setError(null)
      const data = await authService.login(credentials)
      setUser(data.user)
      return data
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Erreur de connexion'
      setError(message)
      // Re-throw with original response data for Login component to handle
      throw err
    }
  }

  const register = async (userData) => {
    try {
      setError(null)
      const data = await authService.register(userData)
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur d\'inscription'
      setError(message)
      throw new Error(message)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const value = {
    user,
    loading,
    error,
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
