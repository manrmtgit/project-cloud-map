import React from 'react'
import './Legend.css'

const Legend = () => {
  const statusConfig = [
    { key: 'nouveau', label: 'Nouveau', color: '#e74c3c', icon: '⚠️' },
    { key: 'en_cours', label: 'En cours', color: '#f39c12', icon: '🔧' },
    { key: 'termine', label: 'Terminé', color: '#27ae60', icon: '✅' }
  ];

  return (
    <div className="map-legend">
      <h4>🗺️ Légende</h4>
      <div className="legend-items">
        {statusConfig.map(status => (
          <div key={status.key} className="legend-item">
            <div 
              className="legend-marker" 
              style={{ backgroundColor: status.color }}
            >
              <span className="legend-icon">{status.icon}</span>
            </div>
            <span className="legend-label">{status.label}</span>
          </div>
        ))}
      </div>
      <div className="legend-hint">
        Survolez un marqueur pour voir les détails
      </div>
    </div>
  )
}

export default Legend
