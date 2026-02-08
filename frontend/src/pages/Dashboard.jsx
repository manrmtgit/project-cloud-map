import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userService, adminService } from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])
  const [loginConfig, setLoginConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [unblocking, setUnblocking] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersData, blockedData, configData] = await Promise.all([
        userService.getAllUsers(),
        adminService.getBlockedUsers(),
        adminService.getLoginConfig()
      ])
      setUsers(usersData.users || [])
      setBlockedUsers(blockedData.blocked_users || [])
      setLoginConfig(configData)
    } catch (err) {
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (userId, email) => {
    if (!confirm(`Voulez-vous vraiment débloquer l'utilisateur ${email} ?`)) return
    
    try {
      setUnblocking(userId)
      await adminService.unblockUser(userId)
      setSuccessMsg(`Utilisateur ${email} débloqué avec succès`)
      // Rafraîchir les données
      await fetchData()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(`Erreur lors du déblocage de ${email}`)
      setTimeout(() => setError(''), 3000)
    } finally {
      setUnblocking(null)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Tableau de bord</h1>
        <p>Bienvenue, <strong>{user?.name || user?.email}</strong> !</p>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{users.length}</h3>
            <p>Utilisateurs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔒</div>
          <div className="stat-info">
            <h3>{blockedUsers.length}</h3>
            <p>Comptes bloqués</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🛡️</div>
          <div className="stat-info">
            <h3>{loginConfig?.max_login_attempts || 3}</h3>
            <p>Max tentatives</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-info">
            <h3>{loginConfig?.session_duration || '24h'}</h3>
            <p>Durée session</p>
          </div>
        </div>
      </div>

      {/* Section utilisateurs bloqués */}
      <div className="dashboard-section blocked-section">
        <h2>🔒 Utilisateurs bloqués</h2>
        
        {loading && <p>Chargement...</p>}
        
        {!loading && blockedUsers.length === 0 && (
          <div className="empty-state">
            <p>✅ Aucun utilisateur bloqué</p>
          </div>
        )}
        
        {!loading && blockedUsers.length > 0 && (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nom</th>
                  <th>Tentatives</th>
                  <th>Bloqué le</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {blockedUsers.map((u) => (
                  <tr key={u.id} className="blocked-row">
                    <td>{u.email}</td>
                    <td>{u.name}</td>
                    <td><span className="badge badge-danger">{u.attempts}</span></td>
                    <td>{new Date(u.blocked_at).toLocaleString('fr-FR')}</td>
                    <td>
                      <button 
                        className="btn-unblock"
                        onClick={() => handleUnblock(u.id, u.email)}
                        disabled={unblocking === u.id}
                      >
                        {unblocking === u.id ? '⏳ ...' : '🔓 Débloquer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section tous les utilisateurs */}
      <div className="dashboard-section">
        <h2>👥 Liste des utilisateurs</h2>
        
        {loading && <p>Chargement...</p>}
        
        {!loading && (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Date d'inscription</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td title={u.id}>{u.id.substring(0, 8)}...</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
