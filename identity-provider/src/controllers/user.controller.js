const User = require('../models/User');

class UserController {
    // Obtenir le profil de l'utilisateur connecté
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    error: 'Utilisateur non trouvé'
                });
            }

            res.json({
                user: User.toJSON(user)
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Mettre à jour le profil (nom, email, mot de passe)
    async updateProfile(req, res) {
        try {
            const { name, email, password, currentPassword } = req.body;

            if (!name && !email && !password) {
                return res.status(400).json({
                    error: 'Aucune donnée à mettre à jour (name, email ou password attendu)'
                });
            }

            // Si changement de mot de passe, vérifier l'ancien
            if (password) {
                if (password.length < 6) {
                    return res.status(400).json({
                        error: 'Le mot de passe doit contenir au moins 6 caractères'
                    });
                }
                if (!currentPassword) {
                    return res.status(400).json({
                        error: 'Le mot de passe actuel est requis pour changer de mot de passe'
                    });
                }
                const user = await User.findById(req.user.userId);
                const isValid = await User.verifyPassword(currentPassword, user.password);
                if (!isValid) {
                    return res.status(401).json({
                        error: 'Mot de passe actuel incorrect'
                    });
                }
            }

            // Si changement d'email, valider le format
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({
                        error: 'Format d\'email invalide'
                    });
                }
            }

            const updateData = {};
            if (name) updateData.name = name;
            if (email) updateData.email = email;
            if (password) updateData.password = password;

            const user = await User.update(req.user.userId, updateData);

            res.json({
                message: 'Profil mis à jour avec succès',
                user: User.toJSON(user)
            });

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Supprimer le compte
    async deleteAccount(req, res) {
        try {
            // Supprimer toutes les sessions
            await User.deleteAllSessions(req.user.userId);
            // Supprimer le compte
            await User.delete(req.user.userId);

            res.json({
                message: 'Compte supprimé avec succès'
            });

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Obtenir tous les utilisateurs (admin)
    async getAllUsers(req, res) {
        try {
            const users = await User.getAll();

            res.json({
                count: users.length,
                users: users.map(user => User.toJSON(user))
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new UserController();
