import React from 'react'
import './SignalementPopup.css'

const SignalementPopup = ({ signalement, onClose, formatBudget }) => {
  const getStatusBadge = (statut) => {
    const statusConfig = {
      'NOUVEAU': { label: 'Nouveau', class: 'nouveau', icon: '🔴' },
      'EN_COURS': { label: 'En cours', class: 'en-cours', icon: '🟡' },
      'TERMINE': { label: 'Terminé', class: 'termine', icon: '🟢' }
    }
    return statusConfig[statut] || { label: statut, class: '', icon: '⚪' }
  }

  const status = getStatusBadge(signalement.statut)
  
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>×</button>
        
        <div className="popup-header">
          <span className={`status-badge ${status.class}`}>
            {status.icon} {status.label}
          </span>
          <h2>{signalement.titre}</h2>
        </div>

        <div className="popup-body">
          {signalement.description && (
            <div className="popup-section">
              <h4>📝 Description</h4>
              <p>{signalement.description}</p>
            </div>
          )}

          <div className="popup-grid">
            <div className="popup-item">
              <span className="item-icon">📅</span>
              <div className="item-content">
                <span className="item-label">Date de signalement</span>
                <span className="item-value">{formatDate(signalement.date_creation)}</span>
              </div>
            </div>

            <div className="popup-item">
              <span className="item-icon">📐</span>
              <div className="item-content">
                <span className="item-label">Surface</span>
                <span className="item-value">
                  {signalement.surface_m2 ? `${signalement.surface_m2} m²` : 'Non définie'}
                </span>
              </div>
            </div>

            <div className="popup-item">
              <span className="item-icon">💰</span>
              <div className="item-content">
                <span className="item-label">Budget estimé</span>
                <span className="item-value">{formatBudget(signalement.budget)}</span>
              </div>
            </div>

            <div className="popup-item">
              <span className="item-icon">🏢</span>
              <div className="item-content">
                <span className="item-label">Entreprise</span>
                <span className="item-value">
                  {signalement.entreprise || 'Non assignée'}
                </span>
              </div>
            </div>
          </div>

          <div className="popup-location">
            <span className="item-icon">📍</span>
            <span className="location-coords">
              {signalement.latitude.toFixed(6)}, {signalement.longitude.toFixed(6)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignalementPopup
