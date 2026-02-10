const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');
const { syncSignalementToFirestore, isFirebaseEnabled } = require('../services/firebase');

// Récupérer tous les signalements avec photos
const getAllSignalements = async (req, res) => {
    try {
        const { statut, user_id } = req.query;
        
        let query = `
            SELECT 
                s.id, s.titre, s.description, s.latitude, s.longitude, 
                s.statut, s.avancement, s.surface_m2, s.budget, s.entreprise,
                s.user_id, s.date_nouveau, s.date_en_cours, s.date_termine,
                s.date_creation, s.date_mise_a_jour,
                COALESCE(
                    json_agg(
                        json_build_object('id', p.id, 'filename', p.filename, 'url', p.url)
                    ) FILTER (WHERE p.id IS NOT NULL), 
                    '[]'
                ) as photos
            FROM signalements s
            LEFT JOIN photos p ON s.id = p.signalement_id
        `;
        
        const params = [];
        const conditions = [];
        
        if (statut) {
            params.push(statut);
            conditions.push(`s.statut = $${params.length}`);
        }
        
        if (user_id) {
            params.push(user_id);
            conditions.push(`s.user_id = $${params.length}`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY s.id ORDER BY s.date_creation DESC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            count: result.rows.length,
            signalements: result.rows
        });
    } catch (error) {
        console.error('Erreur getAllSignalements:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des signalements' 
        });
    }
};

// Récupérer les statistiques avancées
const getStats = async (req, res) => {
    try {
        // Stats de base
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
        
        // Délai moyen de traitement (du nouveau au terminé)
        const delaiQuery = `
            SELECT 
                AVG(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) as delai_moyen_jours,
                MIN(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) as delai_min_jours,
                MAX(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) as delai_max_jours,
                AVG(EXTRACT(EPOCH FROM (date_en_cours - date_nouveau)) / 86400) as delai_demarrage_moyen,
                AVG(EXTRACT(EPOCH FROM (date_termine - date_en_cours)) / 86400) as delai_travaux_moyen
            FROM signalements
            WHERE statut = 'TERMINE' AND date_termine IS NOT NULL AND date_nouveau IS NOT NULL
        `;
        
        const [statsResult, delaiResult] = await Promise.all([
            pool.query(statsQuery),
            pool.query(delaiQuery)
        ]);
        
        const stats = statsResult.rows[0];
        const delais = delaiResult.rows[0];
        
        const total = parseInt(stats.total_signalements);
        const nouveau = parseInt(stats.nb_nouveau);
        const enCours = parseInt(stats.nb_en_cours);
        const termine = parseInt(stats.nb_termine);
        
        // Calcul avancement global pondéré
        const avancementGlobal = total > 0 
            ? ((nouveau * 0 + enCours * 50 + termine * 100) / total).toFixed(1)
            : 0;
        
        res.json({
            success: true,
            stats: {
                total_signalements: total,
                total_surface_m2: parseFloat(stats.total_surface),
                total_budget: parseFloat(stats.total_budget),
                avancement_global: parseFloat(avancementGlobal),
                avancement_moyen: parseFloat(stats.avancement_moyen).toFixed(1),
                par_statut: {
                    nouveau: nouveau,
                    en_cours: enCours,
                    termine: termine
                },
                delais: {
                    moyen_total_jours: delais.delai_moyen_jours ? parseFloat(delais.delai_moyen_jours).toFixed(1) : null,
                    min_jours: delais.delai_min_jours ? parseFloat(delais.delai_min_jours).toFixed(1) : null,
                    max_jours: delais.delai_max_jours ? parseFloat(delais.delai_max_jours).toFixed(1) : null,
                    demarrage_moyen_jours: delais.delai_demarrage_moyen ? parseFloat(delais.delai_demarrage_moyen).toFixed(1) : null,
                    travaux_moyen_jours: delais.delai_travaux_moyen ? parseFloat(delais.delai_travaux_moyen).toFixed(1) : null
                }
            }
        });
    } catch (error) {
        console.error('Erreur getStats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des statistiques' 
        });
    }
};

// Récupérer un signalement par ID avec photos
const getSignalementById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                s.id, s.titre, s.description, s.latitude, s.longitude, 
                s.statut, s.avancement, s.surface_m2, s.budget, s.entreprise,
                s.user_id, s.date_nouveau, s.date_en_cours, s.date_termine,
                s.date_creation, s.date_mise_a_jour,
                COALESCE(
                    json_agg(
                        json_build_object('id', p.id, 'filename', p.filename, 'url', p.url)
                    ) FILTER (WHERE p.id IS NOT NULL), 
                    '[]'
                ) as photos
            FROM signalements s
            LEFT JOIN photos p ON s.id = p.signalement_id
            WHERE s.id = $1
            GROUP BY s.id
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Signalement non trouvé' 
            });
        }
        
        res.json({
            success: true,
            signalement: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur getSignalementById:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération du signalement' 
        });
    }
};

// Créer un signalement
const createSignalement = async (req, res) => {
    try {
        const { titre, description, latitude, longitude, surface_m2, budget, entreprise, user_id } = req.body;
        
        if (!titre || !latitude || !longitude) {
            return res.status(400).json({ 
                success: false, 
                message: 'Titre, latitude et longitude sont requis' 
            });
        }
        
        const query = `
            INSERT INTO signalements (titre, description, latitude, longitude, surface_m2, budget, entreprise, user_id, statut, avancement, date_nouveau)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NOUVEAU', 0, NOW())
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            titre, description, latitude, longitude, surface_m2, budget, entreprise, user_id || null
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Signalement créé avec succès',
            signalement: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur createSignalement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la création du signalement' 
        });
    }
};

// Mettre à jour un signalement avec gestion des dates d'avancement
const updateSignalement = async (req, res) => {
    try {
        const { id } = req.params;
        const { titre, description, statut, surface_m2, budget, entreprise, user_id_modifier } = req.body;
        
        // Récupérer l'ancien statut pour la notification
        const oldResult = await pool.query('SELECT statut, user_id FROM signalements WHERE id = $1', [id]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
        }
        const oldStatut = oldResult.rows[0].statut;
        const signalementUserId = oldResult.rows[0].user_id;
        
        // Calculer l'avancement et les dates selon le statut
        let avancement = 0;
        let dateUpdate = '';
        
        if (statut === 'NOUVEAU') {
            avancement = 0;
        } else if (statut === 'EN_COURS') {
            avancement = 50;
            dateUpdate = ', date_en_cours = COALESCE(date_en_cours, NOW())';
        } else if (statut === 'TERMINE') {
            avancement = 100;
            dateUpdate = ', date_en_cours = COALESCE(date_en_cours, NOW()), date_termine = NOW()';
        }
        
        const query = `
            UPDATE signalements 
            SET 
                titre = COALESCE($1, titre),
                description = COALESCE($2, description),
                statut = COALESCE($3, statut),
                avancement = $4,
                surface_m2 = COALESCE($5, surface_m2),
                budget = COALESCE($6, budget),
                entreprise = COALESCE($7, entreprise)
                ${dateUpdate}
            WHERE id = $8
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            titre, description, statut, avancement, surface_m2, budget, entreprise, id
        ]);
        
        // Créer une notification si le statut a changé
        if (statut && statut !== oldStatut && signalementUserId) {
            const statusLabels = { 'NOUVEAU': 'Nouveau', 'EN_COURS': 'En cours', 'TERMINE': 'Terminé' };
            await pool.query(
                `INSERT INTO notifications (user_id, signalement_id, type, message) 
                 VALUES ($1, $2, 'STATUS_CHANGE', $3)`,
                [
                    signalementUserId,
                    id,
                    `Le statut de votre signalement #${id} est passé de "${statusLabels[oldStatut]}" à "${statusLabels[statut]}"`
                ]
            );
        }
        
        // Enregistrer dans l'historique
        if (statut && statut !== oldStatut) {
            await pool.query(
                `INSERT INTO historique_statut (signalement_id, statut, avancement, modifie_par_uuid) 
                 VALUES ($1, $2, $3, $4)`,
                [id, statut, avancement, user_id_modifier || null]
            );
        }
        
        res.json({
            success: true,
            message: 'Signalement mis à jour avec succès',
            signalement: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur updateSignalement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la mise à jour du signalement' 
        });
    }
};

// Supprimer un signalement
const deleteSignalement = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM signalements WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Signalement non trouvé' 
            });
        }
        
        res.json({
            success: true,
            message: 'Signalement supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur deleteSignalement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la suppression du signalement' 
        });
    }
};

// Suggérer des coordonnées (quartiers d'Antananarivo)
const suggestCoordinates = async (req, res) => {
    try {
        // Quartiers d'Antananarivo avec leurs coordonnées approximatives
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

        // Choisir un quartier aléatoire
        const quartier = quartiers[Math.floor(Math.random() * quartiers.length)];
        
        // Ajouter une petite variation aléatoire aux coordonnées
        const latOffset = (Math.random() - 0.5) * 0.005;
        const lngOffset = (Math.random() - 0.5) * 0.005;

        const suggestion = {
            latitude: parseFloat((quartier.lat + latOffset).toFixed(6)),
            longitude: parseFloat((quartier.lng + lngOffset).toFixed(6)),
            quartier: quartier.nom,
            adresse_suggeree: `${quartier.nom}, Antananarivo`
        };

        res.json({
            success: true,
            suggestion,
            quartiers: quartiers.map(q => ({
                nom: q.nom,
                latitude: q.lat,
                longitude: q.lng
            }))
        });
    } catch (error) {
        console.error('Erreur suggestCoordinates:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la suggestion de coordonnées' 
        });
    }
};

// Ajouter des photos à un signalement
const addPhotos = async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'Aucune photo fournie' });
        }
        
        // Vérifier que le signalement existe
        const signalement = await pool.query('SELECT id FROM signalements WHERE id = $1', [id]);
        if (signalement.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
        }
        
        const insertedPhotos = [];
        for (const file of files) {
            const result = await pool.query(
                `INSERT INTO photos (signalement_id, filename, url, mimetype, size) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [id, file.filename, `/uploads/${file.filename}`, file.mimetype, file.size]
            );
            insertedPhotos.push(result.rows[0]);
        }
        
        res.status(201).json({
            success: true,
            message: `${insertedPhotos.length} photo(s) ajoutée(s)`,
            photos: insertedPhotos
        });
    } catch (error) {
        console.error('Erreur addPhotos:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout des photos' });
    }
};

// Récupérer les photos d'un signalement
const getPhotos = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM photos WHERE signalement_id = $1 ORDER BY date_ajout DESC',
            [id]
        );
        res.json({ success: true, photos: result.rows });
    } catch (error) {
        console.error('Erreur getPhotos:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des photos' });
    }
};

// Supprimer une photo
const deletePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const result = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING *', [photoId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Photo non trouvée' });
        }
        
        // Supprimer le fichier physique
        const filePath = path.join(__dirname, '../../uploads', result.rows[0].filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        res.json({ success: true, message: 'Photo supprimée' });
    } catch (error) {
        console.error('Erreur deletePhoto:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la photo' });
    }
};

// Récupérer les notifications d'un utilisateur
const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            `SELECT n.*, s.titre as signalement_titre 
             FROM notifications n 
             LEFT JOIN signalements s ON n.signalement_id = s.id
             WHERE n.user_id = $1 
             ORDER BY n.date_creation DESC 
             LIMIT 50`,
            [userId]
        );
        
        const unreadCount = result.rows.filter(n => !n.lu).length;
        
        res.json({ 
            success: true, 
            notifications: result.rows,
            unread_count: unreadCount
        });
    } catch (error) {
        console.error('Erreur getNotifications:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des notifications' });
    }
};

// Marquer une notification comme lue
const markNotificationRead = async (req, res) => {
    try {
        const { notifId } = req.params;
        await pool.query('UPDATE notifications SET lu = TRUE WHERE id = $1', [notifId]);
        res.json({ success: true, message: 'Notification marquée comme lue' });
    } catch (error) {
        console.error('Erreur markNotificationRead:', error);
        res.status(500).json({ success: false, message: 'Erreur' });
    }
};

// Marquer toutes les notifications comme lues
const markAllNotificationsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        await pool.query('UPDATE notifications SET lu = TRUE WHERE user_id = $1', [userId]);
        res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
    } catch (error) {
        console.error('Erreur markAllNotificationsRead:', error);
        res.status(500).json({ success: false, message: 'Erreur' });
    }
};

// Statistiques détaillées pour le tableau de bord manager
const getDetailedStats = async (req, res) => {
    try {
        // Calcul des délais moyens
        const delaisQuery = await pool.query(`
            SELECT 
                AVG(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) FILTER (WHERE statut = 'TERMINE') as moyen_total_jours,
                AVG(EXTRACT(EPOCH FROM (date_en_cours - date_nouveau)) / 86400) FILTER (WHERE date_en_cours IS NOT NULL) as demarrage_moyen_jours,
                AVG(EXTRACT(EPOCH FROM (date_termine - date_en_cours)) / 86400) FILTER (WHERE statut = 'TERMINE' AND date_en_cours IS NOT NULL) as travaux_moyen_jours,
                MIN(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) FILTER (WHERE statut = 'TERMINE') as min_jours,
                MAX(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) FILTER (WHERE statut = 'TERMINE') as max_jours
            FROM signalements
        `);
        
        // Stats par entreprise
        const entrepriseStats = await pool.query(`
            SELECT 
                COALESCE(entreprise, 'Non assigné') as entreprise,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE statut = 'TERMINE') as termines,
                AVG(EXTRACT(EPOCH FROM (date_termine - date_nouveau)) / 86400) FILTER (WHERE statut = 'TERMINE') as delai_moyen
            FROM signalements
            GROUP BY entreprise
            ORDER BY total DESC
        `);
        
        // Stats par mois
        const monthlyStats = await pool.query(`
            SELECT 
                TO_CHAR(date_creation, 'YYYY-MM') as mois,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE statut = 'NOUVEAU') as nouveau,
                COUNT(*) FILTER (WHERE statut = 'EN_COURS') as en_cours,
                COUNT(*) FILTER (WHERE statut = 'TERMINE') as termine
            FROM signalements
            WHERE date_creation > NOW() - INTERVAL '12 months'
            GROUP BY TO_CHAR(date_creation, 'YYYY-MM')
            ORDER BY mois DESC
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
                par_mois: monthlyStats.rows
            }
        });
    } catch (error) {
        console.error('Erreur getDetailedStats:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
    }
};

module.exports = {
    getAllSignalements,
    getStats,
    getDetailedStats,
    getSignalementById,
    createSignalement,
    updateSignalement,
    deleteSignalement,
    suggestCoordinates,
    addPhotos,
    getPhotos,
    deletePhoto,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
};
