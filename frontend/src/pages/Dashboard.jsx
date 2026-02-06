import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/api'
import Icons from '../components/Icons'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await userService.getAllUsers()
        setUsers(data.users || [])
      } catch (err) {
        setError('Erreur lors du chargement des utilisateurs')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Tableau de bord</h1>
        <p>Bienvenue, <strong>{user?.username || user?.email}</strong> !</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon users">
            <Icons.Users size={24} />
          </div>
          <div className="stat-info">
            <h3>{users.length}</h3>
            <p>Utilisateurs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon map">
            <Icons.Map size={24} />
          </div>
          <div className="stat-info">
            <h3>1</h3>
            <p>Carte</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <Icons.CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Actif</h3>
            <p>Statut</p>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Liste des utilisateurs</h2>
        
        {loading && <p>Chargement...</p>}
        {error && <div className="alert alert-error">{error}</div>}
        
        {!loading && !error && (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom d'utilisateur</th>
                  <th>Email</th>
                  <th>Date d'inscription</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
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
