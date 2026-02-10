module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'default_secret_key',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    SESSION_DURATION: process.env.SESSION_DURATION || '24h',
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3,
    LOCK_DURATION_MINUTES: parseInt(process.env.LOCK_DURATION_MINUTES) || 15,
    PORT: process.env.PORT || 3000,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 5432,
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres123',
    DB_NAME: process.env.DB_NAME || 'identity_db'
};
