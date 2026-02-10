const User = require('../models/User');
const { pool } = require('../config/database');
const { createFirebaseAuthUser, writeUserProfileToRTDB } = require('../config/firebase');

class UserController {
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
      res.json({ utilisateur: User.toJSON(user) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const { nom, name, email, password } = req.body;
      if (!nom && !name && !email && !password) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }
      if (password && password.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      }
      const user = await User.update(req.user.userId, { nom: nom || name, email, password });
      res.json({ message: 'Profil mis à jour', utilisateur: User.toJSON(user) });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteAccount(req, res) {
    try {
      await User.delete(req.user.userId);
      res.json({ message: 'Compte supprimé avec succès' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await User.getAll();
      res.json({ count: users.length, users });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/users/parametres - Lire les paramètres système
  async getParametres(req, res) {
    try {
      const result = await pool.query('SELECT * FROM parametres ORDER BY cle');
      res.json({ success: true, parametres: result.rows });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // PUT /api/users/parametres/:cle - Modifier un paramètre
  async updateParametre(req, res) {
    try {
      const { cle } = req.params;
      const { valeur } = req.body;
      if (!valeur) return res.status(400).json({ error: 'Valeur requise' });

      const result = await pool.query(
        'UPDATE parametres SET valeur = $1 WHERE cle = $2 RETURNING *',
        [valeur, cle]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Paramètre non trouvé' });
      res.json({ success: true, parametre: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/users/types-reparation - Liste des types de réparation
  async getTypesReparation(req, res) {
    try {
      const result = await pool.query('SELECT * FROM types_reparation ORDER BY niveau');
      res.json({ success: true, types: result.rows });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/users - Créer un utilisateur (admin/manager)
  async createUser(req, res) {
    try {
      const { nom, email, password, role } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
      const user = await User.create({ nom, email, password, role });
      // Créer aussi dans Firebase Auth + écrire profil RTDB pour le mobile
      let firebaseUid = null;
      try {
        const fbResult = await createFirebaseAuthUser(email, password, nom || '');
        if (fbResult?.localId) {
          firebaseUid = fbResult.localId;
          await writeUserProfileToRTDB(firebaseUid, {
            email,
            nom: nom || '',
            prenom: '',
            role: role || 'UTILISATEUR',
            isBlocked: false,
            createdAt: Date.now()
          });
        }
      } catch (fbError) {
        console.warn('⚠️  Firebase Auth sync (createUser) non bloquant:', fbError.message);
      }

      res.status(201).json({ success: true, message: 'Utilisateur créé', utilisateur: User.toJSON(user), firebase_uid: firebaseUid });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // PUT /api/users/:id - Modifier un utilisateur (admin/manager)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { nom, email, password, role } = req.body;
      const bcrypt = require('bcryptjs');
      const fields = []; const values = []; let idx = 1;
      if (nom) { fields.push(`nom = $${idx++}`); values.push(nom); }
      if (email) { fields.push(`email = $${idx++}`); values.push(email); }
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        fields.push(`mot_de_passe_hash = $${idx++}`); values.push(hash);
      }
      if (role) {
        const roleMap = { 'MANAGER': 3, 'UTILISATEUR': 2, 'VISITEUR': 1 };
        fields.push(`role_id = $${idx++}`); values.push(roleMap[role] || 2);
      }
      if (fields.length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      values.push(parseInt(id));
      const result = await pool.query(`UPDATE utilisateurs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
      res.json({ success: true, message: 'Utilisateur mis à jour' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // DELETE /api/users/:id - Supprimer un utilisateur
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM utilisateurs WHERE id = $1 RETURNING id', [parseInt(id)]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
      res.json({ success: true, message: 'Utilisateur supprimé' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // POST /api/users/unblock - Débloquer par email
  async unblockByEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email requis' });
      const user = await pool.query('SELECT id FROM utilisateurs WHERE email = $1', [email]);
      if (user.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé avec cet email' });
      const userId = user.rows[0].id;
      await pool.query('UPDATE tentatives_connexion SET tentatives = 0, bloque_jusqua = NULL WHERE utilisateur_id = $1', [userId]);
      await pool.query('UPDATE utilisateurs SET compte_bloque = FALSE WHERE id = $1', [userId]);
      res.json({ success: true, message: `Compte ${email} débloqué avec succès` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
