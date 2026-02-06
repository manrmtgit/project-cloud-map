import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MapView from './pages/MapView'
import ManagerView from './pages/ManagerView'
import StatsPage from './pages/StatsPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'

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
      <Route path="/" element={<Layout><MapView /></Layout>} />
      
      {/* Routes d'authentification */}
  <Route path="/login" element={<PublicRoute><Layout hideSidebar={true} showHeader={false}><Login /></Layout></PublicRoute>} />
  <Route path="/register" element={<PublicRoute><Layout hideSidebar={true} showHeader={false}><Register /></Layout></PublicRoute>} />
      
      {/* Route protégée - Profil (utilisateur connecté) */}
  <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      
      {/* Routes Manager uniquement */}
  <Route path="/manager" element={<ManagerRoute><ManagerView /></ManagerRoute>} />
  <Route path="/dashboard" element={<ManagerRoute><Layout><Dashboard /></Layout></ManagerRoute>} />
  <Route path="/stats" element={<ManagerRoute><Layout><StatsPage /></Layout></ManagerRoute>} />
      
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
