# CloudMap Mobile

Application mobile pour la gestion des travaux routiers à Antananarivo, développée avec Ionic Vue.js TypeScript.

## 🎨 Design

L'interface est inspirée de Magic Earth avec une palette violet/bleu moderne (#6B4FFF, #4F46E5).

## 📱 Fonctionnalités

### Authentification
- Connexion via l'API d'authentification (pas d'inscription possible)
- Gestion des sessions avec tokens JWT
- Blocage après 3 tentatives échouées

### Carte Interactive
- Carte Leaflet avec OpenStreetMap
- Géolocalisation de l'utilisateur
- Marqueurs personnalisés selon le statut (nouveau, en cours, terminé)
- Bottom sheet pour les détails des signalements

### Gestion des Signalements
- Création de signalements avec photo
- Filtrage par statut ou par utilisateur
- Synchronisation temps réel avec Firebase
- Statistiques et graphiques

### Profil
- Modification des informations personnelles
- Historique des signalements créés
- Déconnexion sécurisée

## 🛠️ Stack Technique

- **Framework**: Ionic 8 + Vue.js 3 + TypeScript
- **State Management**: Pinia
- **Cartographie**: Leaflet + OpenStreetMap
- **Backend**: Firebase (Realtime Database + Storage)
- **API**: Axios pour l'authentification
- **Charts**: Chart.js + vue-chartjs
- **Mobile**: Capacitor (Android/iOS)

## 📦 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Android Studio (pour Android)
- Xcode (pour iOS, macOS uniquement)

### Configuration

1. Cloner le projet
```bash
git clone <repository-url>
cd mobile
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env
```

4. Remplir le fichier `.env` avec vos clés Firebase et l'URL de l'API d'authentification

### Développement

```bash
# Démarrer le serveur de développement
npm run dev

# Lancer les tests
npm run test:unit
npm run test:e2e
```

### Build et Déploiement

```bash
# Build de production
npm run build

# Ajouter la plateforme Android
npx cap add android

# Synchroniser avec Capacitor
npx cap sync

# Ouvrir dans Android Studio
npx cap open android

# Ou générer l'APK directement
cd android && ./gradlew assembleDebug
```

## 📁 Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── CreateSignalementModal.vue
│   ├── SignalementBottomSheet.vue
│   ├── SignalementCard.vue
│   ├── StatsCard.vue
│   └── UserAvatar.vue
├── config/              # Configuration (Firebase)
│   └── firebase.ts
├── models/              # Interfaces TypeScript
│   ├── ApiResponse.ts
│   ├── Signalement.ts
│   └── User.ts
├── router/              # Configuration des routes
│   └── index.ts
├── services/            # Services (API, Firebase, Map)
│   ├── authService.ts
│   ├── firebaseService.ts
│   └── mapService.ts
├── stores/              # Stores Pinia
│   ├── auth.ts
│   ├── map.ts
│   └── signalements.ts
├── utils/               # Utilitaires
│   ├── constants.ts
│   ├── formatters.ts
│   └── validators.ts
├── views/               # Pages de l'application
│   ├── ActivitiesView.vue
│   ├── LoginView.vue
│   ├── MapView.vue
│   ├── ProfileView.vue
│   └── TabsPage.vue
└── theme/               # Variables CSS
    └── variables.css
```

## 🔐 Intégration avec les autres modules

### Module Authentification (API Node.js)
- POST `/api/auth/login` - Connexion
- PUT `/api/auth/profile` - Mise à jour profil
- POST `/api/auth/logout` - Déconnexion
- GET `/api/auth/check-session` - Vérification session

### Module Web (Manager)
- Création de comptes utilisateurs
- Déblocage des comptes
- Modification des statuts de signalements

### Firebase
- Synchronisation temps réel des signalements
- Stockage des photos

## 📋 Tests

### Tests Unitaires (Vitest)
```bash
npm run test:unit
```

### Tests E2E (Cypress)
```bash
npm run test:e2e
```

## 🎯 Règles de Gestion

- ✅ Les utilisateurs mobiles ne peuvent PAS s'inscrire eux-mêmes
- ✅ Limite de 3 tentatives de connexion
- ✅ Seul le Manager peut débloquer un compte
- ✅ Les signalements sont synchronisés en temps réel
- ✅ Les icônes sont identiques au module web

## 📄 Licence

Projet académique - P17 Cloud Computing

## 👥 Équipe

- [Nom Prénom - NumETU]
