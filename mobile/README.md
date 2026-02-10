# CloudMap Mobile - Application de Suivi des Travaux Routiers

Application mobile Ionic/Vue.js pour le signalement et le suivi des problèmes routiers à Antananarivo.

## Table des matières

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration Firebase](#configuration-firebase)
- [Lancement](#lancement)
- [Build Android (APK)](#build-android-apk)
- [Architecture Firebase - Choix techniques](#architecture-firebase---choix-techniques)
- [Stockage des Photos](#stockage-des-photos)
- [Synchronisation Firebase ↔ Docker (Module Web)](#synchronisation-firebase--docker-module-web)
- [Carte - MapLibre GL + Leaflet + OSM](#carte---maplibre-gl--leaflet--osm)
- [Icônes FontAwesome](#icônes-fontawesome)
- [Structure du Projet](#structure-du-projet)
- [Fonctionnalités](#fonctionnalités)

---

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Mobile (Ionic) │◄────►│ Firebase RTDB    │◄────►│ Frontend (React)│
│  Vue.js + Cap.  │      │ + Auth           │      │ Module Web      │
└────────┬────────┘      └──────────────────┘      └────────┬────────┘
         │                                                   │
         │              ┌──────────────────┐                 │
         └─────────────►│ Identity Provider│◄────────────────┘
                        │ (Docker/Node.js) │
                        │ PostgreSQL       │
                        └──────────────────┘
```

- **Mobile** : Ionic + Vue.js + Capacitor (cette application)
- **Firebase** : Realtime Database pour les signalements, Firebase Auth pour l'authentification mobile
- **Frontend Web** : React.js (module visiteur/manager)
- **Identity Provider** : API REST Node.js + PostgreSQL (Docker)

---

## Prérequis

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Android Studio** (pour le build Android/APK)
- **JDK 17** (pour Gradle/Android)
- **Ionic CLI** : `npm install -g @ionic/cli`
- **Capacitor CLI** : `npm install -g @capacitor/cli`
- Un projet Firebase configuré avec :
  - Firebase Authentication (Email/Password activé)
  - Firebase Realtime Database

---

## Installation

```bash
# Depuis le dossier mobile/
cd mobile

# Installer les dépendances
npm install

# Si des erreurs de peer dependencies :
npm install --legacy-peer-deps
```

### Dépendances principales

| Package | Rôle |
|---------|------|
| `@ionic/vue` | Framework UI mobile |
| `@capacitor/core` | Accès aux APIs natives (caméra, GPS) |
| `firebase` | Authentification + Realtime Database |
| `leaflet` | Bibliothèque de cartes |
| `maplibre-gl` | Rendu vectoriel WebGL (optimisation) |
| `@maplibre/maplibre-gl-leaflet` | Plugin MapLibre pour Leaflet |
| `@fortawesome/fontawesome-free` | Icônes FontAwesome |
| `pinia` | State management Vue.js |
| `chart.js` + `vue-chartjs` | Graphiques statistiques |

---

## Configuration Firebase

### 1. Créer un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Créer un nouveau projet (ou utiliser un existant)
3. Activer **Authentication** > **Email/Password**
4. Activer **Realtime Database**

### 2. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du dossier `mobile/` :

```env
VITE_FIREBASE_API_KEY=AIzaSy...votre_clé
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://votre-projet-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# URL de l'API d'authentification Docker
VITE_API_AUTH_URL=http://localhost:3000
```

### 3. Règles Realtime Database

Dans Firebase Console > Realtime Database > Rules :

```json
{
  "rules": {
    "signalements": {
      ".read": true,
      ".write": "auth != null",
      "$signalementId": {
        ".validate": "newData.hasChildren(['titre', 'description', 'latitude', 'longitude', 'type', 'statut', 'user_id', 'date_creation'])"
      }
    },
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'manager')"
      }
    }
  }
}
```

### 4. Structure de la Realtime Database

```json
{
  "signalements": {
    "-NxAbCdEf": {
      "titre": "Nid de poule rue...",
      "description": "Grand nid de poule...",
      "latitude": -18.8792,
      "longitude": 47.5079,
      "type": "nid_de_poule",
      "statut": "nouveau",
      "surface_m2": 5.5,
      "budget": 500000,
      "entreprise": "EntrepriseX",
      "date_creation": "2026-02-09T10:00:00.000Z",
      "date_modification": "2026-02-09T12:00:00.000Z",
      "user_id": "uid123",
      "user_email": "user@email.com",
      "photo_url": "data:image/jpeg;base64,...",
      "photos": ["data:image/jpeg;base64,...", "data:image/jpeg;base64,..."]
    }
  },
  "users": {
    "uid123": {
      "email": "user@email.com",
      "nom": "Doe",
      "prenom": "John",
      "role": "mobile_user",
      "isBlocked": false,
      "loginAttempts": 0,
      "createdAt": 1707436800000,
      "updatedAt": 1707436800000
    }
  }
}
```

---

## Lancement

### Développement (navigateur)

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

### Android (émulateur ou appareil)

```bash
# Build + synchronisation Capacitor
npm run build
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android
```

Depuis Android Studio, cliquer sur **Run** pour déployer sur un émulateur ou appareil connecté.

---

## Build Android (APK)

### 1. Build de l'application web

```bash
npm run build
npx cap sync android
```

### 2. Générer l'APK depuis Android Studio

1. `npx cap open android`
2. Android Studio > **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
3. L'APK sera dans `android/app/build/outputs/apk/debug/app-debug.apk`

### Ou via la ligne de commande :

```bash
cd android
./gradlew assembleDebug
```

---

## Architecture Firebase - Choix techniques

### Pourquoi Firebase Realtime Database (et non Firestore) ?

Pour ce projet, **Firebase Realtime Database** est le meilleur choix pour les raisons suivantes :

| Critère | Realtime Database | Firestore |
|---------|------------------|-----------|
| **Temps réel** | Synchronisation instantanée via WebSocket persistant | Synchronisation temps réel mais avec latence légèrement supérieure |
| **Structure des données** | Arbre JSON unique - parfait pour les signalements à plat | Documents/collections - surcharge inutile pour ce cas d'usage |
| **Coût** | Gratuit jusqu'à 1 Go de données + 100 connexions simultanées | Facturation par lecture/écriture (peut coûter cher avec les subscriptions) |
| **Synchronisation** | Naturelle, un seul `onValue` pour tout écouter | Nécessite des listeners par collection |
| **Simplicité** | API simple `set/update/push/onValue` | Plus complexe avec queries, subcollections |
| **Hors ligne** | Support natif du cache hors ligne | Support hors ligne mais plus complexe |

**Conclusion** : Pour un système de signalements simple avec synchronisation temps réel, Realtime Database est plus léger, plus rapide, et gratuit pour la charge de ce projet.

### Upload des photos - Compression en Base64

Le professeur a mentionné : *"on peut compresser les images et les changer en texte pour les stocker, mais quand on veut voir l'image cela s'affiche"*.

**Approche implémentée :**

1. **Capture** : La photo est prise via `@capacitor/camera` avec `quality: 80` (compression JPEG)
2. **Conversion** : L'image est convertie en **Data URL Base64** (`CameraResultType.DataUrl`)
3. **Stockage** : Le string Base64 est stocké directement dans :
   - **Firebase Realtime Database** : champ `photos[]` et `photo_url` du signalement
   - **IndexedDB local** : via `localStorageService` pour un accès hors ligne
4. **Affichage** : Le Base64 est directement utilisable comme `src` d'une balise `<img>` :
   ```html
   <img :src="photo" />
   <!-- photo = "data:image/jpeg;base64,/9j/4AAQ..." -->
   ```

**Avantages :**
- Pas besoin de Firebase Storage (pas de coût supplémentaire)
- Les images sont intégrées dans les données
- Affichage immédiat sans requête réseau supplémentaire

**Limitations :**
- Les images en Base64 sont ~33% plus grandes que le binaire
- Limite recommandée : 5 photos max par signalement, qualité 80%
- Pour des images très grandes, compresser davantage (quality: 50-60)

**Code de compression** (dans `CreateSignalementModal.vue`) :
```typescript
const image = await Camera.getPhoto({
  quality: 80,           // Compression JPEG à 80%
  allowEditing: false,
  resultType: CameraResultType.DataUrl,  // Retourne en base64
  source: CameraSource.Camera
});
// image.dataUrl = "data:image/jpeg;base64,..."
```

---

## Synchronisation Firebase ↔ Docker (Module Web)

### Principe de synchronisation

```
Mobile → Firebase RTDB ← → Module Web (React)
                               ↓
                          API Docker (PostgreSQL)
```

### Flux de données

1. **Mobile → Firebase** :
   - L'utilisateur mobile crée un signalement
   - Les données sont écrites dans Firebase RTDB (`signalements/`)
   - Tous les clients connectés reçoivent la mise à jour en temps réel

2. **Module Web → Firebase** (bouton Synchronisation) :
   - Le manager clique sur "Synchroniser"
   - Le frontend React lit les signalements depuis Firebase RTDB
   - Les données sont envoyées à l'API Docker (PostgreSQL)
   - Le manager modifie les statuts, budgets, etc. dans le module web
   - Les modifications sont renvoyées vers Firebase RTDB
   - Le mobile reçoit les notifications de changement de statut

3. **Comptes mobiles** :
   - Le manager crée les comptes via le module web
   - Les comptes sont créés dans Firebase Auth
   - Les données utilisateur sont stockées dans Firebase RTDB (`users/`)

### Implémentation côté web (React)

```javascript
// Lire les signalements depuis Firebase
import { getDatabase, ref, onValue, update } from 'firebase/database';

const db = getDatabase();
const signalementsRef = ref(db, 'signalements');

// Écouter en temps réel
onValue(signalementsRef, (snapshot) => {
  const data = snapshot.val();
  // Synchroniser avec PostgreSQL via l'API Docker
  await fetch('/api/signalements/sync', {
    method: 'POST',
    body: JSON.stringify(data)
  });
});

// Mettre à jour un statut
const updateStatus = async (id, newStatus) => {
  const sigRef = ref(db, `signalements/${id}`);
  await update(sigRef, {
    statut: newStatus,
    date_modification: new Date().toISOString()
  });
};
```

---

## Carte - MapLibre GL + Leaflet + OSM

### Architecture de la carte

L'application utilise une approche hybride optimisée :

1. **Leaflet** : API de manipulation de carte (marqueurs, clics, popups)
2. **MapLibre GL** : Rendu vectoriel GPU-accéléré (WebGL) pour les tuiles
3. **OpenStreetMap** : Source de données cartographiques

### Pourquoi MapLibre GL ?

| Critère | Tuiles Raster (Leaflet seul) | Tuiles Vectorielles (MapLibre GL) |
|---------|------------------------------|-----------------------------------|
| **Rendu** | Images PNG téléchargées | Données vectorielles rendues en WebGL |
| **Performance** | Correct | Excellent (GPU-accéléré) |
| **Fluidité zoom** | Saccadé (images pixelisées) | Fluide (rendu à la volée) |
| **Taille données** | ~20 Ko/tuile | ~5 Ko/tuile |
| **Offline** | Difficile | Plus facile avec styles locaux |

### Configuration

Dans `src/utils/constants.ts` :

```typescript
export const MAP_CONFIG = {
  DEFAULT_CENTER: { lat: -18.8792, lng: 47.5079 }, // Antananarivo
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  // Tuiles raster (fallback)
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '© OpenStreetMap contributors',
  // Style vectoriel MapLibre (optimisé)
  VECTOR_STYLE_URL: 'https://tiles.openfreemap.org/styles/liberty'
};
```

### Intégration dans le code

L'application tente d'abord d'utiliser MapLibre GL (vectoriel), et retombe sur les tuiles raster si ça échoue :

```typescript
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';

// Tentative MapLibre GL (vectoriel, optimisé)
try {
  (L as any).maplibreGL({
    style: MAP_CONFIG.VECTOR_STYLE_URL
  }).addTo(map);
} catch (e) {
  // Fallback tuiles raster
  L.tileLayer(MAP_CONFIG.TILE_URL, {
    attribution: MAP_CONFIG.TILE_ATTRIBUTION,
    subdomains: ['a', 'b', 'c'],
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 4
  }).addTo(map);
}
```

### Styles disponibles (OpenFreeMap - gratuit, sans clé API)

| Style | URL |
|-------|-----|
| Liberty (par défaut) | `https://tiles.openfreemap.org/styles/liberty` |
| Bright | `https://tiles.openfreemap.org/styles/bright` |
| Positron (clair) | `https://tiles.openfreemap.org/styles/positron` |
| Dark | `https://tiles.openfreemap.org/styles/dark` |

---

## Icônes FontAwesome

L'application utilise **FontAwesome 6** (free) pour toutes les icônes, à la place des ionicons par défaut d'Ionic.

### Installation

```bash
npm install @fortawesome/fontawesome-free
```

### Import (dans `main.ts`)

```typescript
import '@fortawesome/fontawesome-free/css/all.min.css';
```

### Utilisation dans les templates

```html
<!-- Au lieu de <ion-icon :icon="mapOutline" /> -->
<i class="fa-solid fa-map"></i>

<!-- Avec taille -->
<i class="fa-solid fa-plus fa-lg"></i>

<!-- Dans un slot Ionic -->
<ion-button>
  <i slot="start" class="fa-solid fa-camera"></i>
  Prendre une photo
</ion-button>
```

### Mapping ionicons → FontAwesome

| Ionicons | FontAwesome |
|----------|------------|
| `mapOutline` | `fa-solid fa-map` |
| `personOutline` | `fa-solid fa-user` |
| `addOutline` | `fa-solid fa-plus` |
| `locateOutline` | `fa-solid fa-crosshairs` |
| `layersOutline` | `fa-solid fa-layer-group` |
| `locationOutline` | `fa-solid fa-location-dot` |
| `cameraOutline` | `fa-solid fa-camera` |
| `calendarOutline` | `fa-regular fa-calendar` |
| `walletOutline` | `fa-solid fa-wallet` |
| `settingsOutline` | `fa-solid fa-gear` |
| `logOutOutline` | `fa-solid fa-right-from-bracket` |
| `alertCircleOutline` | `fa-solid fa-circle-exclamation` |
| `chevronForwardOutline` | `fa-solid fa-chevron-right` |

---

## Structure du Projet

```
mobile/
├── src/
│   ├── App.vue                      # Composant racine
│   ├── main.ts                      # Point d'entrée + imports globaux
│   ├── components/
│   │   ├── CreateSignalementModal.vue  # Formulaire création signalement
│   │   ├── SignalementBottomSheet.vue  # Détails signalement (bottom sheet)
│   │   ├── SignalementCard.vue         # Carte signalement (liste)
│   │   ├── StatsCard.vue              # Carte statistique
│   │   └── UserAvatar.vue            # Avatar utilisateur
│   ├── config/
│   │   └── firebase.ts               # Configuration Firebase
│   ├── models/
│   │   ├── Signalement.ts            # Types + helpers signalements
│   │   ├── User.ts                   # Types utilisateur
│   │   └── ApiResponse.ts            # Types API
│   ├── router/
│   │   └── index.ts                  # Routes + guards d'authentification
│   ├── services/
│   │   ├── authService.ts            # Auth via API Docker
│   │   ├── firebaseAuthService.ts    # Auth via Firebase
│   │   ├── firebaseService.ts        # CRUD signalements Firebase
│   │   ├── localStorageService.ts    # IndexedDB pour photos hors ligne
│   │   ├── mapService.ts             # Marqueurs + utilitaires carte
│   │   └── notificationService.ts    # Notifications changement statut
│   ├── stores/
│   │   ├── auth.ts                   # Store authentification
│   │   ├── map.ts                    # Store état carte + géolocalisation
│   │   └── signalements.ts           # Store signalements + stats
│   ├── utils/
│   │   ├── constants.ts              # Configuration globale
│   │   ├── formatters.ts             # Formatage dates, nombres, monnaie
│   │   └── validators.ts             # Validation formulaires
│   ├── views/
│   │   ├── ActivitiesView.vue        # Page activités + statistiques
│   │   ├── LoginView.vue             # Page de connexion
│   │   ├── MapView.vue               # Page carte principale
│   │   ├── ProfileView.vue           # Page profil utilisateur
│   │   └── TabsPage.vue              # Navigation par onglets
│   └── theme/
│       └── variables.css             # Variables CSS Ionic
├── android/                          # Projet Android natif (Capacitor)
├── capacitor.config.ts               # Configuration Capacitor
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Fonctionnalités

### Utilisateur Mobile

- **Connexion** via Firebase Auth (compte créé par le manager)
- **Carte interactive** avec MapLibre GL + Leaflet + OSM
- **Signaler** un problème routier :
  - Positionner sur la carte
  - Titre, description, type de problème
  - Prendre/choisir jusqu'à 5 photos
- **Visualiser** les signalements avec marqueurs colorés par statut :
  - 🔴 Nouveau
  - 🟡 En cours
  - 🟢 Terminé
- **Filtrer** : Mes signalements uniquement
- **Détails** : Appuyer sur un marqueur pour voir les infos complètes
- **Statistiques** : Total, avancement, surface, budget
- **Notifications** : Alerte à chaque changement de statut
- **Géolocalisation** : Centrer sur sa position actuelle
- **Recherche** : Rechercher un lieu via Nominatim (OSM)

### Calcul de l'avancement

```
nouveau  = 0%
en_cours = 50%
termine  = 100%

avancement = (nombre_termine / total) * 100
```

### Gestion des tentatives de connexion

- Maximum 3 tentatives par défaut (configurable dans `SESSION_CONFIG`)
- Après 3 échecs, le compte est bloqué
- Déblocage via l'API REST ou le module web (manager)

---

## Troubleshooting

### L'application ne se lance pas dans le navigateur

**Erreur** : `ReferenceError: can't access lexical declaration 'updateMarkers' before initialization`

**Cause** : La fonction `updateMarkers` était déclarée avec `const` (arrow function) et utilisée dans un `watch` avec `{immediate: true}` avant sa déclaration. Les déclarations `const` ne sont pas hoistées.

**Solution** : Utiliser une déclaration `function` classique qui est hoistée :
```typescript
// ✅ Correct (hoisted)
function updateMarkers(signalements: Signalement[]) { ... }

// ❌ Incorrect (TDZ - Temporal Dead Zone)
const updateMarkers = (signalements: Signalement[]) => { ... }
```

### La géolocalisation ne fonctionne pas dans le navigateur

L'application utilise `@capacitor/geolocation` qui a un fallback web. Si ça échoue, un fallback vers l'API Geolocation native du navigateur est implémenté dans `stores/map.ts`.

Assurez-vous que :
- Le site est servi en HTTPS (ou localhost)
- Vous avez accordé les permissions de localisation

### Les tuiles MapLibre ne s'affichent pas

Si MapLibre GL échoue (pas de WebGL, CORS, etc.), l'application retombe automatiquement sur les tuiles raster OSM classiques. Vérifiez la console pour les erreurs.

### Problèmes de build Android

```bash
# Nettoyer et rebuilder
cd android
./gradlew clean
cd ..
npm run build
npx cap sync android
```
