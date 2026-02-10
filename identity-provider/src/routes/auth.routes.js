const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authController.verify);
router.get('/config', authController.getAuthConfig);

// Routes protégées (utilisateur connecté)
router.post('/logout', authMiddleware, authController.logout);
router.post('/logout-all', authMiddleware, authController.logoutAll);
router.post('/refresh', authMiddleware, authController.refreshToken);
router.get('/sessions', authMiddleware, authController.getSessions);

// Routes admin - Déblocage de comptes
router.post('/unlock/:userId', authController.unlockAccount);
router.post('/unlock-by-email', authController.unlockAccountByEmail);
router.post('/clean-sessions', authController.cleanSessions);

module.exports = router;
