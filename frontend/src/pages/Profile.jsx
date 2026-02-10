import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/api'
import './Profile.css'

const Profile = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ nom: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await userService.getProfile()
        const u = data.utilisateur || data.user
        setFormData({ nom: u?.nom || '', email: u?.email || '', password: '' })
      } catch { setError('Erreur lors du chargement du profil') }
    })()
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      const body = { nom: formData.nom, email: formData.email }
      if (formData.password) body.password = formData.password
      await userService.updateProfile(body)
      setSuccess('Profil mis à jour avec succès')
    } catch (err) { setError(err.response?.data?.message || 'Erreur lors de la mise à jour') }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    try { await userService.deleteAccount(); await logout(); navigate('/login') }
    catch { setError('Erreur lors de la suppression'); setShowDeleteModal(false) }
  }

  return (
    <div className="profile-page">
      <div className="profile-card card">
        <div className="profile-header-zone">
          <div className="profile-avatar">{(user?.nom || 'U')[0].toUpperCase()}</div>
          <h2>{user?.nom || 'Utilisateur'}</h2>
          <span className="badge badge-primary">{user?.role || 'utilisateur'}</span>
        </div>

        {error && <div className="alert alert-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        {success && <div className="alert alert-success"><i className="fa-solid fa-circle-check"></i> {success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label><i className="fa-regular fa-user"></i> Nom</label>
            <input type="text" name="nom" value={formData.nom} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label><i className="fa-regular fa-envelope"></i> Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label><i className="fa-solid fa-lock"></i> Nouveau mot de passe <span style={{color:'var(--gray-400)', fontWeight:400}}>(optionnel)</span></label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Laisser vide pour ne pas changer" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Mise à jour...</> : <><i className="fa-solid fa-floppy-disk"></i> Enregistrer</>}
          </button>
        </form>

        <div className="danger-zone">
          <h3><i className="fa-solid fa-triangle-exclamation"></i> Zone dangereuse</h3>
          <p>La suppression de votre compte est définitive et irréversible.</p>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>
            <i className="fa-solid fa-trash"></i> Supprimer mon compte
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2><i className="fa-solid fa-triangle-exclamation" style={{color:'var(--danger)'}}></i> Confirmer la suppression</h2>
            <p>Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="btn btn-danger" onClick={handleDelete}><i className="fa-solid fa-trash"></i> Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
