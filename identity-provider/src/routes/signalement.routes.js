const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const signalementController = require('../controllers/signalement.controller');

// Configuration Multer pour upload de photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `photo-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Seules les images sont autorisées'));
    }
});

// Routes publiques (pour les visiteurs)
router.get('/', signalementController.getAllSignalements);
router.get('/stats', signalementController.getStats);
router.get('/stats/detailed', signalementController.getDetailedStats);
router.get('/suggest-coordinates', signalementController.suggestCoordinates);
router.get('/:id', signalementController.getSignalementById);
router.get('/:id/photos', signalementController.getPhotos);

// Routes pour création/modification
router.post('/', signalementController.createSignalement);
router.put('/:id', signalementController.updateSignalement);
router.delete('/:id', signalementController.deleteSignalement);

// Routes pour les photos
router.post('/:id/photos', upload.array('photos', 10), signalementController.addPhotos);
router.delete('/photos/:photoId', signalementController.deletePhoto);

// Routes pour les notifications
router.get('/notifications/:userId', signalementController.getNotifications);
router.put('/notifications/:notifId/read', signalementController.markNotificationRead);
router.put('/notifications/:userId/read-all', signalementController.markAllNotificationsRead);

module.exports = router;
