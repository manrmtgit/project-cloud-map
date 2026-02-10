const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');

// GET /api/signalements
const getAllSignalements = async (req, res) => {
  try {
    const { statut, utilisateur_id } = req.query;
    let query = `
      SELECT 
        s.id, s.titre, s.description, s.latitude, s.longitude, 
        s.statut, s.avancement, s.niveau, s.surface_m2, s.prix_par_m2, s.budget, 
        s.entreprise, s.type_reparation_id,
        s.utilisateur_id, u.nom as utilisateur_nom, u.email as utilisateur_email,
        s.date_nouveau, s.date_en_cours, s.date_termine,
        s.date_creation, s.date_mise_a_jour,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'filename', p.filename, 'url', p.url, 'mimetype', p.mimetype, 'base64_data', p.base64_data)
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as photos
      FROM signalements s
      LEFT JOIN utilisateurs u ON s.utilisateur_id = u.id
      LEFT JOIN photos p ON s.id = p.signalement_id
    `;
    const params = [];
    const conditions = [];
    if (statut) { params.push(statut); conditions.push(`s.statut = $${params.length}`); }
    if (utilisateur_id) { params.push(utilisateur_id); conditions.push(`s.utilisateur_id = $${params.length}`); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY s.id, u.nom, u.email ORDER BY s.date_creation DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, signalements: result.rows });
  } catch (error) {
    console.error('Erreur getAllSignalements:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des signalements' });
  }
};

// GET /api/signalements/stats
const getStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_signalements,
        COALESCE(SUM(surface_m2), 0) as total_surface,
        COALESCE(SUM(budget), 0) as total_budget,
        COUNT(*) FILTER (WHERE statut = 'NOUVEAU') as nb_nouveau,
        COUNT(*) FILTER (WHERE statut = 'EN_COURS') as nb_en_cours,
        COUNT(*) FILTER (WHERE statut = 'TERMINE') as nb_termine,
        COALESCE(AVG(avancement), 0) as avancement_moyen
      FROM signalements
    `;
    const delaiQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) as delai_moyen_jours,
        MIN(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) as delai_min_jours,
        MAX(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) as delai_max_jours
      FROM signalements WHERE statut = 'TERMINE' AND date_termine IS NOT NULL AND date_nouveau IS NOT NULL
    `;

    const [statsResult, delaiResult] = await Promise.all([pool.query(statsQuery), pool.query(delaiQuery)]);
    const stats = statsResult.rows[0];
    const delais = delaiResult.rows[0];
    const total = parseInt(stats.total_signalements);
    const nouveau = parseInt(stats.nb_nouveau);
    const enCours = parseInt(stats.nb_en_cours);
    const termine = parseInt(stats.nb_termine);
    const avancementGlobal = total > 0 ? ((nouveau * 0 + enCours * 50 + termine * 100) / total).toFixed(1) : 0;

    res.json({
      success: true,
      stats: {
        total_signalements: total,
        total_surface_m2: parseFloat(stats.total_surface),
        total_budget: parseFloat(stats.total_budget),
        avancement_global: parseFloat(avancementGlobal),
        par_statut: { nouveau, en_cours: enCours, termine },
        delais: {
          moyen_total_jours: delais.delai_moyen_jours ? parseFloat(delais.delai_moyen_jours).toFixed(1) : null,
          min_jours: delais.delai_min_jours ? parseFloat(delais.delai_min_jours).toFixed(1) : null,
          max_jours: delais.delai_max_jours ? parseFloat(delais.delai_max_jours).toFixed(1) : null
        }
      }
    });
  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({ success: false, message: 'Erreur stats' });
  }
};

// GET /api/signalements/:id
const getSignalementById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.nom as utilisateur_nom, u.email as utilisateur_email,
        COALESCE(json_agg(json_build_object('id', p.id, 'filename', p.filename, 'url', p.url, 'mimetype', p.mimetype, 'base64_data', p.base64_data)) FILTER (WHERE p.id IS NOT NULL), '[]') as photos
      FROM signalements s
      LEFT JOIN utilisateurs u ON s.utilisateur_id = u.id
      LEFT JOIN photos p ON s.id = p.signalement_id
      WHERE s.id = $1 GROUP BY s.id, u.nom, u.email
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
    res.json({ success: true, signalement: result.rows[0] });
  } catch (error) {
    console.error('Erreur getSignalementById:', error);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// POST /api/signalements
const createSignalement = async (req, res) => {
  try {
    const { titre, description, latitude, longitude, surface_m2, niveau, entreprise, utilisateur_id } = req.body;
    if (!titre || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Titre, latitude et longitude sont requis' });
    }
    // budget est calculé automatiquement par le trigger PostgreSQL
    const result = await pool.query(`
      INSERT INTO signalements (titre, description, latitude, longitude, surface_m2, niveau, entreprise, utilisateur_id, statut, avancement, date_nouveau)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NOUVEAU', 0, NOW())
      RETURNING *
    `, [titre, description, latitude, longitude, surface_m2 || null, niveau || 1, entreprise || null, utilisateur_id || null]);

    res.status(201).json({ success: true, message: 'Signalement créé', signalement: result.rows[0] });
  } catch (error) {
    console.error('Erreur createSignalement:', error);
    res.status(500).json({ success: false, message: 'Erreur création signalement' });
  }
};

// PUT /api/signalements/:id
const updateSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const { titre, description, statut, niveau, surface_m2, entreprise, utilisateur_id_modifier } = req.body;

    const oldResult = await pool.query('SELECT statut, utilisateur_id FROM signalements WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
    const oldStatut = oldResult.rows[0].statut;
    const signalementUserId = oldResult.rows[0].utilisateur_id;

    let avancement = 0;
    let dateUpdate = '';
    if (statut === 'NOUVEAU') avancement = 0;
    else if (statut === 'EN_COURS') { avancement = 50; dateUpdate = ', date_en_cours = COALESCE(date_en_cours, NOW())'; }
    else if (statut === 'TERMINE') { avancement = 100; dateUpdate = ', date_en_cours = COALESCE(date_en_cours, NOW()), date_termine = NOW()'; }

    const result = await pool.query(`
      UPDATE signalements SET
        titre = COALESCE($1, titre), description = COALESCE($2, description),
        statut = COALESCE($3, statut), avancement = $4,
        niveau = COALESCE($5, niveau),
        surface_m2 = COALESCE($6, surface_m2),
        entreprise = COALESCE($7, entreprise) ${dateUpdate}
      WHERE id = $8 RETURNING *
    `, [titre, description, statut, avancement, niveau, surface_m2, entreprise, id]);

    // Notification si changement de statut
    if (statut && statut !== oldStatut && signalementUserId) {
      const labels = { 'NOUVEAU': 'Nouveau', 'EN_COURS': 'En cours', 'TERMINE': 'Terminé' };
      await pool.query(
        `INSERT INTO notifications (utilisateur_id, signalement_id, type, message) VALUES ($1, $2, 'STATUS_CHANGE', $3)`,
        [signalementUserId, id, `Statut #${id}: "${labels[oldStatut]}" → "${labels[statut]}"`]
      );
    }

    // Historique
    if (statut && statut !== oldStatut) {
      await pool.query(
        'INSERT INTO historique_statut (signalement_id, statut, avancement, modifie_par) VALUES ($1, $2, $3, $4)',
        [id, statut, avancement, utilisateur_id_modifier || null]
      );
    }

    res.json({ success: true, message: 'Signalement mis à jour', signalement: result.rows[0] });
  } catch (error) {
    console.error('Erreur updateSignalement:', error);
    res.status(500).json({ success: false, message: 'Erreur mise à jour' });
  }
};

// DELETE /api/signalements/:id
const deleteSignalement = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM signalements WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Non trouvé' });
    res.json({ success: true, message: 'Signalement supprimé' });
  } catch (error) {
    console.error('Erreur deleteSignalement:', error);
    res.status(500).json({ success: false, message: 'Erreur suppression' });
  }
};

// GET /api/signalements/suggest-coordinates
const suggestCoordinates = async (req, res) => {
  const quartiers = [
    { nom: 'Analakely', lat: -18.9100, lng: 47.5250 },
    { nom: 'Mahamasina', lat: -18.9200, lng: 47.5200 },
    { nom: 'Ivandry', lat: -18.8850, lng: 47.5350 },
    { nom: 'Ankadifotsy', lat: -18.9200, lng: 47.5100 },
    { nom: 'Ambohijatovo', lat: -18.9080, lng: 47.5280 },
    { nom: 'Ampefiloha', lat: -18.9180, lng: 47.5150 },
    { nom: 'Tsaralalana', lat: -18.9120, lng: 47.5300 },
    { nom: 'Antanimena', lat: -18.9050, lng: 47.5220 },
    { nom: 'Andravoahangy', lat: -18.9020, lng: 47.5380 },
    { nom: '67 Ha', lat: -18.9150, lng: 47.5380 },
    { nom: 'Ankorondrano', lat: -18.8900, lng: 47.5280 },
    { nom: 'Behoririka', lat: -18.9070, lng: 47.5170 }
  ];
  const q = quartiers[Math.floor(Math.random() * quartiers.length)];
  res.json({
    success: true,
    suggestion: { latitude: +(q.lat + (Math.random() - 0.5) * 0.005).toFixed(6), longitude: +(q.lng + (Math.random() - 0.5) * 0.005).toFixed(6), quartier: q.nom },
    quartiers: quartiers.map(q => ({ nom: q.nom, latitude: q.lat, longitude: q.lng }))
  });
};

// POST /api/signalements/:id/photos — Upload photos (fichier ou base64)
const addPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const signalement = await pool.query('SELECT id FROM signalements WHERE id = $1', [id]);
    if (signalement.rows.length === 0) return res.status(404).json({ success: false, message: 'Signalement non trouvé' });

    const insertedPhotos = [];

    // Photos base64 depuis le body
    if (req.body.photos && Array.isArray(req.body.photos)) {
      for (const photo of req.body.photos) {
        const filename = photo.filename || `photo-${Date.now()}.jpg`;
        const result = await pool.query(
          `INSERT INTO photos (signalement_id, filename, url, mimetype, size, base64_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [id, filename, `/uploads/${filename}`, photo.mimetype || 'image/jpeg', photo.size || 0, photo.base64 || photo.base64_data || null]
        );
        insertedPhotos.push(result.rows[0]);
      }
    }

    // Photos fichier via multer
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Lire le fichier et convertir en base64 pour stockage
        const filePath = file.path;
        let base64Data = null;
        try {
          const buffer = fs.readFileSync(filePath);
          base64Data = `data:${file.mimetype};base64,${buffer.toString('base64')}`;
        } catch (e) { /* ignore */ }

        const result = await pool.query(
          `INSERT INTO photos (signalement_id, filename, url, mimetype, size, base64_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [id, file.filename, `/uploads/${file.filename}`, file.mimetype, file.size, base64Data]
        );
        insertedPhotos.push(result.rows[0]);
      }
    }

    if (insertedPhotos.length === 0) return res.status(400).json({ success: false, message: 'Aucune photo fournie' });
    res.status(201).json({ success: true, message: `${insertedPhotos.length} photo(s) ajoutée(s)`, photos: insertedPhotos });
  } catch (error) {
    console.error('Erreur addPhotos:', error);
    res.status(500).json({ success: false, message: "Erreur lors de l'ajout des photos" });
  }
};

// GET /api/signalements/:id/photos
const getPhotos = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM photos WHERE signalement_id = $1 ORDER BY date_ajout DESC', [req.params.id]);
    res.json({ success: true, photos: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// DELETE /api/signalements/photos/:photoId
const deletePhoto = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING *', [req.params.photoId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Photo non trouvée' });
    const filePath = path.join(__dirname, '../../uploads', result.rows[0].filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Photo supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// Notifications
const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, s.titre as signalement_titre FROM notifications n
      LEFT JOIN signalements s ON n.signalement_id = s.id
      WHERE n.utilisateur_id = $1 ORDER BY n.date_creation DESC LIMIT 50
    `, [req.params.userId]);
    res.json({ success: true, notifications: result.rows, unread_count: result.rows.filter(n => !n.lu).length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET lu = TRUE WHERE id = $1', [req.params.notifId]);
    res.json({ success: true, message: 'Notification lue' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET lu = TRUE WHERE utilisateur_id = $1', [req.params.userId]);
    res.json({ success: true, message: 'Toutes les notifications lues' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
};

// GET /api/signalements/stats/detailed
const getDetailedStats = async (req, res) => {
  try {
    const delaisQuery = await pool.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) FILTER (WHERE statut = 'TERMINE') as moyen_total_jours,
        AVG(EXTRACT(EPOCH FROM (date_en_cours - date_nouveau)) / 86400) FILTER (WHERE date_en_cours IS NOT NULL) as demarrage_moyen_jours,
        AVG(EXTRACT(EPOCH FROM (date_termine - date_en_cours)) / 86400) FILTER (WHERE statut = 'TERMINE' AND date_en_cours IS NOT NULL) as travaux_moyen_jours,
        MIN(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) FILTER (WHERE statut = 'TERMINE') as min_jours,
        MAX(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) FILTER (WHERE statut = 'TERMINE') as max_jours
      FROM signalements
    `);

    const entrepriseStats = await pool.query(`
      SELECT COALESCE(entreprise, 'Non assigné') as entreprise, COUNT(*) as total,
        COUNT(*) FILTER (WHERE statut = 'TERMINE') as termines
      FROM signalements GROUP BY entreprise ORDER BY total DESC
    `);

    const niveauStats = await pool.query(`
      SELECT niveau, COUNT(*) as total, COALESCE(SUM(budget), 0) as budget_total
      FROM signalements WHERE niveau IS NOT NULL GROUP BY niveau ORDER BY niveau
    `);

    const delais = delaisQuery.rows[0];
    res.json({
      success: true,
      stats: {
        delais: {
          moyen_total_jours: delais.moyen_total_jours ? parseFloat(delais.moyen_total_jours).toFixed(1) : null,
          demarrage_moyen_jours: delais.demarrage_moyen_jours ? parseFloat(delais.demarrage_moyen_jours).toFixed(1) : null,
          travaux_moyen_jours: delais.travaux_moyen_jours ? parseFloat(delais.travaux_moyen_jours).toFixed(1) : null,
          min_jours: delais.min_jours ? parseFloat(delais.min_jours).toFixed(1) : null,
          max_jours: delais.max_jours ? parseFloat(delais.max_jours).toFixed(1) : null
        },
        par_entreprise: entrepriseStats.rows,
        par_niveau: niveauStats.rows
      }
    });
  } catch (error) {
    console.error('Erreur getDetailedStats:', error);
    res.status(500).json({ success: false, message: 'Erreur stats détaillées' });
  }
};

module.exports = {
  getAllSignalements, getStats, getDetailedStats, getSignalementById,
  createSignalement, updateSignalement, deleteSignalement,
  suggestCoordinates, addPhotos, getPhotos, deletePhoto,
  getNotifications, markNotificationRead, markAllNotificationsRead
};
