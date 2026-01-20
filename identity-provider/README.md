# Identity Provider API

API de fournisseur d'identité développée avec Node.js et Docker.

## 🚀 Démarrage rapide

### Prérequis
- Docker et Docker Compose installés
- Node.js 18+ (pour le développement local)

### Lancer avec Docker

```bash
# Construire et démarrer le conteneur
docker-compose up --build

# Ou en arrière-plan
docker-compose up -d --build
```

L'API sera disponible sur `http://localhost:3000`

### Lancer en local (sans Docker)

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev

# Ou démarrer en mode production
npm start
```

## 📚 Endpoints API

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription d'un nouvel utilisateur |
| POST | `/api/auth/login` | Connexion d'un utilisateur |
| GET | `/api/auth/verify` | Vérification d'un token JWT |
| POST | `/api/auth/refresh` | Rafraîchissement du token (authentifié) |

### Utilisateurs (authentifié requis)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users/profile` | Obtenir son profil |
| PUT | `/api/users/profile` | Mettre à jour son profil |
| DELETE | `/api/users/profile` | Supprimer son compte |
| GET | `/api/users/` | Liste des utilisateurs |

## 🧪 Exemples d'utilisation

### Inscription
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "John Doe"}'
```

### Connexion
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Accéder au profil (avec token)
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

### Vérifier un token
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

## 🔧 Configuration

Variables d'environnement (fichier `.env`) :

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| PORT | Port de l'API | 3000 |
| JWT_SECRET | Clé secrète JWT | - |
| JWT_EXPIRES_IN | Durée de validité du token | 24h |

## 📁 Structure du projet

```
identity-provider/
├── src/
│   ├── config/         # Configuration
│   ├── controllers/    # Contrôleurs
│   ├── middlewares/    # Middlewares
│   ├── models/         # Modèles de données
│   ├── routes/         # Routes API
│   └── index.js        # Point d'entrée
├── .env                # Variables d'environnement
├── .dockerignore       # Fichiers ignorés par Docker
├── .gitignore          # Fichiers ignorés par Git
├── docker-compose.yml  # Configuration Docker Compose
├── Dockerfile          # Image Docker
├── package.json        # Dépendances npm
└── README.md           # Documentation
```

## 🐳 Commandes Docker utiles

```bash
# Voir les logs
docker-compose logs -f

# Arrêter le conteneur
docker-compose down

# Reconstruire l'image
docker-compose build

# Entrer dans le conteneur
docker exec -it identity-provider-api sh
```
