-- =========================
--  SCHEMA POUR SIGNALER ROUTIER (PostgreSQL)
--  Version FR
-- =========================

-- Note: PostGIS n'est pas nécessaire pour ce projet,
-- on utilise latitude/longitude directement

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
-- TENTATIVES BLOCAGE
-- =========================
CREATE TABLE IF NOT EXISTS tentatives_blocage (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    tentatives INTEGER NOT NULL DEFAULT 0,
    bloque_jusqua TIMESTAMP NULL
);

-- =========================
-- SESSIONS
-- =========================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_expiration TIMESTAMP NOT NULL
);

-- =========================
-- SIGNALÉMENTS
-- =========================
CREATE TABLE IF NOT EXISTS signalements (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'NOUVEAU',
    surface_m2 NUMERIC(10,2),
    budget NUMERIC(12,2),
    entreprise VARCHAR(255),
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
    date_changement TIMESTAMP NOT NULL DEFAULT NOW(),
    modifie_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- =========================
-- PHOTOS
-- =========================
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    signalement_id INTEGER NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    date_ajout TIMESTAMP NOT NULL DEFAULT NOW()
);

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
INSERT INTO signalements (titre, description, latitude, longitude, statut, surface_m2, budget, entreprise) VALUES
('Nid de poule Avenue de l''Indépendance', 'Grand nid de poule dangereux au centre-ville', -18.9137, 47.5226, 'NOUVEAU', 15.50, 2500000, NULL),
('Route dégradée Analakely', 'Revêtement très abîmé sur 50m', -18.9100, 47.5250, 'EN_COURS', 120.00, 45000000, 'COLAS Madagascar'),
('Fissures Boulevard Ratsimilaho', 'Nombreuses fissures longitudinales', -18.9050, 47.5180, 'TERMINE', 85.00, 28000000, 'SOGEA SATOM'),
('Affaissement route Ivandry', 'Affaissement important près du canal', -18.8850, 47.5350, 'EN_COURS', 45.00, 18000000, 'COLAS Madagascar'),
('Trous multiples Ankadifotsy', 'Plusieurs trous sur la chaussée', -18.9200, 47.5100, 'NOUVEAU', 30.00, 8500000, NULL),
('Dégradation carrefour Ambohijatovo', 'Carrefour très endommagé', -18.9080, 47.5280, 'NOUVEAU', 200.00, 75000000, NULL),
('Route effondrée Ampefiloha', 'Effondrement partiel de la route', -18.9180, 47.5150, 'EN_COURS', 65.00, 32000000, 'ENTREPRISE MALAKY'),
('Nids de poule Tsaralalana', 'Zone avec multiples nids de poule', -18.9120, 47.5300, 'TERMINE', 40.00, 12000000, 'SOGEA SATOM')
ON CONFLICT DO NOTHING;
