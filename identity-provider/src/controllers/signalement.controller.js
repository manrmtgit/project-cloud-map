const { pool } = require('../config/database');

// Récupérer tous les signalements
const getAllSignalements = async (req, res) => {
    try {
        const { statut } = req.query;
        
        let query = `
            SELECT 
                id, titre, description, latitude, longitude, 
                statut, surface_m2, budget, entreprise,
                date_creation, date_mise_a_jour
            FROM signalements
        `;
        
        const params = [];
        
        if (statut) {
            query += ' WHERE statut = $1';
            params.push(statut);
        }
        
        query += ' ORDER BY date_creation DESC';
        
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

// Récupérer les statistiques
const getStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_signalements,
                COALESCE(SUM(surface_m2), 0) as total_surface,
                COALESCE(SUM(budget), 0) as total_budget,
                COUNT(*) FILTER (WHERE statut = 'NOUVEAU') as nb_nouveau,
                COUNT(*) FILTER (WHERE statut = 'EN_COURS') as nb_en_cours,
                COUNT(*) FILTER (WHERE statut = 'TERMINE') as nb_termine
            FROM signalements
        `;
        
        const result = await pool.query(statsQuery);
        const stats = result.rows[0];
        
        const total = parseInt(stats.total_signalements);
        const termine = parseInt(stats.nb_termine);
        const avancement = total > 0 ? ((termine / total) * 100).toFixed(1) : 0;
        
        res.json({
            success: true,
            stats: {
                total_signalements: parseInt(stats.total_signalements),
                total_surface_m2: parseFloat(stats.total_surface),
                total_budget: parseFloat(stats.total_budget),
                avancement_pourcentage: parseFloat(avancement),
                par_statut: {
                    nouveau: parseInt(stats.nb_nouveau),
                    en_cours: parseInt(stats.nb_en_cours),
                    termine: parseInt(stats.nb_termine)
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

// Récupérer un signalement par ID
const getSignalementById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                id, titre, description, latitude, longitude, 
                statut, surface_m2, budget, entreprise,
                date_creation, date_mise_a_jour
            FROM signalements
            WHERE id = $1
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
        const { titre, description, latitude, longitude, surface_m2, budget, entreprise } = req.body;
        
        if (!titre || !latitude || !longitude) {
            return res.status(400).json({ 
                success: false, 
                message: 'Titre, latitude et longitude sont requis' 
            });
        }
        
        const query = `
            INSERT INTO signalements (titre, description, latitude, longitude, surface_m2, budget, entreprise)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            titre, description, latitude, longitude, surface_m2, budget, entreprise
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

// Mettre à jour un signalement
const updateSignalement = async (req, res) => {
    try {
        const { id } = req.params;
        const { titre, description, statut, surface_m2, budget, entreprise } = req.body;
        
        const query = `
            UPDATE signalements 
            SET 
                titre = COALESCE($1, titre),
                description = COALESCE($2, description),
                statut = COALESCE($3, statut),
                surface_m2 = COALESCE($4, surface_m2),
                budget = COALESCE($5, budget),
                entreprise = COALESCE($6, entreprise)
            WHERE id = $7
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            titre, description, statut, surface_m2, budget, entreprise, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Signalement non trouvé' 
            });
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

module.exports = {
    getAllSignalements,
    getStats,
    getSignalementById,
    createSignalement,
    updateSignalement,
    deleteSignalement,
    suggestCoordinates
};
