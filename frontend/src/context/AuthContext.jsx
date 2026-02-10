import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')

      if (token && savedUser) {
        try {
          await authService.verify()
          setUser(JSON.parse(savedUser))
        } catch {
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
      // Le backend renvoie { utilisateur, token }
      const u = data.utilisateur || data.user
      setUser(u)
      return data
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Erreur de connexion'
      setError(message)
      throw new Error(message)
    }
  }

  const register = async (userData) => {
    try {
      setError(null)
      const data = await authService.register(userData)
      const u = data.utilisateur || data.user
      setUser(u)
      return data
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || "Erreur d'inscription"
      setError(message)
      throw new Error(message)
    }
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const value = { user, loading, error, login, register, logout, setUser, setError }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
