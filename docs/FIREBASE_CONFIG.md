# Guide de Configuration Firebase - CloudMap Mobile

## Introduction

Ce guide explique comment configurer Firebase pour l'application CloudMap Mobile. Nous utilisons les services **gratuits** de Firebase :
- **Firebase Authentication** : Pour la connexion des utilisateurs
- **Firebase Realtime Database** : Pour stocker les signalements et les notifications

> ⚠️ **Note importante** : Firebase Storage n'est pas utilisé car il nécessite un plan payant (Blaze). Les photos sont stockées localement sur l'appareil via IndexedDB.

---

## Étape 1 : Créer un projet Firebase

1. Rendez-vous sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"**
3. Donnez un nom à votre projet (ex: `cloudmap-mobile`)
4. Désactivez Google Analytics si vous le souhaitez (optionnel)
5. Cliquez sur **"Créer le projet"**

---

## Étape 2 : Configurer Firebase Authentication

### Activer l'authentification par Email/Mot de passe

1. Dans Firebase Console, allez dans **"Authentication"** > **"Sign-in method"**
2. Cliquez sur **"Email/Mot de passe"**
3. Activez **"Email/Mot de passe"**
4. Cliquez sur **"Enregistrer"**

### Créer des utilisateurs (via le Manager Web)

Les utilisateurs sont créés uniquement via l'application web par le Manager :
- Le Manager se connecte à l'application web
- Il peut créer des comptes utilisateurs pour les agents mobiles
- Les agents utilisent ces identifiants pour se connecter sur mobile

---

## Étape 3 : Configurer Firebase Realtime Database

### Créer la base de données

1. Dans Firebase Console, allez dans **"Realtime Database"**
2. Cliquez sur **"Créer une base de données"**
3. Choisissez l'emplacement (ex: `europe-west1`)
4. Sélectionnez **"Démarrer en mode test"** pour commencer
5. Cliquez sur **"Activer"**

### Configurer les règles de sécurité

Dans l'onglet **"Règles"**, copiez ces règles :

```json
{
  "rules": {
    "signalements": {
      ".read": true,
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('role').val() == 'manager' || root.child('users').child(auth.uid).child('role').val() == 'admin')"
      }
    },
    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null"
      }
    }
  }
}
```

**Explication des règles :**
- `signalements` : Tout le monde peut lire, seuls les utilisateurs connectés peuvent écrire
- `users` : Les utilisateurs peuvent lire/modifier leur propre profil, les managers peuvent modifier tous les profils
- `notifications` : Chaque utilisateur ne peut lire que ses propres notifications

---

## Étape 4 : Obtenir les clés de configuration

1. Dans Firebase Console, cliquez sur l'icône ⚙️ (Paramètres) > **"Paramètres du projet"**
2. Descendez jusqu'à **"Vos applications"**
3. Cliquez sur l'icône **Web** (`</>`)
4. Donnez un nom à votre application (ex: `cloudmap-mobile-web`)
5. Cliquez sur **"Enregistrer l'application"**
6. Copiez les valeurs de configuration

---

## Étape 5 : Configurer l'application mobile

### Créer le fichier .env

Créez un fichier `.env` à la racine du dossier `mobile/` :

```env
# Configuration Firebase
VITE_FIREBASE_API_KEY=AIzaSy...votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://votre-projet-default-rtdb.europe-west1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

> ⚠️ **Important** : N'oubliez pas d'ajouter `.env` à votre `.gitignore` !

---

## Fonctionnalité : Limite de 3 tentatives de connexion

L'application implémente une limite de tentatives de connexion pour sécuriser les comptes :

### Comment ça fonctionne

1. **Comptage des tentatives** : À chaque échec de connexion, un compteur est incrémenté dans Firebase
2. **Blocage automatique** : Après 3 tentatives échouées, le compte est bloqué
3. **Déblocage** : Seul un Manager peut débloquer un compte via l'application web

### Structure des données utilisateur

```json
{
  "users": {
    "uid_utilisateur": {
      "email": "user@example.com",
      "nom": "Dupont",
      "prenom": "Jean",
      "role": "mobile_user",
      "isBlocked": false,
      "loginAttempts": 0,
      "lastLoginAttempt": null,
      "createdAt": 1706886400000,
      "updatedAt": 1706886400000
    }
  }
}
```

### Code source

Le code de gestion des tentatives se trouve dans :
- `src/services/firebaseAuthService.ts` : Fonctions `incrementLoginAttempts()` et `resetLoginAttempts()`

---

## Fonctionnalité : Notifications de changement de statut

Les utilisateurs reçoivent une notification quand le statut de leurs signalements change.

### Comment ça fonctionne

1. **Écoute en temps réel** : L'application écoute les changements dans Firebase Realtime Database
2. **Détection de changement** : Quand un statut change, une notification est déclenchée
3. **Affichage** : 
   - Toast notification dans l'application
   - Notification système (si permission accordée)

### Activer les notifications

L'application demandera automatiquement la permission pour les notifications au premier lancement après connexion.

### Code source

Le service de notification se trouve dans :
- `src/services/notificationService.ts`

---

## Structure de la base de données Firebase

### Signalements

```json
{
  "signalements": {
    "-NxXxXxXxXxXxXxXx": {
      "titre": "Nid de poule rue Analakely",
      "description": "Grand trou sur la route principale",
      "type": "nid_de_poule",
      "statut": "nouveau",
      "latitude": -18.9100,
      "longitude": 47.5255,
      "user_id": "uid_utilisateur",
      "user_email": "user@example.com",
      "photos": ["data:image/jpeg;base64,..."],
      "date_creation": "2026-02-03T10:30:00.000Z",
      "date_modification": "2026-02-03T10:30:00.000Z"
    }
  }
}
```

### Utilisateurs

```json
{
  "users": {
    "uid_utilisateur": {
      "email": "user@example.com",
      "nom": "Rakoto",
      "prenom": "Jean",
      "role": "mobile_user",
      "isBlocked": false,
      "loginAttempts": 0,
      "lastLoginAttempt": null,
      "createdAt": 1706886400000,
      "updatedAt": 1706886400000
    }
  }
}
```

---

## Stockage des photos (Local)

Comme Firebase Storage nécessite un plan payant, les photos sont stockées localement :

### Technologie utilisée
- **IndexedDB** : Base de données locale du navigateur

### Avantages
- Gratuit
- Pas de limite de stockage (dépend de l'appareil)
- Fonctionne hors ligne

### Limites
- Les photos ne sont pas synchronisées entre appareils
- Si l'application est désinstallée, les photos sont perdues

### Code source
Le service de stockage local se trouve dans :
- `src/services/localStorageService.ts`

---

## Dépannage

### La carte ne s'affiche pas

1. Vérifiez votre connexion Internet
2. Vérifiez que Leaflet est bien importé
3. Regardez la console pour les erreurs

### Erreur "Permission denied" Firebase

1. Vérifiez que l'utilisateur est connecté
2. Vérifiez les règles de sécurité dans Firebase Console
3. Assurez-vous que le token n'a pas expiré

### L'authentification ne fonctionne pas

1. Vérifiez les clés de configuration dans `.env`
2. Vérifiez que l'authentification Email/Password est activée
3. Vérifiez la console pour les erreurs détaillées

### Les notifications ne fonctionnent pas

1. Vérifiez que vous avez accordé les permissions
2. Les notifications système ne fonctionnent pas sur iOS Safari
3. Vérifiez que le service est initialisé après connexion

---

## Commandes utiles

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Compiler pour la production
npm run build

# Synchroniser avec Capacitor (Android)
npm run cap:sync

# Ouvrir le projet Android
npm run cap:android
```

---

## Support

Pour toute question, consultez :
- [Documentation Firebase](https://firebase.google.com/docs)
- [Documentation Ionic](https://ionicframework.com/docs)
- [Documentation Leaflet](https://leafletjs.com/reference.html)
