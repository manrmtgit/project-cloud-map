const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const signalementController = require('../controllers/signalement.controller');
const authMiddleware = require('../middlewares/auth.middleware');

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

// Routes publiques (pour les visiteurs - lecture seule)
router.get('/', signalementController.getAllSignalements);
router.get('/stats', signalementController.getStats);
router.get('/stats/detailed', signalementController.getDetailedStats);
router.get('/suggest-coordinates', signalementController.suggestCoordinates);
router.get('/:id', signalementController.getSignalementById);
router.get('/:id/photos', signalementController.getPhotos);

// Routes protégées (authentification requise - écriture)
router.post('/', authMiddleware, signalementController.createSignalement);
router.put('/:id', authMiddleware, signalementController.updateSignalement);
router.delete('/:id', authMiddleware, signalementController.deleteSignalement);

// Routes pour les photos (protégées)
router.post('/:id/photos', authMiddleware, upload.array('photos', 10), signalementController.addPhotos);
router.delete('/photos/:photoId', authMiddleware, signalementController.deletePhoto);

// Routes pour les notifications
router.get('/notifications/:userId', signalementController.getNotifications);
router.put('/notifications/:notifId/read', signalementController.markNotificationRead);
router.put('/notifications/:userId/read-all', signalementController.markAllNotificationsRead);

module.exports = router;
