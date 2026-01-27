import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MapView from './pages/MapView'
import ManagerView from './pages/ManagerView'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'

// Route protégée pour le Manager uniquement
const ManagerRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div><p>Chargement...</p></div>
  }
  
  const isManager = user?.role === 'manager' || user?.email === 'manager@cloudmap.local'
  
  if (!user || !isManager) {
    return <Navigate to="/" />
  }
  
  return children
}

// Route protégée pour utilisateurs connectés
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div><p>Chargement...</p></div>
  }
  
  return user ? children : <Navigate to="/login" />
}

// Route publique (redirige vers carte si déjà connecté)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div><p>Chargement...</p></div>
  }
  
  return !user ? children : <Navigate to="/" />
}

function AppContent() {
  return (
    <Routes>
      {/* La carte est accessible par tous (visiteur, utilisateur, manager) */}
      <Route path="/" element={<MapView />} />
      
      {/* Routes d'authentification */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      
      {/* Route protégée - Profil (utilisateur connecté) */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      {/* Routes Manager uniquement */}
      <Route path="/manager" element={<ManagerRoute><ManagerView /></ManagerRoute>} />
      <Route path="/dashboard" element={<ManagerRoute><Dashboard /></ManagerRoute>} />
      
      {/* Redirection par défaut */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App
