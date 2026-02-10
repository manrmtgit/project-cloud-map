const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Routes publiques (paramètres et types)
router.get('/parametres', userController.getParametres);
router.get('/types-reparation', userController.getTypesReparation);

// Routes protégées
router.use(authMiddleware);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.delete('/profile', userController.deleteAccount);
router.get('/', userController.getAllUsers);

// Admin: modifier les paramètres
router.put('/parametres/:cle', userController.updateParametre);

// CRUD utilisateurs (admin/manager)
router.post('/', userController.createUser);
router.post('/unblock', userController.unblockByEmail);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
