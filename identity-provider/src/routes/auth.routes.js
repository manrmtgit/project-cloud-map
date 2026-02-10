const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authController.verify);
router.post('/logout', authController.logout);

// Routes protégées
router.post('/refresh', authMiddleware, authController.refreshToken);

// API admin: réinitialiser le blocage d'un utilisateur
router.post('/reset-block/:userId', authController.resetBlock);

module.exports = router;
