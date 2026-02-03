import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signalementService } from '../services/signalement.api';
import { useAuth } from '../context/AuthContext';
import './ManagerView.css';

const ManagerView = () => {
  const { user, logout } = useAuth();
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignalement, setSelectedSignalement] = useState(null);
  const [filter, setFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  
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
  const [suggesting, setSuggesting] = useState(false);

  const statusOptions = ['NOUVEAU', 'EN_COURS', 'TERMINE'];

  useEffect(() => {
    loadSignalements();
  }, []);

  const loadSignalements = async () => {
    try {
      setLoading(true);
      const data = await signalementService.getAll();
      setSignalements(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Simulation d'une synchronisation
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadSignalements();
      alert('Synchronisation réussie !');
    } catch (error) {
      alert('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleEdit = (signalement) => {
    setSelectedSignalement(signalement);
    setEditData({
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
      await signalementService.update(selectedSignalement.id, editData);
      await loadSignalements();
      setEditMode(false);
      setSelectedSignalement(null);
      alert('Signalement mis à jour !');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour');
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
      await signalementService.create({
        ...addFormData,
        latitude: parseFloat(addFormData.latitude),
        longitude: parseFloat(addFormData.longitude),
        surface_m2: addFormData.surface_m2 ? parseFloat(addFormData.surface_m2) : null,
        budget: addFormData.budget ? parseFloat(addFormData.budget) : null
      });
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
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  return (
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
          <Link to="/" className="btn-back">
            ← Retour à la carte
          </Link>
          <button 
            className={`btn-sync ${syncing ? 'syncing' : ''}`} 
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? '🔄 Synchronisation...' : '🔄 Synchroniser'}
          </button>
          <button className="btn-logout" onClick={logout}>
            🚪 Déconnexion
          </button>
        </div>
      </header>

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
      </div>
    </div>
  );
};

export default ManagerView;
