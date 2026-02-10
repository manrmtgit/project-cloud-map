const FirebaseSyncService = require('../services/firebaseSync.service');

// Envoyer les données PostgreSQL vers Firebase
const pushToFirebase = async (req, res) => {
    try {
        const result = await FirebaseSyncService.pushSignalementsToFirebase();
        res.json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        console.error('Erreur push Firebase:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi vers Firebase',
            error: error.message
        });
    }
};

// Récupérer les données Firebase vers PostgreSQL
const pullFromFirebase = async (req, res) => {
    try {
        const result = await FirebaseSyncService.pullSignalementsFromFirebase();
        res.json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        console.error('Erreur pull Firebase:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération depuis Firebase',
            error: error.message
        });
    }
};

// Synchronisation bidirectionnelle
const syncBidirectional = async (req, res) => {
    try {
        // 1. Récupérer depuis Firebase
        const pullResult = await FirebaseSyncService.pullSignalementsFromFirebase();
        
        // 2. Envoyer vers Firebase
        const pushResult = await FirebaseSyncService.pushSignalementsToFirebase();

        res.json({
            success: true,
            message: 'Synchronisation bidirectionnelle terminée',
            pull_result: pullResult,
            push_result: pushResult
        });
    } catch (error) {
        console.error('Erreur sync bidirectionnelle:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la synchronisation',
            error: error.message
        });
    }
};

// Obtenir les statistiques de synchronisation
const getSyncStatus = async (req, res) => {
    try {
        const stats = await FirebaseSyncService.getSyncStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Erreur stats sync:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des stats',
            error: error.message
        });
    }
};

module.exports = {
    pushToFirebase,
    pullFromFirebase,
    syncBidirectional,
    getSyncStatus
};