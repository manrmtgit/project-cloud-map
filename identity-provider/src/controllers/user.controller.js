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

    // Mettre à jour le profil
    async updateProfile(req, res) {
        try {
            const { name, password } = req.body;

            if (!name && !password) {
                return res.status(400).json({
                    error: 'Aucune donnée à mettre à jour'
                });
            }

            const updateData = {};
            if (name) updateData.name = name;
            if (password) {
                if (password.length < 6) {
                    return res.status(400).json({
                        error: 'Le mot de passe doit contenir au moins 6 caractères'
                    });
                }
                updateData.password = password;
            }

            const user = await User.update(req.user.userId, updateData);

            res.json({
                message: 'Profil mis à jour',
                user: User.toJSON(user)
            });

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Supprimer le compte
    async deleteAccount(req, res) {
        try {
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
