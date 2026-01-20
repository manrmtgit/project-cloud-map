import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/api'
import './Profile.css'

const Profile = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getProfile()
        setFormData({
          username: data.user.username || '',
          email: data.user.email || ''
        })
      } catch (err) {
        setError('Erreur lors du chargement du profil')
      }
    }

    fetchProfile()
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await userService.updateProfile(formData)
      setSuccess('Profil mis à jour avec succès !')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await userService.deleteAccount()
      logout()
      navigate('/login')
    } catch (err) {
      setError('Erreur lors de la suppression du compte')
      setShowDeleteModal(false)
    }
  }

  return (
    <div className="profile">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {(user?.username || user?.email || 'U')[0].toUpperCase()}
          </div>
          <h1>Mon Profil</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour'}
          </button>
        </form>

        <div className="danger-zone">
          <h3>Zone dangereuse</h3>
          <p>Une fois votre compte supprimé, il n'y a pas de retour en arrière.</p>
          <button 
            className="btn btn-danger"
            onClick={() => setShowDeleteModal(true)}
          >
            Supprimer mon compte
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirmer la suppression</h2>
            <p>Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.</p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteAccount}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
