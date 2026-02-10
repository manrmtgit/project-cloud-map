const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES } = require('../config');

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

            // Générer le token JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Créer la session
            await User.createSession(user.id, token, JWT_EXPIRES_IN);

            res.status(201).json({
                message: 'Utilisateur créé avec succès',
                user: User.toJSON(user),
                token,
                expiresIn: JWT_EXPIRES_IN
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

            // Vérifier si le compte est bloqué
            const isLocked = await User.isAccountLocked(user.id);
            if (isLocked) {
                const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
                const remainingMinutes = lockedUntil 
                    ? Math.ceil((lockedUntil.getTime() - Date.now()) / 60000) 
                    : LOCK_DURATION_MINUTES;

                return res.status(423).json({
                    error: 'Compte bloqué',
                    message: `Trop de tentatives de connexion échouées. Compte bloqué pour ${remainingMinutes} minute(s).`,
                    lockedUntil: lockedUntil,
                    remainingMinutes
                });
            }

            // Vérifier le mot de passe
            const isValidPassword = await User.verifyPassword(password, user.password);
            if (!isValidPassword) {
                // Incrémenter les tentatives échouées
                const attemptResult = await User.incrementFailedAttempts(user.id);
                
                if (attemptResult.locked) {
                    return res.status(423).json({
                        error: 'Compte bloqué',
                        message: `Trop de tentatives échouées (${attemptResult.attempts}/${MAX_LOGIN_ATTEMPTS}). Compte bloqué pour ${LOCK_DURATION_MINUTES} minute(s).`,
                        lockedUntil: attemptResult.lockUntil,
                        attempts: attemptResult.attempts
                    });
                }

                return res.status(401).json({
                    error: 'Email ou mot de passe incorrect',
                    attemptsRemaining: attemptResult.remaining,
                    message: `Tentative échouée. ${attemptResult.remaining} tentative(s) restante(s) avant blocage.`
                });
            }

            // Connexion réussie : réinitialiser les tentatives
            await User.resetLoginAttempts(user.id);

            // Générer le token JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Créer la session
            const session = await User.createSession(user.id, token, JWT_EXPIRES_IN);

            // Recharger l'utilisateur pour avoir les données à jour
            const updatedUser = await User.findById(user.id);

            res.json({
                message: 'Connexion réussie',
                user: User.toJSON(updatedUser),
                token,
                expiresIn: JWT_EXPIRES_IN,
                session: {
                    id: session.id,
                    expiresAt: session.expires_at
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Déconnexion
    async logout(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                await User.deleteSession(token);
            }
            res.json({ message: 'Déconnexion réussie' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Déconnexion de toutes les sessions
    async logoutAll(req, res) {
        try {
            await User.deleteAllSessions(req.user.userId);
            res.json({ message: 'Toutes les sessions ont été fermées' });
        } catch (error) {
            res.status(500).json({ error: error.message });
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

            // Vérifier le JWT
            const decoded = jwt.verify(token, JWT_SECRET);

            // Vérifier que la session est toujours active
            const session = await User.isSessionValid(token);
            if (!session) {
                return res.status(401).json({
                    valid: false,
                    error: 'Session expirée ou invalidée'
                });
            }

            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(401).json({
                    valid: false,
                    error: 'Utilisateur non trouvé'
                });
            }

            res.json({
                valid: true,
                user: User.toJSON(user),
                session: {
                    expiresAt: session.expires_at
                }
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
            const oldToken = req.headers.authorization?.replace('Bearer ', '');
            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    error: 'Utilisateur non trouvé'
                });
            }

            // Invalider l'ancienne session
            if (oldToken) {
                await User.deleteSession(oldToken);
            }

            // Générer un nouveau token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Créer une nouvelle session
            const session = await User.createSession(user.id, token, JWT_EXPIRES_IN);

            res.json({
                message: 'Token rafraîchi',
                token,
                expiresIn: JWT_EXPIRES_IN,
                session: {
                    id: session.id,
                    expiresAt: session.expires_at
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtenir les sessions actives
    async getSessions(req, res) {
        try {
            const sessions = await User.getActiveSessions(req.user.userId);
            res.json({
                count: sessions.length,
                sessions: sessions.map(s => ({
                    id: s.id,
                    createdAt: s.created_at,
                    expiresAt: s.expires_at
                }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ===== ROUTES ADMIN =====

    // Débloquer un compte utilisateur (par ID)
    async unlockAccount(req, res) {
        try {
            const { userId } = req.params;
            const user = await User.unlockAccount(userId);
            
            res.json({
                message: 'Compte débloqué avec succès',
                user: User.toJSON(user)
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Débloquer un compte utilisateur (par email)
    async unlockAccountByEmail(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: 'Email requis' });
            }
            const user = await User.unlockAccountByEmail(email);
            
            res.json({
                message: 'Compte débloqué avec succès',
                user: User.toJSON(user)
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Obtenir la configuration d'authentification
    async getAuthConfig(req, res) {
        res.json({
            maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
            lockDurationMinutes: LOCK_DURATION_MINUTES,
            sessionDuration: JWT_EXPIRES_IN
        });
    }

    // Nettoyer les sessions expirées
    async cleanSessions(req, res) {
        try {
            const count = await User.cleanExpiredSessions();
            res.json({
                message: `${count} session(s) expirée(s) supprimée(s)`,
                cleaned: count
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AuthController();
