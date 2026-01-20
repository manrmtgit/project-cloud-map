import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          🗺️ Cloud Map
        </Link>
        
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-link">
            Dashboard
          </Link>
          <Link to="/profile" className="navbar-link">
            Profil
          </Link>
        </div>

        <div className="navbar-user">
          <span className="user-name">
            👤 {user?.username || user?.email}
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
