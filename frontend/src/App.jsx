import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Navbar from './components/Navbar'

// Composant pour les routes protégées
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading">Chargement...</div>
  }
  
  return user ? children : <Navigate to="/login" />
}

// Composant pour les routes publiques (redirige si déjà connecté)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading">Chargement...</div>
  }
  
  return !user ? children : <Navigate to="/dashboard" />
}

function AppContent() {
  const { user } = useAuth()

  return (
    <>
      {user && <Navbar />}
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </>
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
