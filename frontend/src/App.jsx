import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MapView from './pages/MapView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MapView />} />
      </Routes>
    </Router>
  )
}

export default App
