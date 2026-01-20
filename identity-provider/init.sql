-- Création de la table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances de recherche par email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- docker run --rm -v C:\cartes-offline\data:/data -v C:\cartes-offline\data:/output klokantech/tippecanoe tippecanoe -o /output/antananarivo.mbtiles /data/antananarivo.osm.pbf
