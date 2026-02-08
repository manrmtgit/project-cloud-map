const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CloudMap Identity Provider API',
            version: '1.0.0',
            description: 'API REST pour la gestion d\'identité, l\'authentification et la gestion des signalements routiers à Antananarivo.',
            contact: {
                name: 'CloudMap Team'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Serveur de développement'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Entrez votre token JWT'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid', description: 'ID unique de l\'utilisateur' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password', 'name'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        password: { type: 'string', minLength: 6, example: 'MonMotDePasse123' },
                        name: { type: 'string', example: 'Jean Dupont' }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'manager@cloudmap.local' },
                        password: { type: 'string', example: 'Manager123!' }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' }
                    }
                },
                BlockedLoginResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        blocked: { type: 'boolean' },
                        attempts: { type: 'integer' },
                        max_attempts: { type: 'integer' },
                        blocked_at: { type: 'string', format: 'date-time' }
                    }
                },
                Signalement: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        titre: { type: 'string' },
                        description: { type: 'string' },
                        latitude: { type: 'number', format: 'double' },
                        longitude: { type: 'number', format: 'double' },
                        statut: { type: 'string', enum: ['NOUVEAU', 'EN_COURS', 'TERMINE'] },
                        avancement: { type: 'integer', enum: [0, 50, 100] },
                        surface_m2: { type: 'number' },
                        budget: { type: 'number' },
                        entreprise: { type: 'string' },
                        date_nouveau: { type: 'string', format: 'date-time' },
                        date_en_cours: { type: 'string', format: 'date-time' },
                        date_termine: { type: 'string', format: 'date-time' },
                        photos: { type: 'array', items: { $ref: '#/components/schemas/Photo' } }
                    }
                },
                CreateSignalementRequest: {
                    type: 'object',
                    required: ['titre', 'latitude', 'longitude'],
                    properties: {
                        titre: { type: 'string', example: 'Nid de poule Analakely' },
                        description: { type: 'string', example: 'Grand nid de poule dangereux' },
                        latitude: { type: 'number', example: -18.9100 },
                        longitude: { type: 'number', example: 47.5250 },
                        surface_m2: { type: 'number', example: 15.5 },
                        budget: { type: 'number', example: 2500000 },
                        entreprise: { type: 'string', example: 'COLAS Madagascar' },
                        user_id: { type: 'string', format: 'uuid' }
                    }
                },
                UpdateSignalementRequest: {
                    type: 'object',
                    properties: {
                        titre: { type: 'string' },
                        description: { type: 'string' },
                        statut: { type: 'string', enum: ['NOUVEAU', 'EN_COURS', 'TERMINE'] },
                        surface_m2: { type: 'number' },
                        budget: { type: 'number' },
                        entreprise: { type: 'string' },
                        user_id_modifier: { type: 'string', format: 'uuid' }
                    }
                },
                Photo: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        filename: { type: 'string' },
                        url: { type: 'string' }
                    }
                },
                Stats: {
                    type: 'object',
                    properties: {
                        total_signalements: { type: 'integer' },
                        total_surface_m2: { type: 'number' },
                        total_budget: { type: 'number' },
                        avancement_global: { type: 'number' },
                        par_statut: {
                            type: 'object',
                            properties: {
                                nouveau: { type: 'integer' },
                                en_cours: { type: 'integer' },
                                termine: { type: 'integer' }
                            }
                        },
                        delais: {
                            type: 'object',
                            properties: {
                                moyen_total_jours: { type: 'number' },
                                min_jours: { type: 'number' },
                                max_jours: { type: 'number' }
                            }
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js', './src/docs/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
