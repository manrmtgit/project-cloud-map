import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MapView from './pages/MapView'
import ManagerView from './pages/ManagerView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/manager" element={<ManagerView />} />
      </Routes>
    </Router>
  )
}

export default App
