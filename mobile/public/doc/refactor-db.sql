-- =========================
--  PROJET CLOUD S5 - SIGNALEMENTS ROUTIERS
--  Base de données PostgreSQL
--  Version simplifiée et professionnelle
-- =========================

-- Extension pour le cryptage des mots de passe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- TABLE: ROLES
-- =========================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (nom) VALUES
('VISITEUR'),
('UTILISATEUR'),
('MANAGER')
ON CONFLICT (nom) DO NOTHING;

-- =========================
-- TABLE: UTILISATEURS
-- =========================
CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    num_etu VARCHAR(50),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    compte_bloque BOOLEAN NOT NULL DEFAULT FALSE,
    tentatives_connexion INTEGER NOT NULL DEFAULT 0,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_utilisateurs_email ON utilisateurs(email);

-- Compte manager par défaut (mot de passe: Manager123!)
INSERT INTO utilisateurs (email, mot_de_passe_hash, nom, prenom, role_id)
VALUES (
    'manager@cloudmap.local',
    crypt('Manager123!', gen_salt('bf')),
    'Manager',
    'Admin',
    (SELECT id FROM roles WHERE nom = 'MANAGER')
)
ON CONFLICT (email) DO NOTHING;

-- =========================
-- TABLE: SESSIONS
-- =========================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_expiration TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_utilisateur ON sessions(utilisateur_id);

-- =========================
-- TABLE: SIGNALEMENTS
-- =========================
CREATE TABLE signalements (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    adresse TEXT,
    statut VARCHAR(50) NOT NULL DEFAULT 'NOUVEAU',
    avancement INTEGER NOT NULL DEFAULT 0,
    surface_m2 NUMERIC(10,2),
    budget NUMERIC(15,2),
    entreprise VARCHAR(255),
    date_nouveau TIMESTAMP DEFAULT NOW(),
    date_en_cours TIMESTAMP,
    date_termine TIMESTAMP,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signalements_statut ON signalements(statut);
CREATE INDEX idx_signalements_utilisateur ON signalements(utilisateur_id);

-- =========================
-- TABLE: PHOTOS
-- =========================
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    signalement_id INTEGER NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    firebase_path TEXT,
    mimetype VARCHAR(100),
    size_bytes INTEGER,
    date_ajout TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_signalement ON photos(signalement_id);

-- =========================
-- TABLE: HISTORIQUE_STATUT
-- =========================
CREATE TABLE historique_statut (
    id SERIAL PRIMARY KEY,
    signalement_id INTEGER NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
    ancien_statut VARCHAR(50),
    nouveau_statut VARCHAR(50) NOT NULL,
    ancien_avancement INTEGER,
    nouveau_avancement INTEGER NOT NULL,
    modifie_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_changement TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historique_signalement ON historique_statut(signalement_id);

-- =========================
-- TABLE: NOTIFICATIONS
-- =========================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    signalement_id INTEGER REFERENCES signalements(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    lu BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_utilisateur ON notifications(utilisateur_id);
CREATE INDEX idx_notifications_lu ON notifications(lu);

-- =========================
-- TABLE: CONFIGURATION
-- =========================
CREATE TABLE configuration (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur VARCHAR(255) NOT NULL,
    description TEXT
);

INSERT INTO configuration (cle, valeur, description) VALUES
('max_tentatives_connexion', '3', 'Nombre maximum de tentatives de connexion avant blocage'),
('duree_session_heures', '24', 'Durée de vie des sessions en heures'),
('duree_blocage_minutes', '30', 'Durée du blocage en minutes après échec de connexion')
ON CONFLICT (cle) DO NOTHING;

-- =========================
-- FONCTIONS UTILES
-- =========================
-- Incrémente le compteur de tentative et bloque le compte si le seuil est dépassé
CREATE OR REPLACE FUNCTION increment_login_attempts(p_email VARCHAR)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_user_id INTEGER;
  v_max_attempts INTEGER := (SELECT valeur::INTEGER FROM configuration WHERE cle = 'max_tentatives_connexion');
  v_attempts INTEGER := 0;
BEGIN
  SELECT id INTO v_user_id FROM utilisateurs WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE utilisateurs
    SET tentatives_connexion = tentatives_connexion + 1
  WHERE id = v_user_id
  RETURNING tentatives_connexion INTO v_attempts;

  IF v_attempts >= COALESCE(v_max_attempts, 3) THEN
    UPDATE utilisateurs
      SET compte_bloque = TRUE
      WHERE id = v_user_id;
  END IF;
END;
$$;

-- Débloquer un utilisateur (manuellement via API ou interface manager)
CREATE OR REPLACE FUNCTION unblock_user(p_user_id INTEGER)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE utilisateurs
    SET compte_bloque = FALSE,
        tentatives_connexion = 0
    WHERE id = p_user_id;
END;
$$;

-- Trigger pour enregistrer l'historique des changements de statut d'un signalement
CREATE OR REPLACE FUNCTION trg_hist_statut_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.statut IS DISTINCT FROM OLD.statut THEN
    INSERT INTO historique_statut (signalement_id, ancien_statut, nouveau_statut, ancien_avancement, nouveau_avancement, modifie_par, date_changement)
    VALUES (NEW.id, OLD.statut, NEW.statut, OLD.avancement, NEW.avancement, NULL, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hist_statut ON signalements;
CREATE TRIGGER trg_hist_statut
AFTER UPDATE ON signalements
FOR EACH ROW
EXECUTE FUNCTION trg_hist_statut_insert();

-- =========================
-- DONNÉES DE TEST
-- =========================

-- Signalements de test à Antananarivo
INSERT INTO signalements (utilisateur_id, titre, description, latitude, longitude, statut, avancement, surface_m2, budget, entreprise, date_nouveau, date_en_cours, date_termine) VALUES
(NULL, 'Nid de poule Avenue de l''Indépendance', 'Grand nid de poule dangereux au centre-ville', -18.9137, 47.5226, 'NOUVEAU', 0, 15.50, 2500000, NULL, NOW(), NULL, NULL),
(NULL, 'Route dégradée Analakely', 'Revêtement très abîmé sur 50m', -18.9100, 47.5250, 'EN_COURS', 50, 120.00, 45000000, 'COLAS Madagascar', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NULL),
(NULL, 'Fissures Boulevard Ratsimilaho', 'Nombreuses fissures longitudinales', -18.9050, 47.5180, 'TERMINE', 100, 85.00, 28000000, 'SOGEA SATOM', NOW() - INTERVAL '30 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'),
(NULL, 'Affaissement route Ivandry', 'Affaissement important près du canal', -18.8850, 47.5350, 'EN_COURS', 50, 45.00, 18000000, 'COLAS Madagascar', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days', NULL),
(NULL, 'Trous multiples Ankadifotsy', 'Plusieurs trous sur la chaussée', -18.9200, 47.5100, 'NOUVEAU', 0, 30.00, 8500000, NULL, NOW(), NULL, NULL),
(NULL, 'Dégradation carrefour Ambohijatovo', 'Carrefour très endommagé', -18.9080, 47.5280, 'NOUVEAU', 0, 200.00, 75000000, NULL, NOW() - INTERVAL '2 days', NULL, NULL),
(NULL, 'Route effondrée Ampefiloha', 'Effondrement partiel de la route', -18.9180, 47.5150, 'EN_COURS', 50, 65.00, 32000000, 'ENTREPRISE MALAKY', NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days', NULL),
(NULL, 'Nids de poule Tsaralalana', 'Zone avec multiples nids de poule', -18.9120, 47.5300, 'TERMINE', 100, 40.00, 12000000, 'SOGEA SATOM', NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Photos de test
INSERT INTO photos (signalement_id, filename, url, mimetype, size_bytes) VALUES
(1, 'route1.jpg', '/uploads/route1.jpg', 'image/jpeg', 125000),
(1, 'route2.jpg', '/uploads/route2.jpg', 'image/jpeg', 145000),
(2, 'route3.jpg', '/uploads/route3.jpg', 'image/jpeg', 230000),
(2, 'route4.jpg', '/uploads/route4.jpg', 'image/jpeg', 198000),
(3, 'route5.jpeg', '/uploads/route5.jpeg', 'image/jpeg', 156000),
(4, 'route6.jpg', '/uploads/route6.jpg', 'image/jpeg', 178000)
ON CONFLICT DO NOTHING;

-- =========================
-- FIN DU SCRIPT
-- =========================