import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(formData)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon"><i className="fa-solid fa-road"></i></div>
          <h1>CloudMap</h1>
          <p>Connectez-vous à votre compte</p>
        </div>

        {error && <div className="alert alert-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><i className="fa-regular fa-envelope"></i> Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="votre@email.com" required />
          </div>
          <div className="form-group">
            <label><i className="fa-solid fa-lock"></i> Mot de passe</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Connexion...</> : <><i className="fa-solid fa-right-to-bracket"></i> Se connecter</>}
          </button>
        </form>

        <div className="auth-footer">
          Pas encore de compte ? <Link to="/register">S'inscrire</Link>
        </div>

        <div className="auth-demo">
          <h4><i className="fa-solid fa-circle-info"></i> Comptes de test</h4>
          <p><strong>Manager :</strong> <code>manager@cloudmap.mg</code> / <code>Manager123!</code></p>
          <p><strong>Utilisateur :</strong> <code>user@cloudmap.mg</code> / <code>User1234!</code></p>
        </div>
      </div>
    </div>
  )
}

export default Login
