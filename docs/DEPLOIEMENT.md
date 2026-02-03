# CloudMap Mobile - Guide de Déploiement et Configuration

## Table des matières

1. [Présentation](#présentation)
2. [Configuration Firebase](#configuration-firebase)
3. [Installation locale](#installation-locale)
4. [Configuration de l'application](#configuration-de-lapplication)
5. [Build et déploiement](#build-et-déploiement)
6. [Gestion des utilisateurs](#gestion-des-utilisateurs)
7. [Dépannage](#dépannage)

---

## Présentation

CloudMap Mobile est une application Ionic Vue.js TypeScript permettant aux agents de terrain de :
- Se connecter avec leurs identifiants (créés par un Manager)
- Visualiser les signalements de travaux routiers sur une carte
- Créer de nouveaux signalements avec photos et géolocalisation
- Consulter les statistiques et l'état d'avancement des travaux

### Stack technique

- **Framework** : Ionic 7 + Vue.js 3 + TypeScript
- **Cartographie** : Leaflet + OpenStreetMap
- **Authentification** : Firebase Authentication
- **Base de données** : Firebase Realtime Database
- **Stockage** : Firebase Storage
- **State Management** : Pinia

---

## Configuration Firebase

### Prérequis Firebase

1. Un projet Firebase créé sur [console.firebase.google.com](https://console.firebase.google.com)
2. L'authentification par Email/Mot de passe activée
3. Realtime Database créée et configurée
4. Firebase Storage activé

### Étapes de configuration

#### 1. Créer le projet Firebase

1. Aller sur la console Firebase
2. Cliquer sur "Ajouter un projet"
3. Suivre les étapes de création

#### 2. Activer l'authentification Email/Password

1. Dans le menu Firebase : **Authentication** > **Sign-in method**
2. Activer "E-mail/mot de passe"
3. Sauvegarder

#### 3. Créer la Realtime Database

1. Aller dans **Realtime Database**
2. Cliquer sur "Créer une base de données"
3. Choisir un emplacement (ex: europe-west1)
4. Démarrer en mode test

#### 4. Configurer les règles de sécurité

Dans Realtime Database > Règles :

```json
{
  "rules": {
    "signalements": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth.uid == $uid || root.child('users').child(auth.uid).child('role').val() == 'manager' || root.child('users').child(auth.uid).child('role').val() == 'admin'"
      }
    }
  }
}
```

#### 5. Activer Firebase Storage

1. Aller dans **Storage**
2. Cliquer sur "Commencer"
3. Configurer les règles :

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /signalements/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

#### 6. Récupérer les clés de configuration

1. Aller dans **Paramètres du projet** (⚙️)
2. Section "Vos applications" > Ajouter une application Web
3. Copier les valeurs de configuration

---

## Installation locale

### Prérequis

- Node.js >= 18.x
- npm >= 9.x
- Git

### Installation

```bash
# Cloner le projet (si pas déjà fait)
git clone <url-du-repo>

# Aller dans le dossier mobile
cd project-cloud-map/mobile

# Installer les dépendances
npm install
```

### Configuration des variables d'environnement

Créer le fichier `.env` à la racine du dossier `mobile/` :

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://votre-projet-default-rtdb.europe-west1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# API Identity Provider (optionnel si utilisation avec le backend)
VITE_API_AUTH_URL=http://localhost:3000
```

### Démarrer en développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5174`

---

## Configuration de l'application

### Structure des fichiers de configuration

```
mobile/
├── .env                    # Variables d'environnement
├── src/
│   ├── config/
│   │   └── firebase.ts     # Configuration Firebase
│   └── utils/
│       └── constants.ts    # Constantes de l'application
```

### Configuration Firebase (src/config/firebase.ts)

Ce fichier utilise les variables d'environnement :

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

### Configuration de la carte (src/utils/constants.ts)

```typescript
export const MAP_CONFIG = {
  DEFAULT_CENTER: { lat: -18.8792, lng: 47.5079 }, // Antananarivo
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
};
```

---

## Build et déploiement

### Génération des icônes

```bash
# S'assurer que sharp est installé
npm install sharp

# Générer les icônes pour toutes les plateformes
node scripts/generate-icons.js
```

Les icônes seront générées dans :
- `resources/icons/android/` - Pour Android
- `resources/icons/ios/` - Pour iOS
- `resources/icons/pwa/` - Pour le PWA
- `public/favicon.png` - Favicon
- `public/icon-512.png` - Icône principale

### Build Web (PWA)

```bash
npm run build
```

Les fichiers de production seront dans le dossier `dist/`

### Build Android

#### Prérequis Android

1. Android Studio installé
2. SDK Android configuré (API 33+)
3. Variables d'environnement :
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

#### Commandes de build

```bash
# Synchroniser le projet avec Capacitor
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android

# OU builder en ligne de commande
cd android
./gradlew assembleDebug
```

L'APK de debug sera dans : `android/app/build/outputs/apk/debug/app-debug.apk`

#### Build APK signé (Production)

```bash
# Construire la version web
npm run build

# Synchroniser
npx cap sync android

# Dans Android Studio : Build > Generate Signed Bundle/APK
# OU en ligne de commande avec un keystore
cd android
./gradlew assembleRelease
```

### Build iOS (macOS requis)

```bash
# Synchroniser
npx cap sync ios

# Ouvrir dans Xcode
npx cap open ios
```

---

## Gestion des utilisateurs

### Principe de fonctionnement

- **Les utilisateurs mobiles NE PEUVENT PAS s'inscrire eux-mêmes**
- Seul un Manager peut créer des comptes depuis l'interface web
- L'utilisateur reçoit ses identifiants par email ou autre moyen
- Après 3 tentatives de connexion échouées, le compte est bloqué
- Seul le Manager peut débloquer un compte

### Créer un utilisateur (côté Manager)

1. Se connecter à l'interface web en tant que Manager
2. Aller dans la section "Utilisateurs"
3. Cliquer sur "Créer un utilisateur"
4. Remplir : email, mot de passe temporaire, nom, prénom
5. L'utilisateur peut ensuite se connecter sur mobile

### Débloquer un utilisateur

Si un utilisateur est bloqué après 3 tentatives :

1. Dans l'interface web Manager : aller à "Utilisateurs bloqués"
2. Sélectionner l'utilisateur
3. Cliquer sur "Débloquer"
4. L'utilisateur peut à nouveau se connecter

### Structure des données utilisateur dans Firebase

```json
{
  "users": {
    "uid_firebase": {
      "email": "user@example.com",
      "nom": "Dupont",
      "prenom": "Jean",
      "role": "mobile_user",
      "isBlocked": false,
      "loginAttempts": 0,
      "lastLoginAttempt": null,
      "createdAt": 1706367600000,
      "updatedAt": 1706367600000
    }
  }
}
```

---

## Dépannage

### Problèmes de connexion

#### "Aucun compte trouvé avec cet email"
- Vérifier que le compte a bien été créé par le Manager
- Vérifier l'orthographe de l'email

#### "Compte bloqué"
- Le compte a atteint 3 tentatives échouées
- Contacter le Manager pour déblocage

#### "Erreur de connexion Firebase"
- Vérifier la connexion internet
- Vérifier les clés Firebase dans `.env`
- Vérifier que l'authentification email/password est activée

### Problèmes de carte

#### La carte ne s'affiche pas
- Vérifier la connexion internet (les tuiles viennent d'OpenStreetMap)
- Vérifier les erreurs dans la console du navigateur
- Vérifier que Leaflet est bien chargé

#### La géolocalisation ne fonctionne pas
- Autoriser la géolocalisation dans les paramètres
- Sur Android, vérifier les permissions de l'application
- En HTTPS, la géolocalisation requiert un certificat valide

### Problèmes de build Android

#### Erreur Gradle
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

#### Erreur de synchronisation Capacitor
```bash
npx cap clean android
npx cap sync android
```

#### Problème de version SDK
Vérifier `android/variables.gradle` :
```gradle
minSdkVersion = 22
compileSdkVersion = 34
targetSdkVersion = 34
```

### Logs et debugging

#### Logs de l'application mobile
```bash
# Android via adb
adb logcat | grep -i "capacitor\|vue\|firebase"

# Ou utiliser Chrome DevTools pour le mode web
```

#### Logs Firebase
- Aller dans Firebase Console > Realtime Database
- Utiliser l'onglet "Usage" pour voir les requêtes
- Vérifier les règles de sécurité si erreur de permission

---

## Commandes utiles

```bash
# Développement
npm run dev                    # Démarrer en mode développement
npm run build                  # Build de production
npm run preview                # Prévisualiser le build

# Capacitor
npx cap sync                   # Synchroniser tous les projets natifs
npx cap sync android           # Synchroniser Android seulement
npx cap open android           # Ouvrir dans Android Studio
npx cap run android            # Déployer sur appareil/émulateur

# Icônes
node scripts/generate-icons.js # Générer les icônes

# Tests
npm run test:unit              # Tests unitaires
npm run test:e2e               # Tests E2E avec Cypress
```

---

## Support

Pour toute question :
1. Vérifier ce guide de dépannage
2. Consulter les logs de l'application
3. Ouvrir une issue sur le repository

---

*Dernière mise à jour : 27 Janvier 2026*
