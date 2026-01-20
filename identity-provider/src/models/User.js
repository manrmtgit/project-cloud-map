const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

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
            INSERT INTO users (email, password, name)
            VALUES ($1, $2, $3)
            RETURNING id, email, name, created_at, updated_at
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
        const { name, password } = updateData;
        let query;
        let values;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query = `
                UPDATE users 
                SET name = COALESCE($1, name), 
                    password = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING id, email, name, created_at, updated_at
            `;
            values = [name, hashedPassword, id];
        } else {
            query = `
                UPDATE users 
                SET name = COALESCE($1, name),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id, email, name, created_at, updated_at
            `;
            values = [name, id];
        }

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

    // Obtenir tous les utilisateurs
    static async getAll() {
        const query = 'SELECT id, email, name, created_at, updated_at FROM users ORDER BY created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    }

    // Formater l'utilisateur (sans mot de passe)
    static toJSON(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
    }
}

module.exports = User;
