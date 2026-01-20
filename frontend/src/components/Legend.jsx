import React from 'react'
import './Legend.css'

const Legend = ({ statusColors }) => {
  return (
    <div className="map-legend">
      <h4>Légende</h4>
      <div className="legend-items">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: statusColors['NOUVEAU'] }}></span>
          <span>Nouveau</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: statusColors['EN_COURS'] }}></span>
          <span>En cours</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: statusColors['TERMINE'] }}></span>
          <span>Terminé</span>
        </div>
      </div>
    </div>
  )
}

export default Legend
