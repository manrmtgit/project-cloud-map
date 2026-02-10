import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import MapView from './pages/MapView'
import ManagerView from './pages/ManagerView'
import StatsPage from './pages/StatsPage'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'

/* ── Route guards ── */
const ManagerRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Chargement...</p></div>
  const ok = user?.role === 'MANAGER' || user?.role === 'manager' || user?.email === 'manager@cloudmap.mg'
  return (user && ok) ? children : <Navigate to="/" />
}

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Chargement...</p></div>
  return user ? children : <Navigate to="/login" />
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Chargement...</p></div>
  return !user ? children : <Navigate to="/" />
}

/* ── Routes ── */
function AppContent() {
  return (
    <Routes>
      {/* Carte — accessible par tous */}
      <Route path="/" element={<Layout><MapView /></Layout>} />

      {/* Auth — pas de sidebar */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Profil */}
      <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />

      {/* Manager */}
      <Route path="/manager" element={<ManagerRoute><Layout><ManagerView /></Layout></ManagerRoute>} />
      <Route path="/dashboard" element={<ManagerRoute><Layout><Dashboard /></Layout></ManagerRoute>} />
      <Route path="/stats" element={<ManagerRoute><Layout><StatsPage /></Layout></ManagerRoute>} />

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
