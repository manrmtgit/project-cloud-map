# CloudMap Mobile - Guide des fonctionnalités

## Fonctionnalités implémentées

### 1. Authentification Firebase (Gratuit)
- **Connexion via email/mot de passe** : Les utilisateurs peuvent se connecter avec leurs identifiants
- **Gestion des sessions** : Les sessions sont persistantes via localStorage
- **Limite de tentatives** : Blocage automatique après 3 tentatives incorrectes
- **Inscription** : Uniquement via le manager dans l'application web

### 2. Carte avec Leaflet et OpenStreetMap
- **Tiles OpenStreetMap** : `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Centrage sur Antananarivo** par défaut
- **Géolocalisation** : Bouton pour centrer sur la position de l'utilisateur
- **Styles de carte** : Standard et Satellite (via ArcGIS)

### 3. Signalement des problèmes routiers
- **Création de signalement** : Clic sur la carte pour placer un marqueur
- **Formulaire complet** :
  - Titre (obligatoire)
  - Type de problème (nid de poule, fissure, affaissement, inondation, autre)
  - Description (obligatoire)
  - Photos multiples (jusqu'à 5)
- **Localisation automatique** : Coordonnées GPS sauvegardées

### 4. Gestion des photos (Firebase Storage gratuit)
- **Prise de photo** : Via la caméra
- **Sélection depuis la galerie** : Accès aux photos existantes
- **Upload multiple** : Jusqu'à 5 photos par signalement
- **Prévisualisation** : Grille de photos avec possibilité de suppression

### 5. Affichage des signalements
- **Icônes personnalisés par statut** :
  - 🔴 NOUVEAU : Rouge (#e74c3c)
  - 🟠 EN_COURS : Orange (#f39c12)
  - 🟢 TERMINE : Vert (#27ae60)
- **Bottom Sheet** : Affichage des détails au clic sur un marqueur
- **Galerie de photos** : Défilement horizontal des photos

### 6. Filtre "Mes signalements"
- **Toggle** : Afficher uniquement mes signalements
- **Compteur** : Nombre de signalements personnels affiché

### 7. Notifications de changement de statut
- **Temps réel** : Écoute des changements via Firebase Realtime Database
- **Toast notification** : Notification in-app lors d'un changement
- **Notification système** : Via l'API Web Notification (si permission accordée)

### 8. Statistiques (Page Activités)
- **Total signalements**
- **Avancement en %**
- **Surface totale**
- **Budget total**
- **Graphique par statut** (Doughnut Chart)

## Configuration Firebase

### Étapes de configuration

1. Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)

2. Activez les services suivants (gratuits) :
   - **Authentication** > Email/Password
   - **Realtime Database**
   - **Storage**

3. Copiez les configurations dans `.env` :
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Configurez les règles de sécurité dans Firebase Console

### Règles Realtime Database (développement)
```json
{
  "rules": {
    "signalements": {
      ".read": true,
      ".write": "auth != null"
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

### Règles Storage (développement)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /signalements/{signalementId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Lancement de l'application

### Mode développement (Web)
```bash
cd mobile
npm install
npm run dev
```
L'application sera accessible sur http://localhost:5173

### Build de production
```bash
npm run build
```

### Build Android (APK)
```bash
npm run build
npx cap sync android
npx cap open android
# Puis Build > Build Bundle(s) / APK(s) > Build APK dans Android Studio
```

## Structure des données Firebase

### Collection `signalements`
```json
{
  "id": "auto_generated",
  "titre": "string",
  "description": "string",
  "type": "nid_de_poule|fissure|affaissement|inondation|autre",
  "statut": "nouveau|en_cours|termine",
  "latitude": "number",
  "longitude": "number",
  "user_id": "string",
  "user_email": "string",
  "photos": ["url1", "url2", ...],
  "photo_url": "string (première photo)",
  "surface_m2": "number (optionnel)",
  "budget": "number (optionnel)",
  "entreprise": "string (optionnel)",
  "date_creation": "ISO string",
  "date_modification": "ISO string"
}
```

### Collection `users`
```json
{
  "email": "string",
  "nom": "string",
  "prenom": "string",
  "role": "mobile_user|manager|admin",
  "isBlocked": "boolean",
  "loginAttempts": "number",
  "lastLoginAttempt": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Couleurs et thème

- **Primary** : #6B4FFF (Violet)
- **Nouveau (Danger)** : #e74c3c (Rouge)
- **En cours (Warning)** : #f39c12 (Orange)
- **Terminé (Success)** : #27ae60 (Vert)
- **Textes sur fond blanc** : #000000 (Noir)
- **Textes secondaires** : #374151 (Gris foncé)
