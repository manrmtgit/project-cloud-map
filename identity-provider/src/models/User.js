const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES } = require('../config');

class User {
    // Créer un utilisateur
    static async create(userData) {
        const { email, password, name } = userData;

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await this.findByEmail(email);
        if (existingUser) {
            throw new Error('Un utilisateur avec cet email existe déjà');
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insérer dans la base de données
        const query = `
            INSERT INTO users (email, password, name, failed_login_attempts, is_locked, locked_until)
            VALUES ($1, $2, $3, 0, FALSE, NULL)
            RETURNING id, email, name, failed_login_attempts, is_locked, locked_until, created_at, updated_at
        `;
        const values = [email, hashedPassword, name];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Trouver par email
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0] || null;
    }

    // Trouver par ID
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    // Mettre à jour un utilisateur
    static async update(id, updateData) {
        const { name, email, password } = updateData;
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (email !== undefined) {
            // Vérifier que le nouvel email n'est pas déjà pris
            const existing = await this.findByEmail(email);
            if (existing && existing.id !== id) {
                throw new Error('Cet email est déjà utilisé par un autre compte');
            }
            fields.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password, 10);
            fields.push(`password = $${paramIndex++}`);
            values.push(hashedPassword);
        }

        if (fields.length === 0) {
            throw new Error('Aucune donnée à mettre à jour');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE users 
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, email, name, failed_login_attempts, is_locked, locked_until, created_at, updated_at
        `;

        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Utilisateur non trouvé');
        }

        return result.rows[0];
    }

    // Supprimer un utilisateur
    static async delete(id) {
        const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error('Utilisateur non trouvé');
        }

        return true;
    }

    // Vérifier le mot de passe
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // ===== GESTION DES TENTATIVES DE CONNEXION =====

    // Vérifier si le compte est bloqué
    static async isAccountLocked(userId) {
        const query = 'SELECT is_locked, locked_until, failed_login_attempts FROM users WHERE id = $1';
        const result = await pool.query(query, [userId]);
        
        if (result.rows.length === 0) return false;
        
        const user = result.rows[0];
        
        // Si bloqué mais la durée est expirée, débloquer automatiquement
        if (user.is_locked && user.locked_until && new Date(user.locked_until) < new Date()) {
            await this.resetLoginAttempts(userId);
            return false;
        }
        
        return user.is_locked;
    }

    // Incrémenter les tentatives de connexion échouées
    static async incrementFailedAttempts(userId) {
        const maxAttempts = MAX_LOGIN_ATTEMPTS;
        const lockMinutes = LOCK_DURATION_MINUTES;

        const query = `
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING failed_login_attempts
        `;
        const result = await pool.query(query, [userId]);
        const attempts = result.rows[0].failed_login_attempts;

        // Bloquer le compte si le nombre max est atteint
        if (attempts >= maxAttempts) {
            const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
            await pool.query(
                `UPDATE users SET is_locked = TRUE, locked_until = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [lockUntil, userId]
            );
            return { locked: true, attempts, lockUntil };
        }

        return { locked: false, attempts, remaining: maxAttempts - attempts };
    }

    // Réinitialiser les tentatives après une connexion réussie
    static async resetLoginAttempts(userId) {
        const query = `
            UPDATE users 
            SET failed_login_attempts = 0, is_locked = FALSE, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;
        await pool.query(query, [userId]);
    }

    // Réinitialiser le blocage pour un utilisateur (API admin)
    static async unlockAccount(userId) {
        const query = `
            UPDATE users 
            SET failed_login_attempts = 0, is_locked = FALSE, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email, name, failed_login_attempts, is_locked, locked_until
        `;
        const result = await pool.query(query, [userId]);
        if (result.rows.length === 0) {
            throw new Error('Utilisateur non trouvé');
        }
        return result.rows[0];
    }

    // Débloquer par email (API admin)
    static async unlockAccountByEmail(email) {
        const query = `
            UPDATE users 
            SET failed_login_attempts = 0, is_locked = FALSE, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE email = $1
            RETURNING id, email, name, failed_login_attempts, is_locked, locked_until
        `;
        const result = await pool.query(query, [email]);
        if (result.rows.length === 0) {
            throw new Error('Utilisateur non trouvé');
        }
        return result.rows[0];
    }

    // ===== GESTION DES SESSIONS =====

    // Créer une session
    static async createSession(userId, token, expiresIn) {
        // Calculer la date d'expiration
        const now = new Date();
        let expiresAt;
        const match = expiresIn.match(/^(\d+)(h|m|d)$/);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            expiresAt = new Date(now);
            if (unit === 'h') expiresAt.setHours(expiresAt.getHours() + value);
            else if (unit === 'm') expiresAt.setMinutes(expiresAt.getMinutes() + value);
            else if (unit === 'd') expiresAt.setDate(expiresAt.getDate() + value);
        } else {
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h par défaut
        }

        const query = `
            INSERT INTO sessions (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING id, user_id, token, created_at, expires_at
        `;
        const result = await pool.query(query, [userId, token, expiresAt]);
        return result.rows[0];
    }

    // Vérifier si une session est valide
    static async isSessionValid(token) {
        const query = `
            SELECT s.*, u.email, u.name 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.token = $1 AND s.expires_at > NOW() AND s.is_active = TRUE
        `;
        const result = await pool.query(query, [token]);
        return result.rows[0] || null;
    }

    // Supprimer une session (logout)
    static async deleteSession(token) {
        const query = `UPDATE sessions SET is_active = FALSE WHERE token = $1`;
        await pool.query(query, [token]);
    }

    // Supprimer toutes les sessions d'un utilisateur
    static async deleteAllSessions(userId) {
        const query = `UPDATE sessions SET is_active = FALSE WHERE user_id = $1`;
        await pool.query(query, [userId]);
    }

    // Obtenir les sessions actives d'un utilisateur
    static async getActiveSessions(userId) {
        const query = `
            SELECT id, token, created_at, expires_at 
            FROM sessions 
            WHERE user_id = $1 AND expires_at > NOW() AND is_active = TRUE
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Nettoyer les sessions expirées
    static async cleanExpiredSessions() {
        const query = `DELETE FROM sessions WHERE expires_at < NOW() OR is_active = FALSE`;
        const result = await pool.query(query);
        return result.rowCount;
    }

    // Obtenir tous les utilisateurs
    static async getAll() {
        const query = `
            SELECT id, email, name, failed_login_attempts, is_locked, locked_until, created_at, updated_at 
            FROM users ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    // Formater l'utilisateur (sans mot de passe)
    static toJSON(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            failedLoginAttempts: user.failed_login_attempts || 0,
            isLocked: user.is_locked || false,
            lockedUntil: user.locked_until || null,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
    }
}

module.exports = User;
