import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const Register = () => {
  const [formData, setFormData] = useState({ nom: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    if (formData.password !== formData.confirmPassword) { setError('Les mots de passe ne correspondent pas'); return }
    if (formData.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return }

    setLoading(true)
    try {
      await register({ nom: formData.nom, email: formData.email, password: formData.password })
      setSuccess('Inscription réussie ! Redirection...')
      setTimeout(() => navigate('/'), 1500)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon"><i className="fa-solid fa-road"></i></div>
          <h1>CloudMap</h1>
          <p>Créez votre compte</p>
        </div>

        {error && <div className="alert alert-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        {success && <div className="alert alert-success"><i className="fa-solid fa-circle-check"></i> {success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><i className="fa-regular fa-user"></i> Nom</label>
            <input type="text" name="nom" value={formData.nom} onChange={handleChange} placeholder="Votre nom" required />
          </div>
          <div className="form-group">
            <label><i className="fa-regular fa-envelope"></i> Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="votre@email.com" required />
          </div>
          <div className="form-group">
            <label><i className="fa-solid fa-lock"></i> Mot de passe</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
          </div>
          <div className="form-group">
            <label><i className="fa-solid fa-lock"></i> Confirmer le mot de passe</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Inscription...</> : <><i className="fa-solid fa-user-plus"></i> S'inscrire</>}
          </button>
        </form>

        <div className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  )
}

export default Register
