-- =========================
--  SCHEMA POUR SIGNALER ROUTIER (PostgreSQL)
--  Version FR
-- =========================

-- Note: PostGIS n'est pas nécessaire pour ce projet,
-- on utilise latitude/longitude directement

-- =========================
-- Enable pgcrypto functions (used for gen_random_uuid, crypt, gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ANCIEN SCHEMA (users)
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert a seeded manager user for testing (password will be hashed using pgcrypto's crypt())
-- Credentials: email: manager@cloudmap.local  password: Manager123!
-- Hash pré-calculé avec bcryptjs (10 rounds) pour compatibilité avec Node.js
INSERT INTO users (email, password, name)
VALUES (
    'manager@cloudmap.local',
    '$2a$10$YQ8RqH3kQzKGxKUvEJkNYOqGxLnRGkbMxZK0bIhJFGBiAaKxEwqSa',
    'Manager'
)
ON CONFLICT (email) DO NOTHING;

-- =========================
-- ROLES
-- =========================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (nom) VALUES
('VISITEUR'),
('UTILISATEUR'),
('MANAGER')
ON CONFLICT (nom) DO NOTHING;

-- =========================
-- UTILISATEURS
-- =========================
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255),
    role_id INTEGER REFERENCES roles(id),
    compte_bloque BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- TENTATIVES BLOCAGE (pour table utilisateurs - legacy)
-- =========================
CREATE TABLE IF NOT EXISTS tentatives_blocage (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    tentatives INTEGER NOT NULL DEFAULT 0,
    bloque_jusqua TIMESTAMP NULL
);

-- =========================
-- SESSIONS (pour table utilisateurs - legacy)
-- =========================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_expiration TIMESTAMP NOT NULL
);

-- =========================
-- LOGIN ATTEMPTS (pour table users UUID - actif)
-- =========================
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempts INTEGER NOT NULL DEFAULT 0,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_at TIMESTAMP NULL,
    last_attempt_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =========================
-- USER SESSIONS (pour table users UUID - actif)
-- =========================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);

-- =========================
-- SIGNALÉMENTS
-- =========================
CREATE TABLE IF NOT EXISTS signalements (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'NOUVEAU',
    avancement INTEGER NOT NULL DEFAULT 0,
    surface_m2 NUMERIC(10,2),
    budget NUMERIC(12,2),
    entreprise VARCHAR(255),
    niveau INTEGER DEFAULT 1 CHECK (niveau >= 1 AND niveau <= 10),
    -- Dates par étape d'avancement
    date_nouveau TIMESTAMP DEFAULT NOW(),
    date_en_cours TIMESTAMP,
    date_termine TIMESTAMP,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- HISTORIQUE STATUT
-- =========================
CREATE TABLE IF NOT EXISTS historique_statut (
    id SERIAL PRIMARY KEY,
    signalement_id INTEGER NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
    statut VARCHAR(50) NOT NULL,
    avancement INTEGER NOT NULL DEFAULT 0,
    date_changement TIMESTAMP NOT NULL DEFAULT NOW(),
    modifie_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    modifie_par_uuid UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =========================
-- PHOTOS
-- =========================
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    signalement_id INTEGER NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    mimetype VARCHAR(100),
    size INTEGER,
    date_ajout TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    signalement_id INTEGER REFERENCES signalements(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    lu BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- PARAMETRES (configuration backoffice)
-- =========================
CREATE TABLE IF NOT EXISTS parametres (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur VARCHAR(255) NOT NULL,
    description TEXT,
    date_modification TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Prix par m2 forfaitaire par défaut
INSERT INTO parametres (cle, valeur, description) VALUES
('prix_par_m2', '50000', 'Prix forfaitaire par m² pour le calcul du budget (en Ariary)')
ON CONFLICT (cle) DO NOTHING;

-- =========================
-- TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION update_date_mise_a_jour()
RETURNS TRIGGER AS $$
BEGIN
   NEW.date_mise_a_jour = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_signalements ON signalements;
CREATE TRIGGER trg_update_signalements
BEFORE UPDATE ON signalements
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

DROP TRIGGER IF EXISTS trg_update_utilisateurs ON utilisateurs;
CREATE TRIGGER trg_update_utilisateurs
BEFORE UPDATE ON utilisateurs
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

-- =========================
-- DONNÉES DE TEST (Signalements à Antananarivo)
-- =========================
-- Budget = prix_par_m2 (50000) * niveau * surface_m2
INSERT INTO signalements (titre, description, latitude, longitude, statut, avancement, surface_m2, niveau, budget, entreprise, date_nouveau, date_en_cours, date_termine) VALUES
('Nid de poule Avenue de l''Indépendance', 'Grand nid de poule dangereux au centre-ville', -18.9137, 47.5226, 'NOUVEAU', 0, 15.50, 2, 1550000, NULL, NOW(), NULL, NULL),
('Route dégradée Analakely', 'Revêtement très abîmé sur 50m', -18.9100, 47.5250, 'EN_COURS', 50, 120.00, 5, 30000000, 'COLAS Madagascar', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NULL),
('Fissures Boulevard Ratsimilaho', 'Nombreuses fissures longitudinales', -18.9050, 47.5180, 'TERMINE', 100, 85.00, 4, 17000000, 'SOGEA SATOM', NOW() - INTERVAL '30 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'),
('Affaissement route Ivandry', 'Affaissement important près du canal', -18.8850, 47.5350, 'EN_COURS', 50, 45.00, 6, 13500000, 'COLAS Madagascar', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days', NULL),
('Trous multiples Ankadifotsy', 'Plusieurs trous sur la chaussée', -18.9200, 47.5100, 'NOUVEAU', 0, 30.00, 3, 4500000, NULL, NOW(), NULL, NULL),
('Dégradation carrefour Ambohijatovo', 'Carrefour très endommagé', -18.9080, 47.5280, 'NOUVEAU', 0, 200.00, 7, 70000000, NULL, NOW() - INTERVAL '2 days', NULL, NULL),
('Route effondrée Ampefiloha', 'Effondrement partiel de la route', -18.9180, 47.5150, 'EN_COURS', 50, 65.00, 8, 26000000, 'ENTREPRISE MALAKY', NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days', NULL),
('Nids de poule Tsaralalana', 'Zone avec multiples nids de poule', -18.9120, 47.5300, 'TERMINE', 100, 40.00, 3, 6000000, 'SOGEA SATOM', NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Ajouter les photos de test (utilisant les images du dossier sary)
INSERT INTO photos (signalement_id, filename, url, mimetype, size) VALUES
-- Signalement 1: 2 photos
(1, 'route1.jpg', '/uploads/route1.jpg', 'image/jpeg', 125000),
(1, 'route2.jpg', '/uploads/route2.jpg', 'image/jpeg', 145000),
-- Signalement 2: 2 photos
(2, 'route3.jpg', '/uploads/route3.jpg', 'image/jpeg', 230000),
(2, 'route4.jpg', '/uploads/route4.jpg', 'image/jpeg', 198000),
-- Signalement 3: 1 photo
(3, 'route5.jpeg', '/uploads/route5.jpeg', 'image/jpeg', 156000),
-- Signalement 4: 1 photo
(4, 'route6.jpg', '/uploads/route6.jpg', 'image/jpeg', 178000)
ON CONFLICT DO NOTHING;
