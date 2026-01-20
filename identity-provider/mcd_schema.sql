-- =========================
--  SCHEMA POUR SIGNALER ROUTIER (PostgreSQL)
--  Version FR
-- =========================

-- Extension PostGIS pour la géolocalisation
CREATE EXTENSION IF NOT EXISTS postgis;

-- =========================
-- ROLES
-- =========================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (nom) VALUES
('VISITEUR'),
('UTILISATEUR'),
('MANAGER');

-- =========================
-- UTILISATEURS
-- =========================
CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    compte_bloque BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- BLOQUAGE / TENTATIVES
-- =========================
CREATE TABLE tentatives_blocage (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    tentatives INTEGER NOT NULL DEFAULT 0,
    bloque_jusqua TIMESTAMP NULL
);

-- =========================
-- SESSIONS
-- =========================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_expiration TIMESTAMP NOT NULL
);

-- =========================
-- SIGNALÉMENTS
-- =========================
CREATE TABLE signalements (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    position GEOGRAPHY(POINT, 4326) NOT NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'NOUVEAU',
    surface_m2 NUMERIC(10,2),
    budget NUMERIC(12,2),
    entreprise VARCHAR(255),
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les requêtes géographiques
CREATE INDEX idx_signalements_position ON signalements USING GIST(position);

-- =========================
-- HISTORIQUE STATUT
-- =========================
CREATE TABLE historique_statut (
    id SERIAL PRIMARY KEY,
    signalement_id INTEGER NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
    statut VARCHAR(50) NOT NULL,
    date_changement TIMESTAMP NOT NULL DEFAULT NOW(),
    modifie_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- =========================
-- PHOTOS
-- =========================
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    signalement_id INTEGER NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    date_ajout TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- JOURNAL DE SYNCHRONISATION
-- =========================
CREATE TABLE journal_synchronisation (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- IMPORT / EXPORT
    details TEXT,
    date TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- TRIGGERS POUR AUTOMATISER date_mise_a_jour
-- =========================
CREATE OR REPLACE FUNCTION update_date_mise_a_jour()
RETURNS TRIGGER AS $$
BEGIN
   NEW.date_mise_a_jour = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_signalements
BEFORE UPDATE ON signalements
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_update_utilisateurs
BEFORE UPDATE ON utilisateurs
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();
