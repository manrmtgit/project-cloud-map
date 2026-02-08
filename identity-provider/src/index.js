require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CloudMap API Documentation',
    swaggerOptions: {
        persistAuthorization: true
    }
}));

// Route pour le JSON Swagger
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

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
        documentation: '/api-docs',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                verify: 'GET /api/auth/verify',
                refresh: 'POST /api/auth/refresh',
                logout: 'POST /api/auth/logout',
                config: 'GET /api/auth/config',
                sessions: 'GET /api/auth/sessions',
                blocked_users: 'GET /api/auth/blocked-users',
                unblock: 'POST /api/auth/unblock/:userId'
            },
            users: {
                profile: 'GET /api/users/profile',
                update: 'PUT /api/users/profile',
                delete: 'DELETE /api/users/profile',
                list: 'GET /api/users'
            },
            signalements: {
                list: 'GET /api/signalements',
                create: 'POST /api/signalements (auth)',
                update: 'PUT /api/signalements/:id (auth)',
                delete: 'DELETE /api/signalements/:id (auth)',
                stats: 'GET /api/signalements/stats',
                detailed_stats: 'GET /api/signalements/stats/detailed'
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
