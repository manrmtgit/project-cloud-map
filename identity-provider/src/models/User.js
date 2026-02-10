const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Créer un utilisateur (inscription)
  static async create({ nom, email, password, role }) {
    const existing = await this.findByEmail(email);
    if (existing) throw new Error('Un utilisateur avec cet email existe déjà');

    const hashedPassword = await bcrypt.hash(password, 10);
    const roleId = role === 'MANAGER' ? 3 : 2; // 2=UTILISATEUR par défaut

    const result = await pool.query(`
      INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nom, email, role_id, date_creation, date_mise_a_jour
    `, [nom || email.split('@')[0], email, hashedPassword, roleId]);

    const user = result.rows[0];
    // Créer l'entrée tentatives_connexion
    await pool.query('INSERT INTO tentatives_connexion (utilisateur_id) VALUES ($1)', [user.id]);
    return this.enrichWithRole(user);
  }

  // Trouver par email
  static async findByEmail(email) {
    const result = await pool.query(`
      SELECT u.*, r.nom as role_nom
      FROM utilisateurs u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1
    `, [email]);
    return result.rows[0] || null;
  }

  // Trouver par ID
  static async findById(id) {
    const result = await pool.query(`
      SELECT u.*, r.nom as role_nom
      FROM utilisateurs u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  // Mettre à jour profil
  static async update(id, { nom, email, password }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (nom) { fields.push(`nom = $${idx++}`); values.push(nom); }
    if (email) { fields.push(`email = $${idx++}`); values.push(email); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`mot_de_passe_hash = $${idx++}`);
      values.push(hash);
    }

    if (fields.length === 0) throw new Error('Aucune donnée à mettre à jour');

    values.push(id);
    const result = await pool.query(`
      UPDATE utilisateurs SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, nom, email, role_id, date_creation, date_mise_a_jour
    `, values);

    if (result.rows.length === 0) throw new Error('Utilisateur non trouvé');
    return this.enrichWithRole(result.rows[0]);
  }

  // Supprimer
  static async delete(id) {
    const result = await pool.query('DELETE FROM utilisateurs WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) throw new Error('Utilisateur non trouvé');
    return true;
  }

  // Vérifier mot de passe
  static async verifyPassword(plain, hashed) {
    return bcrypt.compare(plain, hashed);
  }

  // Vérifier aussi avec crypt() de PostgreSQL (pour les users seedés)
  static async verifyPasswordPg(email, plain) {
    const result = await pool.query(
      "SELECT id FROM utilisateurs WHERE email = $1 AND mot_de_passe_hash = crypt($2, mot_de_passe_hash)",
      [email, plain]
    );
    return result.rows.length > 0;
  }

  // Liste tous les utilisateurs
  static async getAll() {
    const result = await pool.query(`
      SELECT u.id, u.nom, u.email, r.nom as role, u.compte_bloque, 
             u.date_creation, u.date_mise_a_jour
      FROM utilisateurs u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.date_creation DESC
    `);
    return result.rows;
  }

  // --- GESTION DES TENTATIVES DE CONNEXION ---

  // Vérifier si le compte est bloqué (seul le manager peut débloquer)
  static async isBlocked(userId) {
    const result = await pool.query(
      'SELECT compte_bloque FROM utilisateurs WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return false;
    return result.rows[0].compte_bloque === true;
  }

  // Incrémenter les tentatives et bloquer si nécessaire (seul le manager peut débloquer)
  static async incrementAttempts(userId) {
    // Récupérer les paramètres
    const params = await pool.query(
      "SELECT cle, valeur FROM parametres WHERE cle = 'max_tentatives_connexion'"
    );
    const maxAttempts = params.rows.length > 0 ? parseInt(params.rows[0].valeur) : 3;

    // Upsert tentatives
    const result = await pool.query(`
      INSERT INTO tentatives_connexion (utilisateur_id, tentatives, derniere_tentative)
      VALUES ($1, 1, NOW())
      ON CONFLICT (utilisateur_id) DO UPDATE SET
        tentatives = tentatives_connexion.tentatives + 1,
        derniere_tentative = NOW()
      RETURNING tentatives
    `, [userId]);

    const attempts = result.rows[0].tentatives;
    const remaining = maxAttempts - attempts;

    if (attempts >= maxAttempts) {
      // Bloquer le compte — seul le manager peut débloquer via l'interface
      await pool.query('UPDATE utilisateurs SET compte_bloque = TRUE WHERE id = $1', [userId]);
      return { blocked: true, attempts, maxAttempts };
    }

    return { blocked: false, attempts, remaining, maxAttempts };
  }

  // Réinitialiser les tentatives (après connexion réussie ou via API admin)
  static async resetAttempts(userId) {
    await pool.query(`
      UPDATE tentatives_connexion SET tentatives = 0, bloque_jusqua = NULL
      WHERE utilisateur_id = $1
    `, [userId]);
    await pool.query('UPDATE utilisateurs SET compte_bloque = FALSE WHERE id = $1', [userId]);
  }

  // --- SESSIONS ---

  static async createSession(userId, token) {
    const params = await pool.query("SELECT valeur FROM parametres WHERE cle = 'duree_session_heures'");
    const hours = params.rows.length > 0 ? parseInt(params.rows[0].valeur) : 24;

    const result = await pool.query(`
      INSERT INTO sessions (utilisateur_id, token, date_expiration)
      VALUES ($1, $2, NOW() + INTERVAL '${hours} hours')
      RETURNING *
    `, [userId, token]);
    return result.rows[0];
  }

  static async validateSession(token) {
    const result = await pool.query(`
      SELECT s.*, u.email, u.nom, r.nom as role_nom
      FROM sessions s
      JOIN utilisateurs u ON s.utilisateur_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE s.token = $1 AND s.active = TRUE AND s.date_expiration > NOW()
    `, [token]);
    return result.rows[0] || null;
  }

  static async invalidateSession(token) {
    await pool.query('UPDATE sessions SET active = FALSE WHERE token = $1', [token]);
  }

  // Enrichir avec le nom du rôle
  static async enrichWithRole(user) {
    if (user.role_nom) return user;
    const roleResult = await pool.query('SELECT nom FROM roles WHERE id = $1', [user.role_id]);
    user.role_nom = roleResult.rows[0]?.nom || 'UTILISATEUR';
    return user;
  }

  // Format JSON pour API
  static toJSON(user) {
    return {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role_nom || user.role || 'UTILISATEUR',
      compte_bloque: user.compte_bloque || false,
      date_creation: user.date_creation,
      date_mise_a_jour: user.date_mise_a_jour
    };
  }
}

module.exports = User;
