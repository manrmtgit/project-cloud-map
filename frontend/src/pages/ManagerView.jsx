import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { signalementService } from '../services/signalement.api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';
import './ManagerView.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ManagerView = () => {
  const { user, logout } = useAuth();
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignalement, setSelectedSignalement] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  
  // État pour les photos
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const fileInputRef = useRef(null);
  
  // État pour Firebase sync
  const [firebaseSync, setFirebaseSync] = useState({
    pushing: false,
    pulling: false,
    bidirectional: false,
    lastSync: null,
    stats: null
  });
  
  // État pour les statistiques détaillées
  const [detailedStats, setDetailedStats] = useState(null);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  
  // État pour les notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // État pour le formulaire d'ajout
  const [showAddForm, setShowAddForm] = useState(false);
  const [quartiers, setQuartiers] = useState([]);
  const [addFormData, setAddFormData] = useState({
    titre: '',
    description: '',
    latitude: '',
    longitude: '',
    surface_m2: '',
    budget: '',
    entreprise: ''
  });
  const [addPhotos, setAddPhotos] = useState([]);
  const [suggesting, setSuggesting] = useState(false);

  const statusOptions = ['NOUVEAU', 'EN_COURS', 'TERMINE'];

  useEffect(() => {
    loadSignalements();
    loadDetailedStats();
    loadFirebaseSyncStats();
    if (user?.id) {
      loadNotifications();
    }
  }, [user]);

  const loadSignalements = async () => {
    try {
      setLoading(true);
      const userId = showMyOnly && user?.id ? user.id : null;
      const data = await signalementService.getAll(null, userId);
      setSignalements(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedStats = async () => {
    try {
      const stats = await signalementService.getDetailedStats();
      setDetailedStats(stats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await signalementService.getNotifications(user.id);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await signalementService.markAllNotificationsRead(user.id);
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, lu: true })));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await loadSignalements();
      await loadDetailedStats();
      if (user?.id) await loadNotifications();
      alert('Synchronisation locale réussie !');
    } catch (error) {
      alert('Erreur lors de la synchronisation locale');
    } finally {
      setSyncing(false);
    }
  };

  // === FIREBASE SYNC FUNCTIONS ===
  const handleFirebasePush = async () => {
    setFirebaseSync(prev => ({ ...prev, pushing: true }));
    try {
      const result = await signalementService.pushToFirebase();
      alert(`✅ Envoi Firebase réussi !\n${result.message}`);
      await loadFirebaseSyncStats();
    } catch (error) {
      console.error('Erreur push Firebase:', error);
      alert('❌ Erreur lors de l\'envoi vers Firebase');
    } finally {
      setFirebaseSync(prev => ({ ...prev, pushing: false }));
    }
  };

  const handleFirebasePull = async () => {
    setFirebaseSync(prev => ({ ...prev, pulling: true }));
    try {
      const result = await signalementService.pullFromFirebase();
      alert(`✅ Récupération Firebase réussie !\n${result.message}`);
      await loadSignalements();
      await loadFirebaseSyncStats();
    } catch (error) {
      console.error('Erreur pull Firebase:', error);
      alert('❌ Erreur lors de la récupération depuis Firebase');
    } finally {
      setFirebaseSync(prev => ({ ...prev, pulling: false }));
    }
  };

  const handleFirebaseBidirectional = async () => {
    setFirebaseSync(prev => ({ ...prev, bidirectional: true }));
    try {
      const result = await signalementService.syncBidirectional();
      alert(`✅ Synchronisation bidirectionnelle réussie !`);
      await loadSignalements();
      await loadFirebaseSyncStats();
    } catch (error) {
      console.error('Erreur sync bidirectionnelle:', error);
      alert('❌ Erreur lors de la synchronisation bidirectionnelle');
    } finally {
      setFirebaseSync(prev => ({ ...prev, bidirectional: false }));
    }
  };

  const loadFirebaseSyncStats = async () => {
    try {
      const result = await signalementService.getSyncStatus();
      setFirebaseSync(prev => ({ 
        ...prev, 
        stats: result.stats,
        lastSync: new Date().toLocaleString()
      }));
    } catch (error) {
      console.error('Erreur stats Firebase:', error);
    }
  };

  const handleEdit = (signalement) => {
    setSelectedSignalement(signalement);
    setEditData({
      titre: signalement.titre,
      description: signalement.description,
      statut: signalement.statut,
      surface_m2: signalement.surface_m2 || '',
      budget: signalement.budget || '',
      entreprise: signalement.entreprise || ''
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      await signalementService.update(selectedSignalement.id, {
        ...editData,
        user_id_modifier: user?.id
      });
      await loadSignalements();
      setEditMode(false);
      setSelectedSignalement(null);
      alert('Signalement mis à jour !');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  // Upload de photos
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedPhotos(files);
  };

  const handlePhotoUpload = async () => {
    if (!selectedSignalement || selectedPhotos.length === 0) return;
    
    setUploadingPhotos(true);
    try {
      await signalementService.uploadPhotos(selectedSignalement.id, selectedPhotos);
      setSelectedPhotos([]);
      await loadSignalements();
      // Recharger le signalement sélectionné
      const updated = await signalementService.getById(selectedSignalement.id);
      setSelectedSignalement(updated);
      alert('Photos ajoutées avec succès !');
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload des photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    try {
      await signalementService.deletePhoto(photoId);
      const updated = await signalementService.getById(selectedSignalement.id);
      setSelectedSignalement(updated);
    } catch (error) {
      console.error('Erreur suppression photo:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce signalement ?')) {
      try {
        await signalementService.delete(id);
        await loadSignalements();
        setSelectedSignalement(null);
        alert('Signalement supprimé !');
      } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  // Calcul de l'avancement
  const getAvancement = (statut) => {
    switch (statut) {
      case 'NOUVEAU': return 0;
      case 'EN_COURS': return 50;
      case 'TERMINE': return 100;
      default: return 0;
    }
  };

  // Gestion du formulaire d'ajout
  const handleSuggestCoordinates = async () => {
    setSuggesting(true);
    try {
      const data = await signalementService.suggestCoordinates();
      if (data.success) {
        setAddFormData(prev => ({
          ...prev,
          latitude: data.suggestion.latitude,
          longitude: data.suggestion.longitude,
          titre: prev.titre || `Signalement - ${data.suggestion.quartier}`
        }));
        setQuartiers(data.quartiers || []);
      }
    } catch (error) {
      console.error('Erreur suggestion:', error);
      alert('Erreur lors de la suggestion de coordonnées');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSelectQuartier = (quartier) => {
    // Ajouter une petite variation aléatoire
    const latOffset = (Math.random() - 0.5) * 0.003;
    const lngOffset = (Math.random() - 0.5) * 0.003;
    setAddFormData(prev => ({
      ...prev,
      latitude: (quartier.latitude + latOffset).toFixed(6),
      longitude: (quartier.longitude + lngOffset).toFixed(6),
      titre: prev.titre || `Signalement - ${quartier.nom}`
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addFormData.titre || !addFormData.latitude || !addFormData.longitude) {
      alert('Veuillez remplir le titre et les coordonnées');
      return;
    }
    try {
      const newSignalement = await signalementService.create({
        ...addFormData,
        latitude: parseFloat(addFormData.latitude),
        longitude: parseFloat(addFormData.longitude),
        surface_m2: addFormData.surface_m2 ? parseFloat(addFormData.surface_m2) : null,
        budget: addFormData.budget ? parseFloat(addFormData.budget) : null,
        user_id: user?.id
      });
      
      // Upload des photos si présentes
      if (addPhotos.length > 0 && newSignalement?.id) {
        await signalementService.uploadPhotos(newSignalement.id, addPhotos);
      }
      
      await loadSignalements();
      setShowAddForm(false);
      setAddFormData({
        titre: '',
        description: '',
        latitude: '',
        longitude: '',
        surface_m2: '',
        budget: '',
        entreprise: ''
      });
      setAddPhotos([]);
      setQuartiers([]);
      alert('Signalement créé avec succès !');
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur lors de la création du signalement');
    }
  };

  const getStatusBadge = (statut) => {
    const classes = {
      'NOUVEAU': 'status-nouveau',
      'EN_COURS': 'status-en-cours',
      'TERMINE': 'status-termine'
    };
    const labels = {
      'NOUVEAU': 'Nouveau',
      'EN_COURS': 'En cours',
      'TERMINE': 'Terminé'
    };
    return <span className={`status-badge ${classes[statut] || ''}`}>{labels[statut] || statut}</span>;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSignalements = signalements.filter(s => {
    if (filter === 'all') return true;
    return s.statut === filter;
  });

  if (loading) {
    return (
      <Layout user={user} onLogout={logout} title="Interface Manager">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={logout} title="Interface Manager" showHeader={false}>
    <div className="manager-view">
      {/* Header */}
      <header className="manager-header">
        <div className="header-left">
          <h1>🛠️ Interface Manager</h1>
          <span className="badge">Manager</span>
          {user && <span className="user-info">👤 {user.name || user.email}</span>}
        </div>
        <div className="header-right">
          <button 
            className="btn-add"
            onClick={() => setShowAddForm(true)}
          >
            ➕ Nouveau signalement
          </button>
          <Link to="/stats" className="btn-stats-page">
            📊 Statistiques
          </Link>
          <button 
            className="btn-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔 {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
          
          <Link to="/" className="btn-back">
            ← Retour à la carte
          </Link>
          <button className="btn-logout" onClick={logout}>
            🚪 Déconnexion
          </button>
        </div>
      </header>

      {/* Panel de notifications */}
      {showNotifications && (
        <div className="notifications-panel">
          <div className="notif-header">
            <h3>🔔 Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="btn-mark-read">
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <p className="no-notif">Aucune notification</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item ${n.lu ? '' : 'unread'}`}>
                  <span className="notif-message">{n.message}</span>
                  <span className="notif-date">{formatDate(n.date_creation)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Panel de statistiques détaillées */}
      {showStatsPanel && detailedStats && (
        <div className="stats-panel-detailed">
          <h3>📊 Tableau de Statistiques - Délais de Traitement</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>⏱️ Délai Moyen Total</h4>
              <p className="stat-value">{detailedStats.delais?.moyen_total_jours || 'N/A'} jours</p>
            </div>
            <div className="stat-card">
              <h4>🚀 Délai Démarrage</h4>
              <p className="stat-value">{detailedStats.delais?.demarrage_moyen_jours || 'N/A'} jours</p>
              <p className="stat-desc">Du signalement au démarrage</p>
            </div>
            <div className="stat-card">
              <h4>🔧 Délai Travaux</h4>
              <p className="stat-value">{detailedStats.delais?.travaux_moyen_jours || 'N/A'} jours</p>
              <p className="stat-desc">Du démarrage à la fin</p>
            </div>
            <div className="stat-card">
              <h4>📈 Min / Max</h4>
              <p className="stat-value">{detailedStats.delais?.min_jours || 'N/A'} - {detailedStats.delais?.max_jours || 'N/A'} jours</p>
            </div>
          </div>
          
          {detailedStats.par_entreprise && (
            <div className="stats-table">
              <h4>🏢 Performance par Entreprise</h4>
              <table>
                <thead>
                  <tr>
                    <th>Entreprise</th>
                    <th>Total</th>
                    <th>Terminés</th>
                    <th>Délai Moyen</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedStats.par_entreprise.map((e, i) => (
                    <tr key={i}>
                      <td>{e.entreprise}</td>
                      <td>{e.total}</td>
                      <td>{e.termines}</td>
                      <td>{e.delai_moyen ? `${parseFloat(e.delai_moyen).toFixed(1)} j` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal d'ajout de signalement */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content add-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Nouveau signalement</h2>
              <button className="btn-close" onClick={() => setShowAddForm(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="add-form">
              <div className="form-group">
                <label>Titre *</label>
                <input
                  type="text"
                  value={addFormData.titre}
                  onChange={(e) => setAddFormData({...addFormData, titre: e.target.value})}
                  placeholder="Ex: Nid de poule rue..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={addFormData.description}
                  onChange={(e) => setAddFormData({...addFormData, description: e.target.value})}
                  rows={3}
                  placeholder="Décrivez le problème..."
                />
              </div>

              <div className="coordinates-section">
                <div className="coordinates-header">
                  <label>📍 Coordonnées *</label>
                  <button 
                    type="button" 
                    className="btn-suggest"
                    onClick={handleSuggestCoordinates}
                    disabled={suggesting}
                  >
                    {suggesting ? '⏳ Recherche...' : '🎯 Suggérer automatiquement'}
                  </button>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={addFormData.latitude}
                      onChange={(e) => setAddFormData({...addFormData, latitude: e.target.value})}
                      placeholder="-18.9100"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={addFormData.longitude}
                      onChange={(e) => setAddFormData({...addFormData, longitude: e.target.value})}
                      placeholder="47.5250"
                      required
                    />
                  </div>
                </div>

                {quartiers.length > 0 && (
                  <div className="quartiers-grid">
                    <label>Ou choisissez un quartier :</label>
                    <div className="quartiers-buttons">
                      {quartiers.map(q => (
                        <button
                          key={q.nom}
                          type="button"
                          className="btn-quartier"
                          onClick={() => handleSelectQuartier(q)}
                        >
                          📍 {q.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Surface (m²)</label>
                  <input
                    type="number"
                    value={addFormData.surface_m2}
                    onChange={(e) => setAddFormData({...addFormData, surface_m2: e.target.value})}
                    placeholder="Ex: 50"
                  />
                </div>
                <div className="form-group">
                  <label>Budget (Ar)</label>
                  <input
                    type="number"
                    value={addFormData.budget}
                    onChange={(e) => setAddFormData({...addFormData, budget: e.target.value})}
                    placeholder="Ex: 5000000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Entreprise assignée</label>
                <input
                  type="text"
                  value={addFormData.entreprise}
                  onChange={(e) => setAddFormData({...addFormData, entreprise: e.target.value})}
                  placeholder="Nom de l'entreprise (optionnel)"
                />
              </div>

              <div className="form-group">
                <label>📷 Photos (optionnel)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setAddPhotos(Array.from(e.target.files))}
                />
                {addPhotos.length > 0 && (
                  <p className="photos-count">{addPhotos.length} photo(s) sélectionnée(s)</p>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-save">
                  ✅ Créer le signalement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="manager-content">
        {/* Left Panel - List */}
        <div className="list-panel">
          <div className="panel-header">
            <h2>Signalements ({filteredSignalements.length})</h2>
            <div className="filters-row">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tous les statuts</option>
                <option value="NOUVEAU">Nouveau</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminé</option>
              </select>
              <label className="checkbox-filter">
                <input 
                  type="checkbox" 
                  checked={showMyOnly}
                  onChange={(e) => {
                    setShowMyOnly(e.target.checked);
                    // Recharger avec le nouveau filtre
                    setTimeout(loadSignalements, 0);
                  }}
                />
                Mes signalements uniquement
              </label>
            </div>
          </div>
          
          <div className="signalement-list">
            {filteredSignalements.map(s => (
              <div 
                key={s.id} 
                className={`signalement-card ${selectedSignalement?.id === s.id ? 'selected' : ''}`}
                onClick={() => { setSelectedSignalement(s); setEditMode(false); }}
              >
                <div className="card-header">
                  <span className="card-id">#{s.id}</span>
                  <span className="card-avancement">{s.avancement || getAvancement(s.statut)}%</span>
                  {getStatusBadge(s.statut)}
                </div>
                <p className="card-description">{s.description}</p>
                <div className="card-meta">
                  <span>📅 {formatDate(s.date_signalement)}</span>
                  {s.surface && <span>📐 {s.surface} m²</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className="detail-panel">
          {selectedSignalement ? (
            editMode ? (
              // Edit Mode
              <div className="edit-form">
                <h2>Modifier le signalement #{selectedSignalement.id}</h2>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label>Statut</label>
                  <select
                    value={editData.statut}
                    onChange={(e) => setEditData({...editData, statut: e.target.value})}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt} value={opt}>
                        {opt === 'NOUVEAU' ? 'Nouveau' : opt === 'EN_COURS' ? 'En cours' : 'Terminé'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Surface (m²)</label>
                    <input
                      type="number"
                      value={editData.surface_m2 || ''}
                      onChange={(e) => setEditData({...editData, surface_m2: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Budget (Ar)</label>
                    <input
                      type="number"
                      value={editData.budget || ''}
                      onChange={(e) => setEditData({...editData, budget: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Entreprise assignée</label>
                  <input
                    type="text"
                    value={editData.entreprise || ''}
                    onChange={(e) => setEditData({...editData, entreprise: e.target.value})}
                    placeholder="Nom de l'entreprise"
                  />
                </div>

                <div className="form-actions">
                  <button className="btn-cancel" onClick={() => setEditMode(false)}>
                    Annuler
                  </button>
                  <button className="btn-save" onClick={handleSave}>
                    💾 Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="detail-view">
                <div className="detail-header">
                  <h2>Signalement #{selectedSignalement.id}</h2>
                  {getStatusBadge(selectedSignalement.statut)}
                </div>

                <div className="detail-section">
                  <h3>📝 Description</h3>
                  <p>{selectedSignalement.description}</p>
                </div>

                <div className="detail-section">
                  <h3>📍 Localisation</h3>
                  <p>
                    Lat: {parseFloat(selectedSignalement.latitude).toFixed(6)}<br />
                    Lng: {parseFloat(selectedSignalement.longitude).toFixed(6)}
                  </p>
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">📅 Date signalement</span>
                    <span className="value">{formatDate(selectedSignalement.date_creation)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">📐 Surface</span>
                    <span className="value">{selectedSignalement.surface_m2 ? `${selectedSignalement.surface_m2} m²` : 'Non défini'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">💰 Budget</span>
                    <span className="value">{selectedSignalement.budget ? `${parseInt(selectedSignalement.budget).toLocaleString()} Ar` : 'Non défini'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">🏢 Entreprise</span>
                    <span className="value">{selectedSignalement.entreprise || 'Non assigné'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">📊 Avancement</span>
                    <span className="value avancement-badge">{selectedSignalement.avancement || getAvancement(selectedSignalement.statut)}%</span>
                  </div>
                </div>

                {/* Section dates d'avancement */}
                <div className="detail-section">
                  <h3>📆 Historique d'avancement</h3>
                  <div className="dates-timeline">
                    <div className={`date-step ${selectedSignalement.date_nouveau ? 'completed' : ''}`}>
                      <span className="step-label">Nouveau (0%)</span>
                      <span className="step-date">{selectedSignalement.date_nouveau ? formatDate(selectedSignalement.date_nouveau) : '-'}</span>
                    </div>
                    <div className={`date-step ${selectedSignalement.date_en_cours ? 'completed' : ''}`}>
                      <span className="step-label">En cours (50%)</span>
                      <span className="step-date">{selectedSignalement.date_en_cours ? formatDate(selectedSignalement.date_en_cours) : '-'}</span>
                    </div>
                    <div className={`date-step ${selectedSignalement.date_termine ? 'completed' : ''}`}>
                      <span className="step-label">Terminé (100%)</span>
                      <span className="step-date">{selectedSignalement.date_termine ? formatDate(selectedSignalement.date_termine) : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Section Photos */}
                <div className="detail-section">
                  <h3>📷 Photos ({selectedSignalement.photos?.length || 0})</h3>
                  
                  {/* Galerie de photos existantes */}
                  {selectedSignalement.photos && selectedSignalement.photos.length > 0 ? (
                    <div className="photos-gallery">
                      {selectedSignalement.photos.map((photo, idx) => (
                        <div key={photo.id || idx} className="photo-item">
                          <img 
                            src={`${API_URL}/uploads/${photo.filename || photo.nom_fichier}`} 
                            alt={`Photo ${idx + 1}`}
                            onClick={() => window.open(`${API_URL}/uploads/${photo.filename || photo.nom_fichier}`, '_blank')}
                          />
                          <button 
                            className="btn-delete-photo"
                            onClick={() => handleDeletePhoto(photo.id)}
                            title="Supprimer cette photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-photos">Aucune photo pour ce signalement</p>
                  )}

                  {/* Upload de nouvelles photos */}
                  <div className="photo-upload-section">
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      style={{ display: 'none' }}
                    />
                    <button 
                      className="btn-upload"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📁 Sélectionner des photos
                    </button>
                    {selectedPhotos.length > 0 && (
                      <div className="selected-photos-info">
                        <span>{selectedPhotos.length} photo(s) sélectionnée(s)</span>
                        <button 
                          className="btn-confirm-upload"
                          onClick={handlePhotoUpload}
                          disabled={uploadingPhotos}
                        >
                          {uploadingPhotos ? '⏳ Upload...' : '✅ Confirmer l\'upload'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-actions">
                  <button className="btn-edit" onClick={() => handleEdit(selectedSignalement)}>
                    ✏️ Modifier
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(selectedSignalement.id)}>
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="no-selection">
              <div className="placeholder-icon">📋</div>
              <h3>Sélectionnez un signalement</h3>
              <p>Cliquez sur un signalement dans la liste pour voir ses détails ou le modifier.</p>
            </div>
          )}
        </div>

        {/* Section Firebase Synchronisation */}
        <div className="firebase-sync-panel">
          <div className="sync-header">
            <div className="sync-title">
              <span className="sync-icon">🌐</span>
              <h2>Synchronisation Mobile</h2>
              <span className="sync-subtitle">Gérer la synchronisation avec Firebase</span>
            </div>
          </div>

          <div className="sync-content">
            {/* Statut actuel */}
            <div className="sync-status-card">
              <h3>📊 État Actuel</h3>
              <div className="status-info">
                <div className="status-item">
                  <span className="status-label">Base de Données</span>
                  <span className="status-value">PostgreSQL</span>
                  <span className="status-count">{filteredSignalements.length}</span>
                  <span className="status-sublabel">signalements</span>
                </div>
                <div className="status-arrow">⟷</div>
                <div className="status-item">
                  <span className="status-label">Mobile (Firebase)</span>
                  <span className="status-value">Firestore</span>
                  <span className="status-count">{firebaseSync.stats?.firebase_count || 0}</span>
                  <span className="status-sublabel">signalements</span>
                </div>
              </div>
              {firebaseSync.lastSync && (
                <div className="sync-timestamp">
                  <span className="timestamp-icon">⏱️</span>
                  <p>Dernière synchro: <strong>{firebaseSync.lastSync}</strong></p>
                </div>
              )}
              <div className="sync-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{width: `${firebaseSync.stats?.firebase_count && filteredSignalements.length ? Math.min((firebaseSync.stats.firebase_count / filteredSignalements.length) * 100, 100) : 0}%`}}
                  ></div>
                </div>
                <span className="progress-label">
                  {firebaseSync.stats?.firebase_count && filteredSignalements.length 
                    ? `${Math.round((firebaseSync.stats.firebase_count / filteredSignalements.length) * 100)}% synchronisés`
                    : 'Aucun élément synchronisé'
                  }
                </span>
              </div>
            </div>

            {/* Boutons de synchronisation */}
            <div className="sync-actions">
              <div className="sync-button-group">
                <button 
                  className={`sync-btn sync-btn-push ${firebaseSync.pushing ? 'syncing' : ''}`}
                  onClick={handleFirebasePush}
                  disabled={firebaseSync.pushing}
                  title="Envoyer tous les signalements vers Firebase"
                >
                  <svg className="sync-btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 2.25m0 0l4.5 4.5M12 2.25l-4.5 4.5"/>
                  </svg>
                  <span className="sync-btn-text">
                    <span className="sync-btn-title">Envoyer</span>
                    <span className="sync-btn-desc">vers Firebase</span>
                  </span>
                  {firebaseSync.pushing && <span className="spinner-mini"></span>}
                </button>

                <button 
                  className={`sync-btn sync-btn-pull ${firebaseSync.pulling ? 'syncing' : ''}`}
                  onClick={handleFirebasePull}
                  disabled={firebaseSync.pulling}
                  title="Récupérer tous les signalements depuis Firebase"
                >
                  <svg className="sync-btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7.5V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25v2.25m-13.5 9L12 21.75m0 0l4.5-4.5M12 21.75l-4.5-4.5"/>
                  </svg>
                  <span className="sync-btn-text">
                    <span className="sync-btn-title">Récupérer</span>
                    <span className="sync-btn-desc">depuis Firebase</span>
                  </span>
                  {firebaseSync.pulling && <span className="spinner-mini"></span>}
                </button>

                <button 
                  className={`sync-btn sync-btn-sync ${firebaseSync.bidirectional ? 'syncing' : ''}`}
                  onClick={handleFirebaseBidirectional}
                  disabled={firebaseSync.bidirectional}
                  title="Synchronisation bidirectionnelle complète"
                >
                  <svg className="sync-btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6M21 17v-6h-6"/>
                    <path d="M17 3a4 4 0 0 0-4 4v4m4 8a4 4 0 0 1-4-4v-4M7 21a4 4 0 0 1 4-4v-4m-4-8a4 4 0 0 0 4 4v4"/>
                  </svg>
                  <span className="sync-btn-text">
                    <span className="sync-btn-title">Synchroniser</span>
                    <span className="sync-btn-desc">Bidirectionnelle</span>
                  </span>
                  {firebaseSync.bidirectional && <span className="spinner-mini"></span>}
                </button>
              </div>
            </div>

            {/* Info Firebase */}
            <div className="firebase-info-card">
              <h3>ℹ️ À Propos de la Synchronisation</h3>
              <div className="info-grid">
                <div className="info-box">
                  <span className="info-icon">✈️</span>
                  <p><strong>Pour Mobile</strong><br/>Les données sont synchronisées sur Firebase pour que votre app mobile puisse y accéder en temps réel.</p>
                </div>
                <div className="info-box">
                  <span className="info-icon">⚡</span>
                  <p><strong>Automatique</strong><br/>La synchronisation bidirectionnelle permet à la web et mobile de rester toujours à jour.</p>
                </div>
                <div className="info-box">
                  <span className="info-icon">🔒</span>
                  <p><strong>Sécurisé</strong><br/>Les données sont cryptées et protégées par les règles de sécurité Firebase.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default ManagerView;
