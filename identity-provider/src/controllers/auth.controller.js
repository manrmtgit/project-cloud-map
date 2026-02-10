const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { createFirebaseAuthUser, writeUserProfileToRTDB } = require('../config/firebase');

class AuthController {
  // POST /api/auth/register
  async register(req, res) {
    try {
      const { nom, email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe sont requis' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Format d'email invalide" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      }

      const displayName = nom || name || '';
      const user = await User.create({ nom: displayName, email, password });
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role_nom }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      await User.createSession(user.id, token);

      // ── Créer dans Firebase Authentication + écrire profil RTDB (pour le mobile) ──
      let firebaseUid = null;
      try {
        const fbResult = await createFirebaseAuthUser(email, password, displayName);
        if (fbResult?.localId) {
          firebaseUid = fbResult.localId;
          await writeUserProfileToRTDB(firebaseUid, {
            email,
            nom: displayName,
            prenom: '',
            role: user.role_nom || 'UTILISATEUR',
            isBlocked: false,
            createdAt: Date.now()
          });
        }
      } catch (fbError) {
        console.warn('⚠️  Firebase Auth sync échoué (non bloquant):', fbError.message);
      }

      res.status(201).json({
        message: 'Utilisateur créé avec succès',
        utilisateur: User.toJSON(user),
        token,
        firebase_uid: firebaseUid
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe sont requis' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Vérifier si le compte est bloqué
      const blocked = await User.isBlocked(user.id);
      if (blocked) {
        return res.status(403).json({
          error: 'Compte bloqué suite à trop de tentatives de connexion. Contactez le manager pour débloquer votre compte.',
          blocked: true
        });
      }

      // Vérifier le mot de passe (bcrypt OU pgcrypto pour les users seedés)
      let validPassword = await User.verifyPassword(password, user.mot_de_passe_hash);
      if (!validPassword) {
        validPassword = await User.verifyPasswordPg(email, password);
      }

      if (!validPassword) {
        const attemptResult = await User.incrementAttempts(user.id);
        if (attemptResult.blocked) {
          return res.status(403).json({
            error: `Compte bloqué après ${attemptResult.maxAttempts} tentatives échouées. Contactez le manager pour débloquer votre compte.`,
            blocked: true
          });
        }
        return res.status(401).json({
          error: `Email ou mot de passe incorrect. ${attemptResult.remaining} tentative(s) restante(s).`,
          remaining_attempts: attemptResult.remaining
        });
      }

      // Connexion réussie: reset tentatives
      await User.resetAttempts(user.id);

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role_nom },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      await User.createSession(user.id, token);

      res.json({
        message: 'Connexion réussie',
        utilisateur: User.toJSON(user),
        token
      });
    } catch (error) {
      console.error('Erreur login:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/auth/verify
  async verify(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Token non fourni' });

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });

      res.json({ valid: true, utilisateur: User.toJSON(user) });
    } catch (error) {
      res.status(401).json({ valid: false, error: 'Token invalide ou expiré' });
    }
  }

  // POST /api/auth/refresh
  async refreshToken(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role_nom },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      await User.createSession(user.id, token);

      res.json({ message: 'Token rafraîchi', token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/auth/reset-block/:userId — Réinitialiser le blocage d'un utilisateur (API REST admin)
  async resetBlock(req, res) {
    try {
      const { userId } = req.params;
      await User.resetAttempts(parseInt(userId));
      res.json({ success: true, message: `Blocage réinitialisé pour l'utilisateur #${userId}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) await User.invalidateSession(token);
      res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
