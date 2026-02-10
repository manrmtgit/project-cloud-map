const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { JWT_SECRET, JWT_EXPIRES_IN, MAX_LOGIN_ATTEMPTS, SESSION_DURATION } = require('../config');
const { verifyFirebaseToken, syncUserToFirestore, isFirebaseEnabled } = require('../services/firebase');

/**
 * Convertit une durée string (ex: '24h', '7d', '30m') en millisecondes
 */
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // default 24h
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 24 * 60 * 60 * 1000;
    }
}

class AuthController {
    // ==========================================
    // INSCRIPTION
    // ==========================================
    async register(req, res) {
        try {
            const { email, password, name } = req.body;

            if (!email || !password || !name) {
                return res.status(400).json({
                    error: 'Email, mot de passe et nom sont requis'
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error: 'Format d\'email invalide'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    error: 'Le mot de passe doit contenir au moins 6 caractères'
                });
            }

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

            // Créer une session
            const durationMs = parseDuration(SESSION_DURATION);
            const expiresAt = new Date(Date.now() + durationMs);
            await pool.query(
                `INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
                [user.id, token, expiresAt]
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

    // ==========================================
    // CONNEXION (avec tentatives et blocage)
    // ==========================================
    async login(req, res) {
        try {
            const { email, password } = req.body;

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
            const attemptResult = await pool.query(
                'SELECT * FROM login_attempts WHERE user_id = $1',
                [user.id]
            );

            if (attemptResult.rows.length > 0) {
                const attemptRecord = attemptResult.rows[0];
                if (attemptRecord.is_blocked) {
                    return res.status(403).json({
                        error: 'Compte bloqué suite à trop de tentatives de connexion échouées. Contactez un administrateur.',
                        blocked: true,
                        attempts: attemptRecord.attempts,
                        max_attempts: MAX_LOGIN_ATTEMPTS,
                        blocked_at: attemptRecord.blocked_at
                    });
                }
            }

            // Vérifier le mot de passe
            const isValidPassword = await User.verifyPassword(password, user.password);
            if (!isValidPassword) {
                // Incrémenter les tentatives
                const upsertResult = await pool.query(
                    `INSERT INTO login_attempts (user_id, attempts, last_attempt_at)
                     VALUES ($1, 1, NOW())
                     ON CONFLICT (user_id) DO UPDATE 
                     SET attempts = login_attempts.attempts + 1, last_attempt_at = NOW()
                     RETURNING attempts`,
                    [user.id]
                );

                const currentAttempts = upsertResult.rows[0].attempts;

                // Bloquer si max atteint
                if (currentAttempts >= MAX_LOGIN_ATTEMPTS) {
                    await pool.query(
                        `UPDATE login_attempts SET is_blocked = TRUE, blocked_at = NOW() WHERE user_id = $1`,
                        [user.id]
                    );
                    return res.status(403).json({
                        error: `Compte bloqué après ${MAX_LOGIN_ATTEMPTS} tentatives échouées. Contactez un administrateur.`,
                        blocked: true,
                        attempts: currentAttempts,
                        max_attempts: MAX_LOGIN_ATTEMPTS
                    });
                }

                return res.status(401).json({
                    error: 'Email ou mot de passe incorrect',
                    attempts: currentAttempts,
                    remaining_attempts: MAX_LOGIN_ATTEMPTS - currentAttempts
                });
            }

            // Connexion réussie : réinitialiser les tentatives
            await pool.query(
                'DELETE FROM login_attempts WHERE user_id = $1',
                [user.id]
            );

            // Générer le token JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Créer une session en BDD
            const durationMs = parseDuration(SESSION_DURATION);
            const expiresAt = new Date(Date.now() + durationMs);
            await pool.query(
                `INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
                [user.id, token, expiresAt]
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

    // ==========================================
    // CONNEXION VIA FIREBASE TOKEN
    // ==========================================
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

    // ==========================================
    // VÉRIFIER LE TOKEN
    // ==========================================
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

            // Vérifier la session en BDD
            const sessionResult = await pool.query(
                `SELECT * FROM user_sessions WHERE token = $1 AND is_active = TRUE AND expires_at > NOW()`,
                [token]
            );

            if (sessionResult.rows.length === 0) {
                return res.status(401).json({
                    valid: false,
                    error: 'Session expirée ou invalide'
                });
            }

            res.json({
                valid: true,
                user: User.toJSON(user),
                session: {
                    expires_at: sessionResult.rows[0].expires_at,
                    created_at: sessionResult.rows[0].created_at
                }
            });

        } catch (error) {
            res.status(401).json({
                valid: false,
                error: 'Token invalide ou expiré'
            });
        }
    }

    // ==========================================
    // RAFRAÎCHIR LE TOKEN
    // ==========================================
    async refreshToken(req, res) {
        try {
            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    error: 'Utilisateur non trouvé'
                });
            }

            // Désactiver l'ancien token/session
            const oldToken = req.headers.authorization?.replace('Bearer ', '');
            if (oldToken) {
                await pool.query(
                    'UPDATE user_sessions SET is_active = FALSE WHERE token = $1',
                    [oldToken]
                );
            }

            // Générer un nouveau token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            // Créer une nouvelle session
            const durationMs = parseDuration(SESSION_DURATION);
            const expiresAt = new Date(Date.now() + durationMs);
            await pool.query(
                `INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
                [user.id, token, expiresAt]
            );

            res.json({
                message: 'Token rafraîchi',
                token
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ==========================================
    // DÉCONNEXION (invalide la session)
    // ==========================================
    async logout(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                await pool.query(
                    'UPDATE user_sessions SET is_active = FALSE WHERE token = $1',
                    [token]
                );
            }
            res.json({ message: 'Déconnexion réussie' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ==========================================
    // DÉBLOQUER UN UTILISATEUR (API REST)
    // ==========================================
    async unblockUser(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ error: 'userId est requis' });
            }

            // Vérifier que l'utilisateur existe
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }

            // Réinitialiser les tentatives et débloquer
            await pool.query(
                'DELETE FROM login_attempts WHERE user_id = $1',
                [userId]
            );

            res.json({
                message: `Utilisateur ${user.email} débloqué avec succès`,
                user: User.toJSON(user)
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ==========================================
    // LISTER LES UTILISATEURS BLOQUÉS
    // ==========================================
    async getBlockedUsers(req, res) {
        try {
            const result = await pool.query(
                `SELECT u.id, u.email, u.name, u.created_at, la.attempts, la.blocked_at, la.last_attempt_at
                 FROM users u
                 INNER JOIN login_attempts la ON u.id = la.user_id
                 WHERE la.is_blocked = TRUE
                 ORDER BY la.blocked_at DESC`
            );

            res.json({
                count: result.rows.length,
                blocked_users: result.rows
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ==========================================
    // LISTER LES SESSIONS ACTIVES
    // ==========================================
    async getActiveSessions(req, res) {
        try {
            const userId = req.user.userId;
            const result = await pool.query(
                `SELECT id, created_at, expires_at, is_active 
                 FROM user_sessions 
                 WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()
                 ORDER BY created_at DESC`,
                [userId]
            );

            res.json({
                count: result.rows.length,
                sessions: result.rows
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // ==========================================
    // OBTENIR LA CONFIG DE TENTATIVES
    // ==========================================
    async getLoginConfig(req, res) {
        try {
            res.json({
                max_login_attempts: MAX_LOGIN_ATTEMPTS,
                session_duration: SESSION_DURATION
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AuthController();
