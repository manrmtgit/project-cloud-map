require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import de la configuration de la base de données
const { testConnection } = require('./config/database');

// Import des routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const signalementRoutes = require('./routes/signalement.routes');

// Import des middlewares
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/signalements', signalementRoutes);

// Route de base
app.get('/', (req, res) => {
    res.json({
        message: 'Identity Provider API',
        version: '1.0.0',
        database: 'PostgreSQL',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                verify: 'GET /api/auth/verify'
            },
            users: {
                profile: 'GET /api/users/profile',
                update: 'PUT /api/users/profile',
                delete: 'DELETE /api/users/profile'
            }
        }
    });
});

// Route de santé
app.get('/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({ 
        status: 'OK', 
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString() 
    });
});

// Middleware de gestion des erreurs
app.use(errorHandler);

// Gestion des routes non trouvées
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur avec attente de la connexion à la DB
const startServer = async () => {
    // Attendre que PostgreSQL soit prêt (retry)
    let retries = 5;
    while (retries > 0) {
        const connected = await testConnection();
        if (connected) break;
        
        console.log(`⏳ Attente de PostgreSQL... (${retries} tentatives restantes)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        retries--;
    }

    app.listen(PORT, () => {
        console.log(`🚀 Identity Provider API démarrée sur le port ${PORT}`);
        console.log(`📍 URL: http://localhost:${PORT}`);
        console.log(`🗄️  Base de données: PostgreSQL`);
    });
};

startServer();

module.exports = app;
