-- =========================
--  SCHEMA COMPLET - SIGNALEMENT ROUTIER (PostgreSQL)
--  Version 2.0 - Auth avancé, Manager niveau/prix/budget
-- =========================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
-- UTILISATEURS (table principale d'auth)
-- =========================
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) DEFAULT 2,
    compte_bloque BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- TENTATIVES DE CONNEXION (blocage après N tentatives)
-- =========================
CREATE TABLE IF NOT EXISTS tentatives_connexion (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER UNIQUE NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    tentatives INTEGER NOT NULL DEFAULT 0,
    derniere_tentative TIMESTAMP DEFAULT NOW(),
    bloque_jusqua TIMESTAMP NULL
);

-- =========================
-- SESSIONS (durée de vie paramétrable)
-- =========================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),
    date_expiration TIMESTAMP NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- =========================
-- PARAMÈTRES SYSTÈME
-- =========================
CREATE TABLE IF NOT EXISTS parametres (
    cle VARCHAR(100) PRIMARY KEY,
    valeur TEXT NOT NULL,
    description TEXT
);

INSERT INTO parametres (cle, valeur, description) VALUES
('max_tentatives_connexion', '3', 'Nombre maximum de tentatives de connexion avant blocage'),
('duree_blocage_minutes', '0', 'Blocage permanent — seul le manager peut débloquer un compte'),
('duree_session_heures', '24', 'Durée de vie des sessions en heures'),
('prix_par_m2', '150000', 'Prix forfaitaire par m² pour le calcul du budget (en Ariary)')
ON CONFLICT (cle) DO NOTHING;

-- =========================
-- TYPES DE RÉPARATION (niveau 1 à 10)
-- =========================
CREATE TABLE IF NOT EXISTS types_reparation (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    niveau INTEGER NOT NULL CHECK (niveau >= 1 AND niveau <= 10),
    description TEXT,
    UNIQUE(nom)
);

INSERT INTO types_reparation (nom, niveau, description) VALUES
('Fissure légère', 1, 'Petite fissure superficielle'),
('Fissure moyenne', 2, 'Fissure visible nécessitant colmatage'),
('Nid de poule petit', 3, 'Petit nid de poule < 30cm'),
('Nid de poule moyen', 4, 'Nid de poule 30-60cm'),
('Nid de poule large', 5, 'Grand nid de poule > 60cm'),
('Affaissement léger', 6, 'Léger affaissement de la chaussée'),
('Affaissement important', 7, 'Affaissement significatif'),
('Dégradation surface', 8, 'Surface de route très dégradée'),
('Effondrement partiel', 9, 'Effondrement partiel de la route'),
('Destruction totale', 10, 'Route totalement détruite/impraticable')
ON CONFLICT (nom) DO NOTHING;

-- =========================
-- SIGNALEMENTS
-- =========================
CREATE TABLE IF NOT EXISTS signalements (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'NOUVEAU',
    avancement INTEGER NOT NULL DEFAULT 0,
    type_reparation_id INTEGER REFERENCES types_reparation(id) ON DELETE SET NULL,
    niveau INTEGER DEFAULT 1 CHECK (niveau >= 1 AND niveau <= 10),
    surface_m2 NUMERIC(10,2),
    prix_par_m2 NUMERIC(12,2),
    budget NUMERIC(12,2),
    entreprise VARCHAR(255),
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
    modifie_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- =========================
-- PHOTOS (avec support base64)
-- =========================
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    signalement_id INTEGER NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    mimetype VARCHAR(100),
    size INTEGER,
    base64_data TEXT,
    date_ajout TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
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

-- Trigger: calcul automatique du budget = prix_par_m2 * niveau * surface_m2
CREATE OR REPLACE FUNCTION calculer_budget()
RETURNS TRIGGER AS $$
DECLARE
    v_prix NUMERIC;
BEGIN
    IF NEW.prix_par_m2 IS NULL THEN
        SELECT valeur::NUMERIC INTO v_prix FROM parametres WHERE cle = 'prix_par_m2';
        NEW.prix_par_m2 = COALESCE(v_prix, 150000);
    END IF;
    IF NEW.surface_m2 IS NOT NULL AND NEW.niveau IS NOT NULL THEN
        NEW.budget = NEW.prix_par_m2 * NEW.niveau * NEW.surface_m2;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculer_budget ON signalements;
CREATE TRIGGER trg_calculer_budget
BEFORE INSERT OR UPDATE ON signalements
FOR EACH ROW
EXECUTE FUNCTION calculer_budget();

-- =========================
-- DONNÉES DE TEST
-- =========================

-- Manager: manager@cloudmap.mg / Manager123!
INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role_id)
VALUES (
    'Manager Admin',
    'manager@cloudmap.mg',
    crypt('Manager123!', gen_salt('bf')),
    (SELECT id FROM roles WHERE nom = 'MANAGER')
)
ON CONFLICT (email) DO NOTHING;

-- Utilisateur: user@cloudmap.mg / User1234!
INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role_id)
VALUES (
    'Utilisateur Test',
    'user@cloudmap.mg',
    crypt('User1234!', gen_salt('bf')),
    (SELECT id FROM roles WHERE nom = 'UTILISATEUR')
)
ON CONFLICT (email) DO NOTHING;

-- Utilisateur: rado@cloudmap.mg / Rado1234!
INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role_id)
VALUES (
    'Rado Andriamahefa',
    'rado@cloudmap.mg',
    crypt('Rado1234!', gen_salt('bf')),
    (SELECT id FROM roles WHERE nom = 'UTILISATEUR')
)
ON CONFLICT (email) DO NOTHING;

-- Utilisateur: nirina@cloudmap.mg / Nirina12!
INSERT INTO utilisateurs (nom, email, mot_de_passe_hash, role_id)
VALUES (
    'Nirina Rakoto',
    'nirina@cloudmap.mg',
    crypt('Nirina12!', gen_salt('bf')),
    (SELECT id FROM roles WHERE nom = 'UTILISATEUR')
)
ON CONFLICT (email) DO NOTHING;

-- 30 signalements de test (budget calculé automatiquement par trigger)
INSERT INTO signalements (utilisateur_id, titre, description, latitude, longitude, statut, avancement, niveau, surface_m2, entreprise, date_nouveau, date_en_cours, date_termine) VALUES
-- NOUVEAU (10)
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Nid de poule Avenue de l''Indépendance', 'Grand nid de poule dangereux au centre-ville près du marché', -18.9137, 47.5226, 'NOUVEAU', 0, 4, 15.50, NULL, NOW() - INTERVAL '1 day', NULL, NULL),
((SELECT id FROM utilisateurs WHERE email='rado@cloudmap.mg'), 'Trous multiples Ankadifotsy', 'Plusieurs trous sur la chaussée causés par les pluies', -18.9200, 47.5100, 'NOUVEAU', 0, 5, 30.00, NULL, NOW() - INTERVAL '3 days', NULL, NULL),
(NULL, 'Dégradation carrefour Ambohijatovo', 'Carrefour très endommagé avec risque d''accident', -18.9080, 47.5280, 'NOUVEAU', 0, 6, 200.00, NULL, NOW() - INTERVAL '2 days', NULL, NULL),
((SELECT id FROM utilisateurs WHERE email='nirina@cloudmap.mg'), 'Fissures route Isotry', 'Fissures profondes sur la rue principale d''Isotry', -18.9050, 47.5220, 'NOUVEAU', 0, 3, 22.00, NULL, NOW() - INTERVAL '5 days', NULL, NULL),
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Affaissement chaussée Besarety', 'Affaissement visible devant l''hôpital', -18.9000, 47.5280, 'NOUVEAU', 0, 7, 55.00, NULL, NOW(), NULL, NULL),
((SELECT id FROM utilisateurs WHERE email='rado@cloudmap.mg'), 'Nid de poule Andavamamba', 'Nid de poule de 50cm au milieu de la route', -18.9170, 47.5220, 'NOUVEAU', 0, 4, 12.00, NULL, NOW() - INTERVAL '4 days', NULL, NULL),
((SELECT id FROM utilisateurs WHERE email='nirina@cloudmap.mg'), 'Surface dégradée 67Ha', 'Revêtement fortement abîmé sur la montée de 67Ha', -18.9150, 47.5200, 'NOUVEAU', 0, 8, 95.00, NULL, NOW() - INTERVAL '6 days', NULL, NULL),
(NULL, 'Crevasses route Ankadimbahoaka', 'Crevasses larges sur la RN7 vers Ankadimbahoaka', -18.9550, 47.5250, 'NOUVEAU', 0, 9, 150.00, NULL, NOW() - INTERVAL '1 day', NULL, NULL),
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Trou dangereux Tanjombato', 'Trou profond non signalé près du pont', -18.9500, 47.5250, 'NOUVEAU', 0, 5, 18.00, NULL, NOW() - INTERVAL '7 days', NULL, NULL),
((SELECT id FROM utilisateurs WHERE email='rado@cloudmap.mg'), 'Nid de poule Ambohimanarina', 'Petit nid de poule sur la descente', -18.8850, 47.5100, 'NOUVEAU', 0, 2, 8.00, NULL, NOW() - INTERVAL '2 days', NULL, NULL),

-- EN_COURS (10)
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Route dégradée Analakely', 'Revêtement très abîmé sur 50m devant le marché', -18.9100, 47.5250, 'EN_COURS', 50, 8, 120.00, 'COLAS Madagascar', NOW() - INTERVAL '25 days', NOW() - INTERVAL '15 days', NULL),
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Affaissement route Ivandry', 'Affaissement important près du canal', -18.8850, 47.5350, 'EN_COURS', 50, 7, 45.00, 'COLAS Madagascar', NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days', NULL),
((SELECT id FROM utilisateurs WHERE email='manager@cloudmap.mg'), 'Route effondrée Ampefiloha', 'Effondrement partiel de la route après saison des pluies', -18.9180, 47.5150, 'EN_COURS', 50, 9, 65.00, 'ENTREPRISE MALAKY', NOW() - INTERVAL '30 days', NOW() - INTERVAL '18 days', NULL),
((SELECT id FROM utilisateurs WHERE email='nirina@cloudmap.mg'), 'Reconstruction chaussée Ankorondrano', 'Chaussée détruite sur 80m le long du by-pass', -18.8900, 47.5300, 'EN_COURS', 50, 10, 250.00, 'SOGEA SATOM', NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days', NULL),
((SELECT id FROM utilisateurs WHERE email='rado@cloudmap.mg'), 'Réparation route Andraharo', 'Travaux de réparation en cours sur la nationale', -18.8780, 47.5400, 'EN_COURS', 50, 6, 38.00, 'COLAS Madagascar', NOW() - INTERVAL '18 days', NOW() - INTERVAL '8 days', NULL),
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Réhabilitation rue Antanimena', 'Réfection complète de la chaussée', -18.9020, 47.5300, 'EN_COURS', 50, 7, 85.00, 'ENTREPRISE MALAKY', NOW() - INTERVAL '22 days', NOW() - INTERVAL '12 days', NULL),
((SELECT id FROM utilisateurs WHERE email='nirina@cloudmap.mg'), 'Colmatage fissures Alarobia', 'Colmatage des fissures sur la route principale', -18.8880, 47.5250, 'EN_COURS', 50, 3, 20.00, 'SOGEA SATOM', NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', NULL),
((SELECT id FROM utilisateurs WHERE email='manager@cloudmap.mg'), 'Travaux route Andraisoro', 'Reconstruction partielle du tronçon', -18.8950, 47.5120, 'EN_COURS', 50, 8, 110.00, 'COLAS Madagascar', NOW() - INTERVAL '35 days', NOW() - INTERVAL '20 days', NULL),
((SELECT id FROM utilisateurs WHERE email='rado@cloudmap.mg'), 'Réfection Amboditsiry', 'Travaux de nivellement de la chaussée', -18.8950, 47.5400, 'EN_COURS', 50, 5, 42.00, 'ENTREPRISE MALAKY', NOW() - INTERVAL '15 days', NOW() - INTERVAL '7 days', NULL),
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Réparation pont Androhibe', 'Réparation de la surface du pont endommagé', -18.8780, 47.5480, 'EN_COURS', 50, 6, 35.00, 'SOGEA SATOM', NOW() - INTERVAL '28 days', NOW() - INTERVAL '14 days', NULL),

-- TERMINE (10)
((SELECT id FROM utilisateurs WHERE email='manager@cloudmap.mg'), 'Fissures Boulevard Ratsimilaho', 'Nombreuses fissures longitudinales réparées', -18.9050, 47.5180, 'TERMINE', 100, 2, 85.00, 'SOGEA SATOM', NOW() - INTERVAL '60 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days'),
(NULL, 'Nids de poule Tsaralalana', 'Zone avec multiples nids de poule colmatés', -18.9120, 47.5300, 'TERMINE', 100, 3, 40.00, 'SOGEA SATOM', NOW() - INTERVAL '50 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '8 days'),
((SELECT id FROM utilisateurs WHERE email='nirina@cloudmap.mg'), 'Route réhabilitée Ambatobe', 'Réhabilitation totale du tronçon terminée', -18.8700, 47.5450, 'TERMINE', 100, 5, 70.00, 'COLAS Madagascar', NOW() - INTERVAL '55 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '12 days'),
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Chaussée refaite Mahamasina', 'Réfection complète du revêtement', -18.9200, 47.5200, 'TERMINE', 100, 4, 60.00, 'ENTREPRISE MALAKY', NOW() - INTERVAL '40 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '5 days'),
((SELECT id FROM utilisateurs WHERE email='rado@cloudmap.mg'), 'Nid de poule colmaté Antsahavola', 'Colmatage réussi du nid de poule', -18.9070, 47.5250, 'TERMINE', 100, 3, 10.00, 'SOGEA SATOM', NOW() - INTERVAL '35 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '7 days'),
((SELECT id FROM utilisateurs WHERE email='manager@cloudmap.mg'), 'Réparation rue Ambanidia', 'Travaux de réparation achevés', -18.8980, 47.5180, 'TERMINE', 100, 6, 48.00, 'COLAS Madagascar', NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '3 days'),
((SELECT id FROM utilisateurs WHERE email='nirina@cloudmap.mg'), 'Surface refaite Mahazo', 'Resurfaçage terminé avec succès', -18.9250, 47.5170, 'TERMINE', 100, 7, 90.00, 'ENTREPRISE MALAKY', NOW() - INTERVAL '70 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '15 days'),
((SELECT id FROM utilisateurs WHERE email='user@cloudmap.mg'), 'Réfection Ambohipo', 'Route complètement refaite', -18.9350, 47.5200, 'TERMINE', 100, 4, 55.00, 'SOGEA SATOM', NOW() - INTERVAL '38 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '6 days'),
((SELECT id FROM utilisateurs WHERE email='rado@cloudmap.mg'), 'Colmatage Anjezika', 'Tous les trous ont été colmatés', -18.9450, 47.5150, 'TERMINE', 100, 3, 25.00, 'COLAS Madagascar', NOW() - INTERVAL '42 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '9 days'),
((SELECT id FROM utilisateurs WHERE email='nirina@cloudmap.mg'), 'Route réparée Andoharanofotsy', 'Réparation complète de la chaussée', -18.9600, 47.5300, 'TERMINE', 100, 8, 130.00, 'SOGEA SATOM', NOW() - INTERVAL '65 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_signalements_statut ON signalements(statut);
CREATE INDEX IF NOT EXISTS idx_signalements_utilisateur ON signalements(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_photos_signalement ON photos(signalement_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_utilisateur ON sessions(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_notifications_utilisateur ON notifications(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_tentatives_utilisateur ON tentatives_connexion(utilisateur_id);
