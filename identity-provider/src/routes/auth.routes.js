const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/firebase/login', authController.loginWithFirebase);
router.get('/verify', authController.verify);

// Routes protégées
router.post('/refresh', authMiddleware, authController.refreshToken);

module.exports = router;
