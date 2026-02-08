# 🚀 Guide de Déploiement - CloudMap

## Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│   Frontend      │    │  Identity Provider   │    │   PostgreSQL     │
│   React + Vite  │───▶│  Node.js + Express   │───▶│   15-alpine      │
│   Port: 5173    │    │  Port: 3000          │    │   Port: 5432     │
└─────────────────┘    └──────────────────────┘    └──────────────────┘
                                                    
┌─────────────────┐    ┌──────────────────────┐
│   Mobile App    │    │   Tileserver-GL      │
│   Ionic/Vue     │    │   Carte offline      │
│   Capacitor     │    │   Port: 8080         │
└─────────────────┘    └──────────────────────┘
```

---

## Prérequis

- **Docker** & **Docker Compose** installés
- **Node.js** >= 20 (pour développement local)
- **Git** pour le versioning

---

## 🐳 Déploiement Docker (Recommandé)

### Option 1 : Via le docker-compose du frontend (stack complète)

```bash
cd frontend
docker-compose up -d --build
```

Cela démarre :
| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Application React |
| **API** | http://localhost:3000 | Identity Provider REST API |
| **Swagger** | http://localhost:3000/api-docs | Documentation API |
| **PostgreSQL** | localhost:5432 | Base de données |
| **Tileserver** | http://localhost:8080 | Carte offline Antananarivo |

### Option 2 : Via le docker-compose de l'identity-provider

```bash
cd identity-provider
docker-compose up -d --build
```

---

## Variables d'Environnement

### Identity Provider

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3000` | Port de l'API |
| `JWT_SECRET` | `default_secret_key` | ⚠️ **À changer en production** |
| `JWT_EXPIRES_IN` | `24h` | Durée de vie du token JWT |
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_USER` | `postgres` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `postgres123` | Mot de passe PostgreSQL |
| `DB_NAME` | `identity_db` | Nom de la base de données |
| `MAX_LOGIN_ATTEMPTS` | `3` | Nombre max de tentatives avant blocage |
| `SESSION_DURATION` | `24h` | Durée de vie des sessions |

### Frontend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | URL de l'API backend |

---

## 🔐 Compte Manager par Défaut

| Champ | Valeur |
|-------|--------|
| **Email** | `manager@cloudmap.local` |
| **Mot de passe** | `Manager123!` |

---

## 📖 Documentation API (Swagger)

Accessible à : **http://localhost:3000/api-docs**

### Endpoints principaux

#### Authentification
- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion (avec tracking des tentatives)
- `GET /api/auth/verify` — Vérification du token
- `POST /api/auth/refresh` — Rafraîchir le token
- `POST /api/auth/logout` — Déconnexion
- `GET /api/auth/config` — Configuration (max tentatives, durée session)
- `GET /api/auth/sessions` — Sessions actives (auth requise)
- `GET /api/auth/blocked-users` — Utilisateurs bloqués (auth requise)
- `POST /api/auth/unblock/:userId` — Débloquer un utilisateur (auth requise)

#### Utilisateurs
- `GET /api/users/profile` — Profil (auth requise)
- `PUT /api/users/profile` — Modifier profil (auth requise)
- `DELETE /api/users/profile` — Supprimer compte (auth requise)
- `GET /api/users` — Lister tous les utilisateurs (auth requise)

#### Signalements
- `GET /api/signalements` — Lister (public)
- `POST /api/signalements` — Créer (auth requise)
- `PUT /api/signalements/:id` — Modifier (auth requise)
- `DELETE /api/signalements/:id` — Supprimer (auth requise)
- `GET /api/signalements/stats` — Statistiques (public)
- `GET /api/signalements/stats/detailed` — Stats détaillées (public)

---

## 🗺️ Carte Offline

Le serveur tileserver-gl sert les tuiles vectorielles d'Antananarivo depuis le fichier `carte/antananarivo.mbtiles`.

- **URL des tuiles** : `http://localhost:8080/data/antananarivo/{z}/{x}/{y}.pbf`
- **Preview** : http://localhost:8080

---

## 📱 Application Mobile

```bash
cd mobile
npm install
npm run dev        # Dev web
npx cap sync       # Synchroniser avec Android
npx cap open android  # Ouvrir dans Android Studio
```

---

## 🔧 Développement Local (sans Docker)

### Backend
```bash
cd identity-provider
npm install
# Démarrer PostgreSQL localement ou via Docker
docker run -d --name pg-local -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=identity_db \
  -v ./init.sql:/docker-entrypoint-initdb.d/init.sql \
  postgres:15-alpine

npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔄 Réinitialisation

Pour repartir de zéro :

```bash
# Arrêter les conteneurs
docker-compose down -v

# Relancer (récrée la BDD avec init.sql)
docker-compose up -d --build
```

---

## ⚠️ Notes de Production

1. **Changer `JWT_SECRET`** — Ne jamais utiliser la valeur par défaut
2. **Changer les mots de passe PostgreSQL**
3. **Configurer CORS** — Restreindre les origines autorisées
4. **Utiliser HTTPS** — Mettre un reverse proxy (nginx) en frontal
5. **Sauvegardes PostgreSQL** — Mettre en place des backups réguliers
6. **Volumes Docker** — S'assurer que `postgres_data` et `uploads` sont persistés
