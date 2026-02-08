import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/api'
import './Auth.css'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(null)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBlocked(false)
    setRemainingAttempts(null)
    setLoading(true)

    try {
      await login(formData)
      navigate('/')
    } catch (err) {
      const errorData = err.response?.data || {}
      
      if (errorData.blocked) {
        setBlocked(true)
        setError('Votre compte a été bloqué suite à trop de tentatives échouées. Contactez un administrateur.')
      } else if (errorData.remaining_attempts !== undefined) {
        setRemainingAttempts(errorData.remaining_attempts)
        setError(`Email ou mot de passe incorrect. ${errorData.remaining_attempts} tentative(s) restante(s) avant blocage.`)
      } else {
        setError(err.response?.data?.error || err.message || 'Erreur de connexion')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🗺️ Cloud Map</h1>
          <p>Connectez-vous à votre compte</p>
        </div>

        {error && (
          <div className={`alert ${blocked ? 'alert-blocked' : 'alert-error'}`}>
            {blocked && <span className="blocked-icon">🔒 </span>}
            {error}
          </div>
        )}

        {remainingAttempts !== null && remainingAttempts <= 1 && !blocked && (
          <div className="alert alert-warning">
            ⚠️ Attention : dernière tentative avant blocage du compte !
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              required
              disabled={blocked}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={blocked}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading || blocked}
          >
            {loading ? 'Connexion...' : blocked ? '🔒 Compte bloqué' : 'Se connecter'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Pas encore de compte ?{' '}
            <Link to="/register" className="link">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
