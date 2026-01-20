const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Toutes les routes utilisateur sont protégées
router.use(authMiddleware);

// Routes utilisateur
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.delete('/profile', userController.deleteAccount);

// Route admin (pour debug)
router.get('/', userController.getAllUsers);

module.exports = router;
