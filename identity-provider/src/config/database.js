const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_NAME || 'identity_db',
});

// Test de connexion
pool.on('connect', () => {
    console.log('✅ Connecté à PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Erreur PostgreSQL:', err.message);
});

// Fonction pour tester la connexion
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Connexion à PostgreSQL établie');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Impossible de se connecter à PostgreSQL:', error.message);
        return false;
    }
};

module.exports = {
    pool,
    testConnection
};
