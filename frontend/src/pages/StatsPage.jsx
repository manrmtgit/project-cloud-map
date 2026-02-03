import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signalementService } from '../services/signalement.api';
import { useAuth } from '../context/AuthContext';
import './StatsPage.css';

const StatsPage = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [basicStats, detailed] = await Promise.all([
          signalementService.getStats(),
          signalementService.getDetailedStats()
        ]);
        setStats(basicStats);
        setDetailedStats(detailed);
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="stats-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  const calculatePercentage = (value, total) => {
    if (!total) return 0;
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <div className="stats-page">
      {/* Header */}
      <header className="stats-header">
        <div className="header-left">
          <h1>📊 Tableau de Bord - Statistiques</h1>
          <span className="badge">Manager</span>
        </div>
        <div className="header-right">
          <Link to="/manager" className="btn-nav">
            🛠️ Gestion
          </Link>
          <Link to="/" className="btn-nav">
            🗺️ Carte
          </Link>
          <button className="btn-logout" onClick={logout}>
            🚪 Déconnexion
          </button>
        </div>
      </header>

      <div className="stats-content">
        {/* Section Résumé */}
        <section className="stats-section">
          <h2 className="section-title">📈 Vue d'ensemble</h2>
          <div className="overview-cards">
            <div className="overview-card total">
              <div className="card-icon">📋</div>
              <div className="card-content">
                <span className="card-value">{stats?.total_signalements || 0}</span>
                <span className="card-label">Total Signalements</span>
              </div>
            </div>
            <div className="overview-card nouveau">
              <div className="card-icon">🔴</div>
              <div className="card-content">
                <span className="card-value">{stats?.par_statut?.nouveau || 0}</span>
                <span className="card-label">Nouveaux</span>
                <span className="card-percent">{calculatePercentage(stats?.par_statut?.nouveau, stats?.total_signalements)}%</span>
              </div>
            </div>
            <div className="overview-card en-cours">
              <div className="card-icon">🟡</div>
              <div className="card-content">
                <span className="card-value">{stats?.par_statut?.en_cours || 0}</span>
                <span className="card-label">En cours</span>
                <span className="card-percent">{calculatePercentage(stats?.par_statut?.en_cours, stats?.total_signalements)}%</span>
              </div>
            </div>
            <div className="overview-card termine">
              <div className="card-icon">🟢</div>
              <div className="card-content">
                <span className="card-value">{stats?.par_statut?.termine || 0}</span>
                <span className="card-label">Terminés</span>
                <span className="card-percent">{calculatePercentage(stats?.par_statut?.termine, stats?.total_signalements)}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section Délais de traitement */}
        <section className="stats-section">
          <h2 className="section-title">⏱️ Délais de Traitement</h2>
          <div className="delays-grid">
            <div className="delay-card main">
              <div className="delay-icon">📊</div>
              <div className="delay-info">
                <span className="delay-value">
                  {detailedStats?.delais?.moyen_total_jours || 'N/A'}
                  <small>jours</small>
                </span>
                <span className="delay-label">Délai Moyen Total</span>
                <span className="delay-desc">Du signalement à la fin des travaux</span>
              </div>
            </div>
            <div className="delay-card">
              <div className="delay-icon">🚀</div>
              <div className="delay-info">
                <span className="delay-value">
                  {detailedStats?.delais?.demarrage_moyen_jours || 'N/A'}
                  <small>jours</small>
                </span>
                <span className="delay-label">Délai Démarrage</span>
                <span className="delay-desc">Nouveau → En cours</span>
              </div>
            </div>
            <div className="delay-card">
              <div className="delay-icon">🔧</div>
              <div className="delay-info">
                <span className="delay-value">
                  {detailedStats?.delais?.travaux_moyen_jours || 'N/A'}
                  <small>jours</small>
                </span>
                <span className="delay-label">Délai Travaux</span>
                <span className="delay-desc">En cours → Terminé</span>
              </div>
            </div>
            <div className="delay-card range">
              <div className="delay-icon">📏</div>
              <div className="delay-info">
                <span className="delay-value">
                  {detailedStats?.delais?.min_jours || 'N/A'} - {detailedStats?.delais?.max_jours || 'N/A'}
                  <small>jours</small>
                </span>
                <span className="delay-label">Plage (Min - Max)</span>
                <span className="delay-desc">Écart entre le plus rapide et le plus lent</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section Performance par Entreprise */}
        <section className="stats-section">
          <h2 className="section-title">🏢 Performance par Entreprise</h2>
          <div className="table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Total Projets</th>
                  <th>Terminés</th>
                  <th>Taux Réussite</th>
                  <th>Délai Moyen</th>
                </tr>
              </thead>
              <tbody>
                {detailedStats?.par_entreprise?.map((entreprise, index) => (
                  <tr key={index}>
                    <td className="entreprise-name">
                      <span className="entreprise-icon">🏗️</span>
                      {entreprise.entreprise}
                    </td>
                    <td>{entreprise.total}</td>
                    <td>{entreprise.termines}</td>
                    <td>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${calculatePercentage(entreprise.termines, entreprise.total)}%` }}
                        ></div>
                        <span className="progress-text">
                          {calculatePercentage(entreprise.termines, entreprise.total)}%
                        </span>
                      </div>
                    </td>
                    <td className="delay-cell">
                      {entreprise.delai_moyen 
                        ? `${parseFloat(entreprise.delai_moyen).toFixed(1)} jours` 
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section Évolution Mensuelle */}
        <section className="stats-section">
          <h2 className="section-title">📅 Évolution Mensuelle</h2>
          <div className="monthly-grid">
            {detailedStats?.par_mois?.slice(0, 6).map((mois, index) => (
              <div key={index} className="monthly-card">
                <div className="monthly-header">
                  <span className="monthly-date">{mois.mois}</span>
                  <span className="monthly-total">{mois.total} signalements</span>
                </div>
                <div className="monthly-bars">
                  <div className="bar-item">
                    <span className="bar-label">Nouveaux</span>
                    <div className="bar nouveau" style={{ width: `${calculatePercentage(mois.nouveau, mois.total)}%` }}>
                      {mois.nouveau}
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="bar-label">En cours</span>
                    <div className="bar en-cours" style={{ width: `${calculatePercentage(mois.en_cours, mois.total)}%` }}>
                      {mois.en_cours}
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="bar-label">Terminés</span>
                    <div className="bar termine" style={{ width: `${calculatePercentage(mois.termine, mois.total)}%` }}>
                      {mois.termine}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Indicateurs clés */}
        <section className="stats-section">
          <h2 className="section-title">🎯 Indicateurs Clés de Performance</h2>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon success">✅</div>
              <div className="kpi-value">{calculatePercentage(stats?.par_statut?.termine, stats?.total_signalements)}%</div>
              <div className="kpi-label">Taux de Résolution</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon warning">⏳</div>
              <div className="kpi-value">{stats?.par_statut?.en_cours || 0}</div>
              <div className="kpi-label">Travaux en Cours</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon danger">🚨</div>
              <div className="kpi-value">{stats?.par_statut?.nouveau || 0}</div>
              <div className="kpi-label">En Attente</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon info">📊</div>
              <div className="kpi-value">{stats?.delais?.moyen_total_jours || detailedStats?.delais?.moyen_total_jours || 'N/A'}j</div>
              <div className="kpi-label">Temps Moyen</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StatsPage;
