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
-- TABLE USERS (authentification)
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Utilisateur manager de test
-- Credentials: email: manager@cloudmap.local  password: Manager123!
INSERT INTO users (email, password, name)
VALUES (
    'manager@cloudmap.local',
    crypt('Manager123!', gen_salt('bf')),
    'Manager'
)
ON CONFLICT (email) DO NOTHING;

-- =========================
-- SESSIONS (durée de vie, gestion active)
-- =========================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

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
-- UTILISATEURS (ancien schéma, conservé pour compatibilité)
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
-- TENTATIVES BLOCAGE (ancien schéma, conservé pour compatibilité)
-- =========================
CREATE TABLE IF NOT EXISTS tentatives_blocage (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    tentatives INTEGER NOT NULL DEFAULT 0,
    bloque_jusqua TIMESTAMP NULL
);

-- =========================
-- CONFIGURATION BACKOFFICE (prix forfaitaire par m²)
-- =========================
CREATE TABLE IF NOT EXISTS config_backoffice (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur NUMERIC(12,2) NOT NULL,
    description TEXT,
    date_mise_a_jour TIMESTAMP DEFAULT NOW()
);

-- Prix par m² par défaut : 50 000 Ar
INSERT INTO config_backoffice (cle, valeur, description) VALUES
('prix_par_m2', 50000.00, 'Prix forfaitaire par mètre carré pour le calcul du budget de réparation')
ON CONFLICT (cle) DO NOTHING;

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
    niveau INTEGER NOT NULL DEFAULT 1 CHECK (niveau >= 1 AND niveau <= 10),
    surface_m2 NUMERIC(10,2),
    budget NUMERIC(12,2),
    entreprise VARCHAR(255),
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
-- TRIGGER : Calcul automatique du budget
-- budget = prix_par_m2 * niveau * surface_m2
-- =========================
CREATE OR REPLACE FUNCTION calcul_budget_auto()
RETURNS TRIGGER AS $$
DECLARE
    prix NUMERIC(12,2);
BEGIN
    -- Récupérer le prix par m² depuis la config backoffice
    SELECT valeur INTO prix FROM config_backoffice WHERE cle = 'prix_par_m2';
    IF prix IS NULL THEN
        prix := 50000.00; -- valeur par défaut
    END IF;

    -- Calculer le budget si surface_m2 et niveau sont définis
    IF NEW.surface_m2 IS NOT NULL AND NEW.niveau IS NOT NULL THEN
        NEW.budget := prix * NEW.niveau * NEW.surface_m2;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcul_budget ON signalements;
CREATE TRIGGER trg_calcul_budget
BEFORE INSERT OR UPDATE OF surface_m2, niveau ON signalements
FOR EACH ROW
EXECUTE FUNCTION calcul_budget_auto();

-- =========================
-- DONNÉES DE TEST (Signalements à Antananarivo)
-- Avec niveaux de réparation de 1 à 10
-- Budget calculé automatiquement par le trigger
-- =========================
INSERT INTO signalements (titre, description, latitude, longitude, statut, avancement, niveau, surface_m2, entreprise, date_nouveau, date_en_cours, date_termine) VALUES
('Nid de poule Avenue de l''Indépendance', 'Grand nid de poule dangereux au centre-ville', -18.9137, 47.5226, 'NOUVEAU', 0, 3, 15.50, NULL, NOW(), NULL, NULL),
('Route dégradée Analakely', 'Revêtement très abîmé sur 50m', -18.9100, 47.5250, 'EN_COURS', 50, 7, 120.00, 'COLAS Madagascar', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NULL),
('Fissures Boulevard Ratsimilaho', 'Nombreuses fissures longitudinales', -18.9050, 47.5180, 'TERMINE', 100, 4, 85.00, 'SOGEA SATOM', NOW() - INTERVAL '30 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'),
('Affaissement route Ivandry', 'Affaissement important près du canal', -18.8850, 47.5350, 'EN_COURS', 50, 8, 45.00, 'COLAS Madagascar', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days', NULL),
('Trous multiples Ankadifotsy', 'Plusieurs trous sur la chaussée', -18.9200, 47.5100, 'NOUVEAU', 0, 2, 30.00, NULL, NOW(), NULL, NULL),
('Dégradation carrefour Ambohijatovo', 'Carrefour très endommagé', -18.9080, 47.5280, 'NOUVEAU', 0, 9, 200.00, NULL, NOW() - INTERVAL '2 days', NULL, NULL),
('Route effondrée Ampefiloha', 'Effondrement partiel de la route', -18.9180, 47.5150, 'EN_COURS', 50, 10, 65.00, 'ENTREPRISE MALAKY', NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days', NULL),
('Nids de poule Tsaralalana', 'Zone avec multiples nids de poule', -18.9120, 47.5300, 'TERMINE', 100, 1, 40.00, 'SOGEA SATOM', NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Ajouter les photos de test
INSERT INTO photos (signalement_id, filename, url, mimetype, size) VALUES
(1, 'route1.jpg', '/uploads/route1.jpg', 'image/jpeg', 125000),
(1, 'route2.jpg', '/uploads/route2.jpg', 'image/jpeg', 145000),
(2, 'route3.jpg', '/uploads/route3.jpg', 'image/jpeg', 230000),
(2, 'route4.jpg', '/uploads/route4.jpg', 'image/jpeg', 198000),
(3, 'route5.jpeg', '/uploads/route5.jpeg', 'image/jpeg', 156000),
(4, 'route6.jpg', '/uploads/route6.jpg', 'image/jpeg', 178000)
ON CONFLICT DO NOTHING;
