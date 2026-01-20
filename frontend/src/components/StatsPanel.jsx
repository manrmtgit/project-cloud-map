import React from 'react'
import './StatsPanel.css'

const StatsPanel = ({ stats, loading, formatBudget }) => {
  if (loading) {
    return (
      <div className="stats-panel">
        <div className="stats-loading">Chargement des statistiques...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="stats-panel">
        <div className="stats-error">Erreur de chargement</div>
      </div>
    )
  }

  return (
    <div className="stats-panel">
      <h2>📊 Tableau de bord</h2>
      
      {/* Statistiques générales */}
      <div className="stats-section">
        <h3>Récapitulatif</h3>
        
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_signalements}</span>
            <span className="stat-label">Signalements</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📐</div>
          <div className="stat-content">
            <span className="stat-value">{stats.total_surface_m2?.toFixed(0)} m²</span>
            <span className="stat-label">Surface totale</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-value budget">{formatBudget(stats.total_budget)}</span>
            <span className="stat-label">Budget total</span>
          </div>
        </div>
      </div>

      {/* Avancement */}
      <div className="stats-section">
        <h3>Avancement</h3>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${stats.avancement_pourcentage}%` }}
            ></div>
          </div>
          <span className="progress-text">{stats.avancement_pourcentage}%</span>
        </div>
      </div>

      {/* Par statut */}
      <div className="stats-section">
        <h3>Par statut</h3>
        
        <div className="status-list">
          <div className="status-item">
            <span className="status-dot nouveau"></span>
            <span className="status-name">Nouveau</span>
            <span className="status-count">{stats.par_statut?.nouveau || 0}</span>
          </div>
          
          <div className="status-item">
            <span className="status-dot en-cours"></span>
            <span className="status-name">En cours</span>
            <span className="status-count">{stats.par_statut?.en_cours || 0}</span>
          </div>
          
          <div className="status-item">
            <span className="status-dot termine"></span>
            <span className="status-name">Terminé</span>
            <span className="status-count">{stats.par_statut?.termine || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsPanel
