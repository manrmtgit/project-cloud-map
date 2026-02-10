const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { verifyFirebaseToken, syncUserToFirestore, isFirebaseEnabled } = require('../services/firebase');

class AuthController {
    // Inscription
    async register(req, res) {
        try {
            const { email, password, name } = req.body;

            // Validation des données
            if (!email || !password || !name) {
                return res.status(400).json({
                    error: 'Email, mot de passe et nom sont requis'
                });
            }

            // Validation de l'email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error: 'Format d\'email invalide'
                });
            }

            // Validation du mot de passe (min 6 caractères)
            if (password.length < 6) {
                return res.status(400).json({
                    error: 'Le mot de passe doit contenir au moins 6 caractères'
                });
            }

            // Créer l'utilisateur
            const user = await User.create({ email, password, name });

            // Synchroniser vers Firebase si activé
            if (isFirebaseEnabled()) {
                syncUserToFirestore(User.toJSON(user));
            }

            // Générer le token JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.status(201).json({
                message: 'Utilisateur créé avec succès',
                user: User.toJSON(user),
                token
            });

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Connexion
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validation des données
            if (!email || !password) {
                return res.status(400).json({
                    error: 'Email et mot de passe sont requis'
                });
            }

            // Trouver l'utilisateur
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    error: 'Email ou mot de passe incorrect'
                });
            }

            // Vérifier le mot de passe
            const isValidPassword = await User.verifyPassword(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    error: 'Email ou mot de passe incorrect'
                });
            }

            // Générer le token JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.json({
                message: 'Connexion réussie',
                user: User.toJSON(user),
                token
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Connexion via Firebase Token
    async loginWithFirebase(req, res) {
        try {
            const { firebaseToken } = req.body;

            if (!firebaseToken) {
                return res.status(400).json({
                    error: 'Token Firebase requis'
                });
            }

            // Vérifier le token Firebase
            const decodedToken = await verifyFirebaseToken(firebaseToken);
            
            // Chercher ou créer l'utilisateur dans PostgreSQL
            let user = await User.findByEmail(decodedToken.email);
            
            if (!user) {
                // Créer l'utilisateur s'il n'existe pas
                user = await User.create({
                    email: decodedToken.email,
                    password: 'firebase-auth-' + Date.now(), // Mot de passe placeholder
                    name: decodedToken.name || decodedToken.email.split('@')[0]
                });
            }

            // Générer le token JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.json({
                message: 'Connexion Firebase réussie',
                user: User.toJSON(user),
                token
            });

        } catch (error) {
            console.error('Erreur login Firebase:', error);
            res.status(401).json({ error: 'Token Firebase invalide' });
        }
    }

    // Vérifier le token
    async verify(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({
                    error: 'Token non fourni'
                });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user) {
                return res.status(401).json({
                    error: 'Utilisateur non trouvé'
                });
            }

            res.json({
                valid: true,
                user: User.toJSON(user)
            });

        } catch (error) {
            res.status(401).json({
                valid: false,
                error: 'Token invalide ou expiré'
            });
        }
    }

    // Rafraîchir le token
    async refreshToken(req, res) {
        try {
            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    error: 'Utilisateur non trouvé'
                });
            }

            // Générer un nouveau token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.json({
                message: 'Token rafraîchi',
                token
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AuthController();
