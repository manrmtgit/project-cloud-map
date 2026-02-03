const express = require('express');
const router = express.Router();
const signalementController = require('../controllers/signalement.controller');

// Routes publiques (pour les visiteurs)
router.get('/', signalementController.getAllSignalements);
router.get('/stats', signalementController.getStats);
router.get('/suggest-coordinates', signalementController.suggestCoordinates);
router.get('/:id', signalementController.getSignalementById);

// Routes pour création/modification (futures - avec auth)
router.post('/', signalementController.createSignalement);
router.put('/:id', signalementController.updateSignalement);
router.delete('/:id', signalementController.deleteSignalement);

module.exports = router;
