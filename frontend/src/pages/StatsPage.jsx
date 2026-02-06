import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChartIcon, PieChartIcon, TrendingUpIcon, CalendarIcon, 
         ClockIcon, CheckCircleIcon, AlertCircleIcon, XCircleIcon } from '../components/Icons';
import './StatsPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StatsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    overview: {
      total: 0,
      nouveau: 0,
      en_cours: 0,
      termine: 0
    },
    monthly: [],
    delays: {
      average: 0,
      delayed: 0,
      onTime: 0
    },
    enterprises: [],
    kpis: {
      completion_rate: 0,
      average_resolution_time: 0,
      monthly_growth: 0,
      budget_efficiency: 0
    }
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/signalements/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="stats-page">
      {/* Vue d'ensemble */}
      <div className="stats-section">
        <div className="section-title">
          <BarChartIcon size={20} />
          Vue d'ensemble
        </div>
        
        <div className="overview-cards">
          <div className="overview-card total">
            <div className="card-icon">
              <CheckCircleIcon size={28} />
            </div>
            <div className="card-content">
              <div className="card-value">{stats.overview.total}</div>
              <div className="card-label">Total signalements</div>
            </div>
          </div>
          
          <div className="overview-card nouveau">
            <div className="card-icon">
              <AlertCircleIcon size={28} />
            </div>
            <div className="card-content">
              <div className="card-value">{stats.overview.nouveau}</div>
              <div className="card-label">Nouveaux</div>
              <div className="card-percent">
                {((stats.overview.nouveau / stats.overview.total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="overview-card en-cours">
            <div className="card-icon">
              <ClockIcon size={28} />
            </div>
            <div className="card-content">
              <div className="card-value">{stats.overview.en_cours}</div>
              <div className="card-label">En cours</div>
              <div className="card-percent">
                {((stats.overview.en_cours / stats.overview.total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="overview-card termine">
            <div className="card-icon">
              <CheckCircleIcon size={28} />
            </div>
            <div className="card-content">
              <div className="card-value">{stats.overview.termine}</div>
              <div className="card-label">Terminés</div>
              <div className="card-percent">
                {((stats.overview.termine / stats.overview.total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Délais */}
      <div className="stats-section">
        <div className="section-title">
          <ClockIcon size={20} />
          Analyse des délais
        </div>
        
        <div className="delays-grid">
          <div className="delay-card main">
            <div className="delay-icon">
              <TrendingUpIcon size={24} />
            </div>
            <div className="delay-info">
              <div className="delay-value">
                {stats.delays.average}
                <small>jours</small>
              </div>
              <div className="delay-label">Délai moyen de résolution</div>
              <div className="delay-desc">
                Temps moyen entre création et résolution
              </div>
            </div>
          </div>
          
          <div className="delay-card">
            <div className="delay-icon">
              <AlertCircleIcon size={24} />
            </div>
            <div className="delay-info">
              <div className="delay-value">{stats.delays.delayed}</div>
              <div className="delay-label">En retard</div>
              <div className="delay-desc">Signalements dépassant le délai</div>
            </div>
          </div>
          
          <div className="delay-card">
            <div className="delay-icon">
              <CheckCircleIcon size={24} />
            </div>
            <div className="delay-info">
              <div className="delay-value">{stats.delays.onTime}</div>
              <div className="delay-label">Dans les temps</div>
              <div className="delay-desc">Respectant les délais prévus</div>
            </div>
          </div>
        </div>
      </div>

      {/* Évolution mensuelle */}
      {stats.monthly && stats.monthly.length > 0 && (
        <div className="stats-section">
          <div className="section-title">
            <CalendarIcon size={20} />
            Évolution mensuelle
          </div>
          
          <div className="monthly-grid">
            {stats.monthly.map((month, index) => (
              <div key={index} className="monthly-card">
                <div className="monthly-header">
                  <span className="monthly-date">{month.month}</span>
                  <span className="monthly-total">Total: {month.total}</span>
                </div>
                <div className="monthly-bars">
                  <div className="bar-item">
                    <span className="bar-label">Nouveau</span>
                    <div 
                      className="bar nouveau" 
                      style={{width: `${(month.nouveau / month.total) * 100}%`}}
                    >
                      {month.nouveau}
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="bar-label">En cours</span>
                    <div 
                      className="bar en-cours" 
                      style={{width: `${(month.en_cours / month.total) * 100}%`}}
                    >
                      {month.en_cours}
                    </div>
                  </div>
                  <div className="bar-item">
                    <span className="bar-label">Terminé</span>
                    <div 
                      className="bar termine" 
                      style={{width: `${(month.termine / month.total) * 100}%`}}
                    >
                      {month.termine}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entreprises */}
      {stats.enterprises && stats.enterprises.length > 0 && (
        <div className="stats-section">
          <div className="section-title">
            <PieChartIcon size={20} />
            Performance par entreprise
          </div>
          
          <div className="table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Total</th>
                  <th>Terminés</th>
                  <th>Progression</th>
                  <th>Délai moyen</th>
                </tr>
              </thead>
              <tbody>
                {stats.enterprises.map((enterprise, index) => (
                  <tr key={index}>
                    <td>
                      <div className="entreprise-name">
                        <span className="entreprise-icon">🏢</span>
                        {enterprise.name}
                      </div>
                    </td>
                    <td>{enterprise.total}</td>
                    <td>{enterprise.completed}</td>
                    <td>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{width: `${(enterprise.completed / enterprise.total) * 100}%`}}
                        ></div>
                        <span className="progress-text">
                          {((enterprise.completed / enterprise.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className={enterprise.averageDelay > 30 ? 'delay-cell' : ''}>
                      {enterprise.averageDelay} jours
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="stats-section">
        <div className="section-title">
          <TrendingUpIcon size={20} />
          Indicateurs clés
        </div>
        
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon success">
              <CheckCircleIcon size={28} />
            </div>
            <span className="kpi-value">{stats.kpis.completion_rate.toFixed(1)}%</span>
            <span className="kpi-label">Taux de complétion</span>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-icon warning">
              <ClockIcon size={28} />
            </div>
            <span className="kpi-value">{stats.kpis.average_resolution_time}</span>
            <span className="kpi-label">Délai moyen (jours)</span>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-icon info">
              <TrendingUpIcon size={28} />
            </div>
            <span className="kpi-value">
              {stats.kpis.monthly_growth > 0 ? '+' : ''}{stats.kpis.monthly_growth.toFixed(1)}%
            </span>
            <span className="kpi-label">Croissance mensuelle</span>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-icon danger">
              <PieChartIcon size={28} />
            </div>
            <span className="kpi-value">{stats.kpis.budget_efficiency.toFixed(1)}%</span>
            <span className="kpi-label">Efficacité budget</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
