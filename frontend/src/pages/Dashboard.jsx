import React, { useState, useEffect } from 'react'
import { signalementService, userService, authService } from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [parametres, setParametres] = useState([])
  const [syncInfo, setSyncInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({ nom: '', email: '', password: '', role: 'UTILISATEUR' })
  const [unblockEmail, setUnblockEmail] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, paramsRes, syncRes] = await Promise.all([
        signalementService.getStats().catch(() => null),
        userService.getAllUsers().catch(() => ({ users: [] })),
        userService.getParametres().catch(() => ({ parametres: [] })),
        signalementService.syncStats().catch(() => null)
      ])

      // Parse stats — API returns { success, stats: { total_signalements, par_statut, ... } }
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

      setUsers(usersRes?.users || [])
      setParametres(paramsRes?.parametres || [])
      // syncRes = { success, stats: { postgresql_count, firebase_count, in_sync, last_sync, ... } }
      setSyncInfo(syncRes?.stats || null)
    } catch (e) { console.error('Dashboard loadAll error:', e) }
    finally { setLoading(false) }
  }

  const handleResetBlock = async (userId) => {
    try {
      await authService.resetBlock(userId)
      loadAll()
    } catch (e) { alert('Erreur: ' + (e.response?.data?.error || e.message)) }
  }

  const handleParamUpdate = async (cle, newVal) => {
    try {
      await userService.updateParametre(cle, newVal)
      loadAll()
    } catch (e) { alert('Erreur: ' + (e.response?.data?.error || e.message)) }
  }

  const handleSync = async (type) => {
    setSyncLoading(true); setSyncMsg(null)
    try {
      let result
      if (type === 'push') result = await signalementService.syncPush()
      else if (type === 'pull') result = await signalementService.syncPull()
      else result = await signalementService.syncBidirectional()
      setSyncMsg({ type: 'success', text: result.message || 'Synchronisation effectuée' })
      loadAll()
    } catch (e) {
      setSyncMsg({ type: 'error', text: e.response?.data?.message || e.message })
    } finally { setSyncLoading(false) }
  }

  const handleCreateOrUpdateUser = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        const body = { nom: userForm.nom, email: userForm.email, role: userForm.role }
        if (userForm.password) body.password = userForm.password
        await userService.updateUser(editingUser.id, body)
      } else {
        await userService.createUser(userForm)
      }
      setShowUserModal(false)
      setUserForm({ nom: '', email: '', password: '', role: 'UTILISATEUR' })
      setEditingUser(null)
      loadAll()
    } catch (e) { alert('Erreur: ' + (e.response?.data?.error || e.message)) }
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    try {
      await userService.deleteUser(id)
      loadAll()
    } catch (e) { alert('Erreur: ' + (e.response?.data?.error || e.message)) }
  }

  const openCreateUser = () => {
    setEditingUser(null)
    setUserForm({ nom: '', email: '', password: '', role: 'UTILISATEUR' })
    setShowUserModal(true)
  }

  const openEditUser = (u) => {
    setEditingUser(u)
    setUserForm({ nom: u.nom, email: u.email, password: '', role: u.role })
    setShowUserModal(true)
  }

  const handleUnblockByEmail = async () => {
    if (!unblockEmail.trim()) return
    try {
      await userService.unblockByEmail(unblockEmail.trim())
      setUnblockEmail('')
      loadAll()
    } catch (e) { alert('Erreur: ' + (e.response?.data?.error || e.message)) }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Chargement...</p></div>

  const s = stats || { total: 0, nouveau: 0, en_cours: 0, termine: 0, total_surface: 0, total_budget: 0, avancement: 0 }

  return (
    <div className="dashboard">
      {/* ── KPI Cards ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><i className="fa-solid fa-road"></i></div>
          <div className="stat-value">{s.total}</div>
          <div className="stat-label">Total signalements</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger"><i className="fa-solid fa-circle-exclamation"></i></div>
          <div className="stat-value">{s.nouveau}</div>
          <div className="stat-label">Nouveaux</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><i className="fa-solid fa-hammer"></i></div>
          <div className="stat-value">{s.en_cours}</div>
          <div className="stat-label">En cours</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><i className="fa-solid fa-circle-check"></i></div>
          <div className="stat-value">{s.termine}</div>
          <div className="stat-label">Terminés</div>
        </div>
      </div>

      {/* ── Recap Table (Nb points, total surface, avancement %, total budget) ── */}
      <div className="card mb-6">
        <div className="card-header">
          <h3><i className="fa-solid fa-table-list" style={{marginRight:8, color:'var(--primary)'}}></i>Récapitulatif</h3>
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

      {/* ── Sync Status + Buttons ── */}
      <div className="card mb-6">
        <div className="card-header">
          <h3><i className="fa-solid fa-cloud" style={{marginRight:8, color:'var(--info)'}}></i>Synchronisation Firebase</h3>
          <div style={{display:'flex', gap:6}}>
            <button className="btn btn-sm btn-secondary" onClick={() => handleSync('push')} disabled={syncLoading}>
              <i className="fa-solid fa-arrow-up"></i> Push
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => handleSync('pull')} disabled={syncLoading}>
              <i className="fa-solid fa-arrow-down"></i> Pull
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => handleSync('bidirectional')} disabled={syncLoading}>
              <i className="fa-solid fa-arrows-rotate"></i> Sync
            </button>
          </div>
        </div>
        <div className="card-body">
          {syncMsg && (
            <div className={`alert alert-${syncMsg.type === 'success' ? 'success' : 'error'} mb-4`}>
              <i className={`fa-solid ${syncMsg.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
              {syncMsg.text}
              <button style={{marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'inherit'}} onClick={() => setSyncMsg(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}
          {syncInfo ? (
            <div className="sync-grid">
              <div><strong>PostgreSQL :</strong> {syncInfo.postgresql_count ?? '—'} signalements</div>
              <div><strong>Firebase :</strong> {syncInfo.firebase_count ?? '—'} signalements</div>
              <div><strong>En sync :</strong> {syncInfo.in_sync
                ? <span className="badge badge-success"><i className="fa-solid fa-check"></i> Oui</span>
                : <span className="badge badge-warning"><i className="fa-solid fa-xmark"></i> Non</span>}
              </div>
              {syncInfo.last_sync && <div><strong>Dernière sync :</strong> {new Date(syncInfo.last_sync).toLocaleString('fr-FR')}</div>}
            </div>
          ) : (
            <p style={{color:'var(--gray-400)', textAlign:'center'}}>Statistiques de sync non disponibles</p>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* ── Users Table ── */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-users" style={{marginRight:8, color:'var(--primary)'}}></i>Utilisateurs</h3>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <span className="badge badge-primary">{users.length}</span>
              <button className="btn btn-sm btn-primary" onClick={openCreateUser}>
                <i className="fa-solid fa-user-plus"></i> Créer
              </button>
            </div>
          </div>

          {/* Débloquer par email */}
          <div style={{padding:'12px 16px', borderBottom:'1px solid var(--gray-100)', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <i className="fa-solid fa-unlock" style={{color:'var(--warning)'}}></i>
            <input
              type="email" placeholder="Débloquer par email..." value={unblockEmail}
              onChange={e => setUnblockEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnblockByEmail()}
              style={{flex:1, minWidth:180, padding:'8px 12px', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', fontSize:13, fontFamily:'inherit'}}
            />
            <button className="btn btn-sm btn-warning" onClick={handleUnblockByEmail} disabled={!unblockEmail.trim()}>
              <i className="fa-solid fa-unlock"></i> Débloquer
            </button>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td style={{fontWeight:500}}>{u.nom}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.role === 'MANAGER' ? 'badge-primary' : 'badge-info'}`}>{u.role}</span></td>
                    <td>
                      {u.compte_bloque
                        ? <span className="badge badge-danger"><i className="fa-solid fa-lock"></i> Bloqué</span>
                        : <span className="badge badge-success"><i className="fa-solid fa-lock-open"></i> Actif</span>}
                    </td>
                    <td>
                      <div style={{display:'flex', gap:4}}>
                        {u.compte_bloque && (
                          <button className="btn btn-sm btn-warning" onClick={() => handleResetBlock(u.id)} title="Débloquer">
                            <i className="fa-solid fa-unlock"></i>
                          </button>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => openEditUser(u)} title="Modifier" style={{color:'var(--primary)'}}>
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDeleteUser(u.id)} title="Supprimer" style={{color:'var(--danger)'}}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', color:'var(--gray-400)'}}>Aucun utilisateur</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Paramètres ── */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-sliders" style={{marginRight:8, color:'var(--warning)'}}></i>Paramètres système</h3>
          </div>
          <div className="card-body">
            {parametres.map(p => (
              <div key={p.cle} className="param-row">
                <div className="param-info">
                  <span className="param-key">{p.cle}</span>
                  <span className="param-desc">{p.description}</span>
                </div>
                <input
                  type="text"
                  defaultValue={p.valeur}
                  className="param-input"
                  onBlur={e => {
                    if (e.target.value !== p.valeur) handleParamUpdate(p.cle, e.target.value)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur()
                  }}
                />
              </div>
            ))}
            {parametres.length === 0 && <p style={{color:'var(--gray-400)', textAlign:'center'}}>Aucun paramètre</p>}
          </div>
        </div>
      </div>

      {/* ── User Create/Edit Modal ── */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:480, width:'95%'}}>
            <h2><i className={`fa-solid ${editingUser ? 'fa-user-pen' : 'fa-user-plus'}`} style={{marginRight:8, color:'var(--primary)'}}></i>{editingUser ? `Modifier ${editingUser.nom}` : 'Créer un utilisateur'}</h2>
            <form onSubmit={handleCreateOrUpdateUser}>
              <div className="form-group">
                <label><i className="fa-regular fa-user"></i> Nom</label>
                <input type="text" value={userForm.nom} onChange={e => setUserForm({...userForm, nom: e.target.value})} placeholder="Nom complet" required />
              </div>
              <div className="form-group">
                <label><i className="fa-regular fa-envelope"></i> Email</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="email@exemple.com" required />
              </div>
              <div className="form-group">
                <label><i className="fa-solid fa-lock"></i> Mot de passe {editingUser && <span style={{color:'var(--gray-400)', fontWeight:400}}>(laisser vide pour ne pas changer)</span>}</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder={editingUser ? 'Laisser vide...' : 'Min. 6 caractères'} {...(!editingUser ? {required: true, minLength: 6} : {})} />
              </div>
              <div className="form-group">
                <label><i className="fa-solid fa-shield-halved"></i> Rôle</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                  <option value="UTILISATEUR">Utilisateur</option>
                  <option value="MANAGER">Manager</option>
                  <option value="VISITEUR">Visiteur</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">
                  <i className={`fa-solid ${editingUser ? 'fa-floppy-disk' : 'fa-user-plus'}`}></i> {editingUser ? 'Sauvegarder' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
