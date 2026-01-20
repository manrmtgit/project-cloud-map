# Frontend - Cloud Map

Application frontend React pour le projet Cloud Map avec authentification.

## 🚀 Technologies

- **React 18** - Framework UI
- **Vite** - Build tool rapide
- **React Router v6** - Routing
- **Axios** - Client HTTP
- **Docker** - Conteneurisation

## 📁 Structure du projet

```
frontend/
├── src/
│   ├── components/       # Composants réutilisables
│   ├── context/          # Contextes React (Auth)
│   ├── pages/            # Pages de l'application
│   ├── services/         # Services API
│   ├── App.jsx           # Composant principal
│   ├── main.jsx          # Point d'entrée
│   └── index.css         # Styles globaux
├── public/               # Fichiers statiques
├── Dockerfile            # Config Docker (dev)
├── Dockerfile.prod       # Config Docker (prod)
├── docker-compose.yml    # Orchestration complète
├── nginx.conf            # Config Nginx (prod)
└── vite.config.js        # Config Vite
```

## 🐳 Démarrage avec Docker

### Mode développement (avec hot reload)

```bash
# Depuis le dossier frontend
docker-compose up --build
```

Cela démarre :
- Frontend React sur http://localhost:5173
- API Backend sur http://localhost:3000
- PostgreSQL sur localhost:5432

### Mode production

```bash
# Build l'image de production
docker build -f Dockerfile.prod -t frontend-prod .

# Lancer le conteneur
docker run -p 80:80 frontend-prod
```

## 💻 Développement local (sans Docker)

```bash
# Installer les dépendances
npm install

# Démarrer en mode dev
npm run dev

# Build pour production
npm run build

# Prévisualiser le build
npm run preview
```

## 🔐 Fonctionnalités

- **Authentification** : Login / Register / Logout
- **Gestion du profil** : Voir et modifier son profil
- **Dashboard** : Liste des utilisateurs
- **Routes protégées** : Accès restreint aux utilisateurs connectés

## 🌐 Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_API_URL` | URL de l'API backend | `http://localhost:3000` |

## 📡 API Endpoints utilisés

### Auth
- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion
- `GET /auth/verify` - Vérifier le token

### Users
- `GET /users/profile` - Profil utilisateur
- `PUT /users/profile` - Modifier profil
- `DELETE /users/profile` - Supprimer compte
- `GET /users` - Liste des utilisateurs
