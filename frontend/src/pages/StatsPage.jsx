import React, { useState, useEffect } from 'react'
import { signalementService } from '../services/api'
import './StatsPage.css'

const StatsPage = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [detailed, setDetailed] = useState(null)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [statsRes, detailedRes] = await Promise.all([
        signalementService.getStats().catch(() => null),
        signalementService.getDetailedStats().catch(() => null)
      ])

      // Parse stats — { success, stats: { total_signalements, par_statut, delais, ... } }
      if (statsRes?.stats) {
        const s = statsRes.stats
        setStats({
          total: parseInt(s.total_signalements) || 0,
          nouveau: s.par_statut?.nouveau || 0,
          en_cours: s.par_statut?.en_cours || 0,
          termine: s.par_statut?.termine || 0,
          total_surface: parseFloat(s.total_surface_m2) || 0,
          total_budget: parseFloat(s.total_budget) || 0,
          avancement: parseFloat(s.avancement_global) || 0,
          delais: s.delais || {}
        })
      }

      // Parse detailed — { success, stats: { delais, par_entreprise, par_niveau } }
      if (detailedRes?.stats) {
        setDetailed(detailedRes.stats)
      }
    } catch (e) { console.error('Stats error:', e) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Chargement des statistiques...</p></div>

  const s = stats || { total: 0, nouveau: 0, en_cours: 0, termine: 0, total_surface: 0, total_budget: 0, avancement: 0, delais: {} }
  const total = s.total || 1

  // KPIs
  const completionRate = ((s.termine / total) * 100).toFixed(1)
  const avgResolution = s.delais?.moyen_total_jours || detailed?.delais?.moyen_total_jours || '—'
  const avgStartup = detailed?.delais?.demarrage_moyen_jours || '—'
  const avgWorkDuration = detailed?.delais?.travaux_moyen_jours || '—'
  const minDays = detailed?.delais?.min_jours || s.delais?.min_jours || '—'
  const maxDays = detailed?.delais?.max_jours || s.delais?.max_jours || '—'

  const enterprises = detailed?.par_entreprise || []
  const niveaux = detailed?.par_niveau || []

  return (
    <div className="stats-page">
      {/* ── KPI Cards ── */}
      <div className="stats-kpi-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><i className="fa-solid fa-road"></i></div>
          <div className="stat-value">{s.total}</div>
          <div className="stat-label">Total signalements</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger"><i className="fa-solid fa-circle-exclamation"></i></div>
          <div className="stat-value">{s.nouveau}</div>
          <div className="stat-label">Nouveaux</div>
          <div className="stat-percent">{((s.nouveau / total) * 100).toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><i className="fa-solid fa-hammer"></i></div>
          <div className="stat-value">{s.en_cours}</div>
          <div className="stat-label">En cours</div>
          <div className="stat-percent">{((s.en_cours / total) * 100).toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><i className="fa-solid fa-circle-check"></i></div>
          <div className="stat-value">{s.termine}</div>
          <div className="stat-label">Terminés</div>
          <div className="stat-percent">{((s.termine / total) * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* ── Recap Table ── */}
      <div className="card mb-6">
        <div className="card-header">
          <h3><i className="fa-solid fa-table-list" style={{marginRight:8, color:'var(--primary)'}}></i>Récapitulatif global</h3>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nb de points</th>
                <th>Total surface (m²)</th>
                <th>Avancement global</th>
                <th>Total budget (Ar)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{fontWeight:700, fontSize:18, color:'var(--primary)'}}>{s.total}</td>
                <td style={{fontWeight:600}}>{Number(s.total_surface).toLocaleString('fr-FR')} m²</td>
                <td>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div style={{flex:1, height:8, background:'var(--gray-100)', borderRadius:4, overflow:'hidden'}}>
                      <div style={{width:`${s.avancement}%`, height:'100%', background:'var(--success)', borderRadius:4, transition:'width .6s ease'}}></div>
                    </div>
                    <span style={{fontWeight:600, color:'var(--success)'}}>{s.avancement}%</span>
                  </div>
                </td>
                <td style={{fontWeight:700, color:'var(--primary)'}}>{Number(s.total_budget).toLocaleString('fr-FR')} Ar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="stats-grid-2col">
        {/* ── Répartition Chart ── */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-chart-pie" style={{marginRight:8, color:'var(--primary)'}}></i>Répartition par statut</h3>
          </div>
          <div className="card-body">
            <div className="bar-chart">
              <div className="bar-item">
                <div className="bar-label">Nouveaux</div>
                <div className="bar-track">
                  <div className="bar-fill danger" style={{width: `${(s.nouveau / total) * 100}%`}}></div>
                </div>
                <div className="bar-value">{s.nouveau}</div>
              </div>
              <div className="bar-item">
                <div className="bar-label">En cours</div>
                <div className="bar-track">
                  <div className="bar-fill warning" style={{width: `${(s.en_cours / total) * 100}%`}}></div>
                </div>
                <div className="bar-value">{s.en_cours}</div>
              </div>
              <div className="bar-item">
                <div className="bar-label">Terminés</div>
                <div className="bar-track">
                  <div className="bar-fill success" style={{width: `${(s.termine / total) * 100}%`}}></div>
                </div>
                <div className="bar-value">{s.termine}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Délais de traitement ── */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-clock" style={{marginRight:8, color:'var(--info)'}}></i>Délais de traitement</h3>
          </div>
          <div className="card-body">
            <div className="kpi-list">
              <div className="kpi-item">
                <div className="kpi-icon success"><i className="fa-solid fa-percent"></i></div>
                <div>
                  <div className="kpi-value">{completionRate}%</div>
                  <div className="kpi-label">Taux de complétion</div>
                </div>
              </div>
              <div className="kpi-item">
                <div className="kpi-icon info"><i className="fa-solid fa-hourglass-half"></i></div>
                <div>
                  <div className="kpi-value">{avgResolution} j</div>
                  <div className="kpi-label">Durée moyenne résolution (total)</div>
                </div>
              </div>
              <div className="kpi-item">
                <div className="kpi-icon warning"><i className="fa-solid fa-play"></i></div>
                <div>
                  <div className="kpi-value">{avgStartup} j</div>
                  <div className="kpi-label">Délai moyen démarrage</div>
                </div>
              </div>
              <div className="kpi-item">
                <div className="kpi-icon primary"><i className="fa-solid fa-hammer"></i></div>
                <div>
                  <div className="kpi-value">{avgWorkDuration} j</div>
                  <div className="kpi-label">Durée moyenne travaux</div>
                </div>
              </div>
              <div className="kpi-item">
                <div className="kpi-icon danger"><i className="fa-solid fa-arrow-down"></i></div>
                <div>
                  <div className="kpi-value">{minDays} j / {maxDays} j</div>
                  <div className="kpi-label">Min / Max résolution</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Répartition par niveau ── */}
      {niveaux.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h3><i className="fa-solid fa-layer-group" style={{marginRight:8, color:'var(--primary)'}}></i>Par niveau de réparation</h3>
          </div>
          <div className="card-body">
            <div className="bar-chart">
              {niveaux.map(n => {
                const maxTotal = Math.max(...niveaux.map(x => parseInt(x.total) || 0), 1)
                return (
                  <div key={n.niveau} className="bar-item">
                    <div className="bar-label">Niveau {n.niveau}</div>
                    <div className="bar-track">
                      <div className="bar-fill primary" style={{width: `${(parseInt(n.total) / maxTotal) * 100}%`}}></div>
                    </div>
                    <div className="bar-value" style={{minWidth:120, textAlign:'right'}}>
                      {n.total} sig. — {Number(parseFloat(n.budget_total) || 0).toLocaleString('fr-FR')} Ar
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Par entreprise ── */}
      {enterprises.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-building" style={{marginRight:8, color:'var(--warning)'}}></i>Par entreprise</h3>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Total signalements</th>
                  <th>Terminés</th>
                  <th>Taux achèvement</th>
                </tr>
              </thead>
              <tbody>
                {enterprises.map((e, i) => (
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{e.entreprise}</td>
                    <td>{e.total}</td>
                    <td>{e.termines || 0}</td>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div style={{width:60, height:6, background:'var(--gray-100)', borderRadius:3, overflow:'hidden'}}>
                          <div style={{width:`${parseInt(e.total) > 0 ? ((parseInt(e.termines) || 0) / parseInt(e.total) * 100) : 0}%`, height:'100%', background:'var(--success)', borderRadius:3}}></div>
                        </div>
                        <span className="badge badge-success">
                          {parseInt(e.total) > 0 ? ((parseInt(e.termines) || 0) / parseInt(e.total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsPage
