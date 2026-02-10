import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { signalementService, userService } from '../services/api'
import './ManagerView.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/* ── Helper: get photo src (handles data-url and raw base64) ── */
const getPhotoSrc = (photo) => {
  if (photo.base64_data) {
    if (photo.base64_data.startsWith('data:')) return photo.base64_data
    return `data:${photo.mimetype || 'image/jpeg'};base64,${photo.base64_data}`
  }
  return `${API_URL}/uploads/${photo.filename}`
}

/* ── Helper: compress image file to base64 via canvas ── */
const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const base64 = canvas.toDataURL('image/jpeg', quality)
        resolve({
          base64: base64,  // full data URL: data:image/jpeg;base64,...
          filename: file.name,
          mimetype: 'image/jpeg',
          size: Math.round(base64.length * 0.75) // approximate size in bytes
        })
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const ManagerView = () => {
  const { user } = useAuth()
  const [signalements, setSignalements] = useState([])
  const [typesRep, setTypesRep] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)
  const [tab, setTab] = useState('liste') // liste | ajout
  const [selected, setSelected] = useState(null)
  const [formData, setFormData] = useState({
    titre: '', description: '', latitude: '', longitude: '',
    statut: 'NOUVEAU', niveau: 1, surface_m2: '', entreprise: ''
  })
  const [filterStatut, setFilterStatut] = useState('tous')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ROWS_PER_PAGE = 5

  // Photo upload state
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const fileInputRef = useRef(null)
  const detailFileInputRef = useRef(null)

  // Photo viewer
  const [viewingPhoto, setViewingPhoto] = useState(null)

  // Editing mode
  const [editingId, setEditingId] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sigData, typesData] = await Promise.all([
        signalementService.getAll(),
        userService.getTypesReparation().catch(() => ({ types: [] }))
      ])
      setSignalements(sigData.signalements || sigData || [])
      setTypesRep(typesData.types || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // ── Create or Update signalement ──
  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        // Mode édition: mettre à jour (toutes les infos)
        await signalementService.update(editingId, formData)
        if (photoFiles.length > 0) {
          await uploadPhotosBase64(editingId)
        }
      } else {
        // Mode création
        const result = await signalementService.create({
          ...formData,
          utilisateur_id: user?.id || null
        })
        const newId = result.signalement?.id
        if (newId && photoFiles.length > 0) {
          await uploadPhotosBase64(newId)
        }
      }

      setTab('liste')
      setFormData({ titre: '', description: '', latitude: '', longitude: '', statut: 'NOUVEAU', niveau: 1, surface_m2: '', entreprise: '' })
      setEditingId(null)
      setPhotoFiles([])
      setPhotoPreviews([])
      loadData()
    } catch (e) { alert('Erreur: ' + (e.response?.data?.message || e.message)) }
  }

  // ── Upload photos as compressed base64 ──
  const uploadPhotosBase64 = async (signalementId) => {
    setUploadingPhotos(true)
    try {
      const compressed = await Promise.all(photoFiles.map(f => compressImage(f)))
      // Send base64 photos to API
      const response = await fetch(`${API_URL}/api/signalements/${signalementId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ photos: compressed })
      }).then(r => r.json())
      return response
    } catch (e) {
      console.error('Photo upload error:', e)
      alert('Erreur upload photos: ' + e.message)
    } finally {
      setUploadingPhotos(false)
    }
  }

  // ── Handle file selection ──
  const handlePhotoSelect = async (files) => {
    const fileArr = Array.from(files)
    setPhotoFiles(prev => [...prev, ...fileArr])

    // Generate previews
    for (const file of fileArr) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, { name: file.name, src: e.target.result }])
      }
      reader.readAsDataURL(file)
    }
  }

  const removePreview = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // ── Update signalement ──
  const handleUpdate = async (id, updates) => {
    try {
      await signalementService.update(id, updates)
      loadData()
      if (selected?.id === id) {
        const data = await signalementService.getById(id)
        setSelected(data.signalement || data)
      }
    } catch (e) { alert('Erreur: ' + (e.response?.data?.error || e.message)) }
  }

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce signalement ?')) return
    try {
      await signalementService.delete(id)
      loadData()
      if (selected?.id === id) setSelected(null)
    } catch (e) { alert('Erreur: ' + e.message) }
  }

  // ── Upload photos to existing signalement ──
  const handleAddPhotosToExisting = async (files) => {
    if (!selected?.id) return
    setUploadingPhotos(true)
    try {
      const compressed = await Promise.all(Array.from(files).map(f => compressImage(f)))
      await fetch(`${API_URL}/api/signalements/${selected.id}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ photos: compressed })
      })
      // Reload selected signalement
      const data = await signalementService.getById(selected.id)
      setSelected(data.signalement || data)
      loadData()
    } catch (e) {
      alert('Erreur upload: ' + e.message)
    } finally {
      setUploadingPhotos(false)
    }
  }

  // ── Sync ──
  const handleSync = async (type) => {
    setSyncing(true); setSyncMessage(null)
    try {
      let result
      if (type === 'push') result = await signalementService.syncPush()
      else if (type === 'pull') result = await signalementService.syncPull()
      else result = await signalementService.syncBidirectional()
      setSyncMessage({ type: 'success', text: result.message || 'Synchronisation effectuée' })
      loadData()
    } catch (e) { setSyncMessage({ type: 'error', text: e.response?.data?.message || e.message }) }
    finally { setSyncing(false) }
  }

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  // ── Nouveau signalement (reset edit mode) ──
  const startNew = () => {
    setEditingId(null)
    setFormData({ titre: '', description: '', latitude: '', longitude: '', statut: 'NOUVEAU', niveau: 1, surface_m2: '', entreprise: '' })
    setPhotoFiles([])
    setPhotoPreviews([])
    setTab('ajout')
  }

  // ── Modifier un signalement existant ──
  const startEditing = (sig) => {
    setFormData({
      titre: sig.titre || '',
      description: sig.description || '',
      latitude: sig.latitude || '',
      longitude: sig.longitude || '',
      statut: sig.statut || 'NOUVEAU',
      niveau: sig.niveau || 1,
      surface_m2: sig.surface_m2 || '',
      entreprise: sig.entreprise || ''
    })
    setEditingId(sig.id)
    setPhotoFiles([])
    setPhotoPreviews([])
    setTab('ajout')
    setSelected(null)
  }

  // Filter + search
  const filtered = signalements.filter(s => {
    const matchStatut = filterStatut === 'tous' || s.statut === filterStatut
    const matchSearch = !searchQuery ||
      s.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.entreprise?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatut && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const paginatedData = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)

  // Reset page quand les filtres changent
  useEffect(() => { setCurrentPage(1) }, [filterStatut, searchQuery])

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Chargement...</p></div>

  return (
    <div className="manager-page">
      {/* ── Toolbar ── */}
      <div className="manager-toolbar">
        <div className="toolbar-left">
          <button className={`tab-btn ${tab === 'liste' ? 'active' : ''}`} onClick={() => { setTab('liste'); setSelected(null) }}>
            <i className="fa-solid fa-list"></i> Liste
          </button>
          <button className={`tab-btn ${tab === 'ajout' ? 'active' : ''}`} onClick={startNew}>
            <i className="fa-solid fa-plus"></i> Nouveau
          </button>
        </div>
        <div className="toolbar-right">
          <div className="sync-buttons">
            <button className="btn btn-sm btn-secondary" onClick={() => handleSync('push')} disabled={syncing}>
              <i className="fa-solid fa-arrow-up"></i> Push
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => handleSync('pull')} disabled={syncing}>
              <i className="fa-solid fa-arrow-down"></i> Pull
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => handleSync('bidirectional')} disabled={syncing}>
              <i className="fa-solid fa-arrows-rotate"></i> Sync
            </button>
          </div>
        </div>
      </div>

      {syncMessage && (
        <div className={`alert alert-${syncMessage.type === 'success' ? 'success' : 'error'} mb-4`}>
          <i className={`fa-solid ${syncMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          {syncMessage.text}
          <button style={{marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'inherit'}} onClick={() => setSyncMessage(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* ── Create Form ── */}
      {tab === 'ajout' && (
        <div className="card mb-6">
          <div className="card-header"><h3><i className={`fa-solid ${editingId ? 'fa-pen' : 'fa-plus-circle'}`} style={{marginRight:8}}></i>{editingId ? `Modifier signalement #${editingId}` : 'Nouveau signalement'}</h3></div>
          <div className="card-body">
            <form onSubmit={handleCreate} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label><i className="fa-solid fa-tag"></i> Titre</label>
                  <input name="titre" value={formData.titre} onChange={handleFormChange} placeholder="Titre du signalement" required />
                </div>
                <div className="form-group">
                  <label><i className="fa-solid fa-signal"></i> Statut</label>
                  <select name="statut" value={formData.statut} onChange={handleFormChange}>
                    <option value="NOUVEAU">Nouveau</option>
                    <option value="EN_COURS">En cours</option>
                    <option value="TERMINE">Terminé</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label><i className="fa-solid fa-align-left"></i> Description</label>
                <textarea name="description" value={formData.description} onChange={handleFormChange} rows="3" placeholder="Description détaillée..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label><i className="fa-solid fa-map-pin"></i> Latitude</label>
                  <input name="latitude" type="number" step="any" value={formData.latitude} onChange={handleFormChange} placeholder="-18.91" required />
                </div>
                <div className="form-group">
                  <label><i className="fa-solid fa-map-pin"></i> Longitude</label>
                  <input name="longitude" type="number" step="any" value={formData.longitude} onChange={handleFormChange} placeholder="47.52" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label><i className="fa-solid fa-layer-group"></i> Niveau (1-10)</label>
                  <select name="niveau" value={formData.niveau} onChange={handleFormChange}>
                    {typesRep.length > 0
                      ? typesRep.map(t => <option key={t.id} value={t.niveau}>{t.niveau} — {t.nom}</option>)
                      : [1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)
                    }
                  </select>
                </div>
                <div className="form-group">
                  <label><i className="fa-solid fa-ruler-combined"></i> Surface (m²)</label>
                  <input name="surface_m2" type="number" step="0.01" value={formData.surface_m2} onChange={handleFormChange} placeholder="50" />
                </div>
              </div>
              <div className="form-group">
                <label><i className="fa-solid fa-building"></i> Entreprise</label>
                <input name="entreprise" value={formData.entreprise} onChange={handleFormChange} placeholder="Nom de l'entreprise (optionnel)" />
              </div>

              {/* ── Photo Upload ── */}
              <div className="form-group">
                <label><i className="fa-solid fa-camera"></i> Photos (compressées automatiquement)</label>
                <div className="photo-upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <p>Cliquez ou glissez des images ici</p>
                  <span>JPEG, PNG, WebP — max 5 Mo chacune</span>
                </div>
                <input
                  ref={fileInputRef} type="file" accept="image/*" multiple hidden
                  onChange={(e) => handlePhotoSelect(e.target.files)}
                />
                {photoPreviews.length > 0 && (
                  <div className="photo-previews">
                    {photoPreviews.map((p, i) => (
                      <div key={i} className="preview-item">
                        <img src={p.src} alt={p.name} />
                        <button type="button" className="preview-remove" onClick={() => removePreview(i)}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                        <div className="preview-name">{p.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{display:'flex', gap:12}}>
                <button type="submit" className="btn btn-primary" disabled={uploadingPhotos}>
                  {uploadingPhotos
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Upload en cours...</>
                    : <><i className="fa-solid fa-floppy-disk"></i> {editingId ? 'Sauvegarder' : 'Créer'}</>}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setTab('liste'); setEditingId(null); setPhotoFiles([]); setPhotoPreviews([]) }}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {tab === 'liste' && !selected && (
        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-road" style={{marginRight:8, color:'var(--primary)'}}></i>Signalements</h3>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <div className="header-search" style={{minWidth:180}}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select
                value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                style={{padding:'8px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--gray-200)', fontSize:13, color:'var(--gray-600)'}}
              >
                <option value="tous">Tous ({signalements.length})</option>
                <option value="NOUVEAU">Nouveaux</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminés</option>
              </select>
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th>Niveau</th>
                  <th>Surface</th>
                  <th>Budget</th>
                  <th>Entreprise</th>
                  <th>Utilisateur</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map(s => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td style={{fontWeight:500, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.titre}</td>
                    <td>
                      <span className={`badge badge-${s.statut === 'TERMINE' ? 'success' : s.statut === 'EN_COURS' ? 'warning' : 'danger'}`}>
                        {s.statut === 'TERMINE' ? 'Terminé' : s.statut === 'EN_COURS' ? 'En cours' : 'Nouveau'}
                      </span>
                    </td>
                    <td><span className="badge badge-info">{s.niveau || 1}/10</span></td>
                    <td>{s.surface_m2 ? `${s.surface_m2} m²` : '—'}</td>
                    <td>{s.budget ? `${Number(s.budget).toLocaleString('fr-FR')} Ar` : '—'}</td>
                    <td>{s.entreprise || '—'}</td>
                    <td>{s.utilisateur_nom || '—'}</td>
                    <td>{s.date_creation ? new Date(s.date_creation).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>
                      <div style={{display:'flex', gap:6}}>
                        <button className="btn btn-sm btn-ghost" onClick={() => { setSelected(s); setTab('liste') }} title="Détails">
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => startEditing(s)} title="Modifier" style={{color:'var(--primary)'}}>
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(s.id)} title="Supprimer" style={{color:'var(--danger)'}}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="10" style={{textAlign:'center', padding:40, color:'var(--gray-400)'}}>
                    <i className="fa-solid fa-road" style={{fontSize:32, marginBottom:8, display:'block'}}></i>
                    Aucun signalement trouvé
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* ── Pagination ── */}
          {filtered.length > ROWS_PER_PAGE && (
            <div className="table-pagination">
              <button
                className="btn btn-sm btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <i className="fa-solid fa-chevron-left"></i> Précédent
              </button>
              <span className="pagination-info">
                Page <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
                <span className="pagination-total">({filtered.length} résultats)</span>
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Suivant <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Detail View ── */}
      {tab === 'liste' && selected && (
        <div className="card">
          <div className="card-header">
            <h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{marginRight:8}}>
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              {selected.titre}
            </h3>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-sm btn-secondary" onClick={() => startEditing(selected)} title="Modifier toutes les infos">
                <i className="fa-solid fa-pen"></i> Éditer
              </button>
              <select
                value={selected.statut}
                onChange={e => handleUpdate(selected.id, { statut: e.target.value })}
                style={{padding:'6px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--gray-200)', fontSize:13}}
              >
                <option value="NOUVEAU">Nouveau</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminé</option>
              </select>
              <button className="btn btn-sm btn-danger" onClick={() => { handleDelete(selected.id); setSelected(null) }}>
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label"><i className="fa-solid fa-align-left"></i> Description</span>
                <p>{selected.description || 'Aucune description'}</p>
              </div>
              <div className="detail-item">
                <span className="detail-label"><i className="fa-solid fa-map-pin"></i> Coordonnées</span>
                <p>{selected.latitude}, {selected.longitude}</p>
              </div>
              <div className="detail-item">
                <span className="detail-label"><i className="fa-solid fa-layer-group"></i> Niveau</span>
                <p><strong>{selected.niveau || 1}</strong>/10</p>
              </div>
              <div className="detail-item">
                <span className="detail-label"><i className="fa-solid fa-ruler-combined"></i> Surface</span>
                <p>{selected.surface_m2 ? `${selected.surface_m2} m²` : '—'}</p>
              </div>
              <div className="detail-item">
                <span className="detail-label"><i className="fa-solid fa-coins"></i> Prix/m²</span>
                <p>{selected.prix_par_m2 ? `${Number(selected.prix_par_m2).toLocaleString('fr-FR')} Ar` : '—'}</p>
              </div>
              <div className="detail-item highlight">
                <span className="detail-label"><i className="fa-solid fa-calculator"></i> Budget total</span>
                <p className="budget-value">{selected.budget ? `${Number(selected.budget).toLocaleString('fr-FR')} Ar` : '—'}</p>
              </div>
              <div className="detail-item">
                <span className="detail-label"><i className="fa-solid fa-building"></i> Entreprise</span>
                <p>{selected.entreprise || '—'}</p>
              </div>
              <div className="detail-item">
                <span className="detail-label"><i className="fa-regular fa-user"></i> Signalé par</span>
                <p>{selected.utilisateur_nom || '—'} {selected.utilisateur_email ? `(${selected.utilisateur_email})` : ''}</p>
              </div>
              <div className="detail-item">
                <span className="detail-label"><i className="fa-regular fa-calendar"></i> Dates</span>
                <p>
                  Création: {selected.date_creation ? new Date(selected.date_creation).toLocaleDateString('fr-FR') : '—'}<br/>
                  {selected.date_en_cours && <>En cours: {new Date(selected.date_en_cours).toLocaleDateString('fr-FR')}<br/></>}
                  {selected.date_termine && <>Terminé: {new Date(selected.date_termine).toLocaleDateString('fr-FR')}</>}
                </p>
              </div>
            </div>

            {/* ── Photos Section ── */}
            <div className="photos-section">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h4><i className="fa-solid fa-images"></i> Photos ({selected.photos?.filter(p => p.id)?.length || 0})</h4>
                <div>
                  <button className="btn btn-sm btn-secondary" onClick={() => detailFileInputRef.current?.click()}>
                    <i className="fa-solid fa-plus"></i> Ajouter des photos
                  </button>
                  <input
                    ref={detailFileInputRef} type="file" accept="image/*" multiple hidden
                    onChange={(e) => handleAddPhotosToExisting(e.target.files)}
                  />
                </div>
              </div>
              {uploadingPhotos && (
                <div className="alert alert-info mt-4">
                  <i className="fa-solid fa-spinner fa-spin"></i> Compression et upload en cours...
                </div>
              )}
              {selected.photos && selected.photos.length > 0 && selected.photos[0]?.id ? (
                <div className="photos-grid">
                  {selected.photos.filter(p => p.id).map((p, i) => (
                    <div key={p.id || i} className="photo-thumb" onClick={() => setViewingPhoto(p)}>
                      <img
                        src={getPhotoSrc(p)}
                        alt={p.filename || `Photo ${i+1}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color:'var(--gray-400)', textAlign:'center', padding:20}}>Aucune photo</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Viewer Modal ── */}
      {viewingPhoto && (
        <div className="modal-overlay" onClick={() => setViewingPhoto(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:800, width:'95%', padding:16}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <h2 style={{fontSize:16}}>{viewingPhoto.filename || 'Photo'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewingPhoto(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <img
              src={getPhotoSrc(viewingPhoto)}
              alt={viewingPhoto.filename}
              style={{width:'100%', maxHeight:'70vh', objectFit:'contain', borderRadius:'var(--radius-sm)'}}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerView
