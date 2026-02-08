const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authController.verify);
router.get('/config', authController.getLoginConfig);

// Routes protégées
router.post('/refresh', authMiddleware, authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.get('/sessions', authMiddleware, authController.getActiveSessions);

// Routes admin (déblocage)
router.get('/blocked-users', authMiddleware, authController.getBlockedUsers);
router.post('/unblock/:userId', authMiddleware, authController.unblockUser);

module.exports = router;
