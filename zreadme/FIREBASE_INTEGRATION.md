# 🔥 Firebase Integration Guide - Cloud Map

## Configuration Complète de Firebase pour Cloud Map

### Statut Actuel : ✅ PLEINEMENT FONCTIONNEL

---

## 📋 Table des Matières

1. [Configuration initiale](#configuration-initiale)
2. [Architecture](#architecture)
3. [Tests de vérification](#tests-de-vérification)
4. [Utilisation](#utilisation)
5. [Dépannage](#dépannage)

---

## Configuration Initiale

### Prérequis

- Compte Google avec Firebase Console accès
- Projet Firebase créé : `signalementroutier-1b496`
- Firestore Database activée (mode "Production")
- Clé Service Account téléchargée

### Fichiers en Place

```
identity-provider/
├── config/
│   └── firebase-service-account.json  ← Fichier clé (⚠️ JAMAIS COMMITER)
├── src/
│   ├── config/
│   │   └── firebase.js               ← Configuration Firebase
│   ├── services/
│   │   └── firebaseSync.service.js   ← Logique sync
│   └── controllers/
│       └── firebaseSync.controller.js ← Routes sync
```

### Variables d'Environnement

Dans `docker-compose.yml` ou `.env` :

```env
FIREBASE_PROJECT_ID=signalementroutier-1b496
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
FIREBASE_SIGNALEMENTS_COLLECTION=signalements
```

---

## Architecture

### Flux de Synchronisation

```
┌─────────────────────────────────────────────────────────┐
│                    Cloud Map App                        │
├─────────────┬─────────────────────────────┬─────────────┤
│             │        API Backend          │             │
│  MapView    │        :3000                │  ManagerView│
│  (Visiteurs)│                             │  (Manager)  │
│             └─────────────────────────────┘             │
│                          ▲                               │
│                          │                               │
│              ┌───────────┴───────────┐                  │
│              │                       │                  │
│              ▼                       ▼                  │
│         PostgreSQL            Firebase Admin            │
│         (PostgreSQL)          SDK Connection           │
│         :5432                                          │
│                                     │                   │
│                                     ▼                   │
│                            Firestore Database          │
│                            (Signalements)              │
│                                                         │
│         ◄────── Sync PUSH ──────────────────►          │
│         ◄────── Sync PULL ──────────────────►          │
│                                                         │
│                          ▲                              │
│                          │                              │
│                   ┌──────┴───────┐                     │
│                   │              │                     │
│              Mobile App       Web Frontend              │
│              (iOS/Android)    (React)                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Endpoints API

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/signalements/sync/push` | POST | PostgreSQL → Firestore |
| `/api/signalements/sync/pull` | POST | Firestore → PostgreSQL |
| `/api/signalements/sync/bidirectional` | POST | PUSH + PULL complets |
| `/api/signalements/sync/status` | GET | Vérifier statuts |

---

## Tests de Vérification

### Test Automatisé

```powershell
cd d:/S5/Rojo/project-cloud-map
powershell -ExecutionPolicy Bypass -File test-firebase.ps1
```

### Test Manuel avec curl

```bash
# 1. Obtenir token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@cloudmap.local","password":"Manager123!"}' \
  | jq -r '.token')

# 2. PUSH vers Firebase
curl -X POST http://localhost:3000/api/signalements/sync/push \
  -H "Authorization: Bearer $TOKEN"

# 3. Vérifier dans Firebase Console
# https://console.firebase.google.com/project/signalementroutier-1b496/firestore

# 4. PULL depuis Firebase
curl -X POST http://localhost:3000/api/signalements/sync/pull \
  -H "Authorization: Bearer $TOKEN"
```

### Vérification dans Firebase Console

1. Ouvre https://console.firebase.google.com/
2. Sélectionne le projet `signalementroutier-1b496`
3. Va à **Firestore Database**
4. Ouvre la collection **signalements**
5. Tu dois voir 9 documents

---

## Utilisation

### Via l'Interface Web (ManagerView)

```
Interface Manager (/manager)
│
├─ 📤 → Firebase
│  │
│  └─ Envoie les 9 signalements de PostgreSQL vers Firestore
│
├─ 📥 ← Firebase
│  │
│  └─ Récupère les données depuis Firestore (pour maj locale)
│
└─ 🔄 Firebase
   │
   └─ Synchronisation bidirectionnelle complète
```

### Via l'API Directement

```javascript
// Frontend code (React)
const signalementService = require('../services/signalement.api');

// PUSH
await signalementService.pushToFirebase();

// PULL
await signalementService.pullFromFirebase();

// SYNC
await signalementService.syncBidirectional();

// Status
const stats = await signalementService.getSyncStatus();
```

---

## Structure Firestore

### Collection : `signalements`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "titre": "Route dégradée",
  "description": "Nid de poule section A",
  "latitude": -18.8798,
  "longitude": 47.5269,
  "statut": "NOUVEAU",
  "avancement": 0,
  "surface_m2": 45.5,
  "budget": 2500,
  "entreprise": "TP Services",
  "user_id": "user-uuid",
  "date_creation": "2026-02-05T10:30:00Z",
  "date_nouveau": "2026-02-05T10:30:00Z",
  "date_en_cours": null,
  "date_termine": null,
  "date_mise_a_jour": "2026-02-05T10:30:00Z",
  "sync_timestamp": "2026-02-05T10:35:00Z",
  "photos": ["route_damage_1.jpg", "route_damage_2.jpg"]
}
```

### Indexation Firestore Recommandée

Pour les requêtes mobiles optimisées :

```
Collection: signalements
Composite Index:
  - statut (Ascending)
  - date_creation (Descending)
```

---

## Dépannage

### Erreur : "Firebase non configuré"

**Cause** : Fichier service account non trouvé ou variable ENV manquante

**Solution** :
```bash
# Vérifier le fichier existe
Test-Path "identity-provider/config/firebase-service-account.json"

# Vérifier docker-compose.yml contient
# - FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
# - Volume: ../identity-provider/config:/app/config

# Redémarrer
cd frontend
docker compose up -d --build identity-provider
```

### Erreur : "Value for argument 'data' is not a valid Firestore document"

**Cause** : Valeurs undefined/null dans les données

**Solution** : ✅ Déjà corrigée dans `firebaseSync.service.js` (utilise opérateur spread pour null check)

### Erreur : "Permission denied"

**Cause** : Règles Firestore trop restrictives ou Service Account sans permissions

**Solution** :
```javascript
// Règles Firestore temporaires (dev)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /signalements/{docId} {
      allow read, write: if true;  // ⚠️ DEV ONLY
    }
  }
}
```

### Signalements ne se synchro pas

**Checklist** :
- [ ] Firebase conecté ? Vérifier logs : `docker compose logs identity-provider`
- [ ] Service account valide ? Tester dans Firebase Console
- [ ] Firestore rules permettent write ? Modifier rules
- [ ] PostgreSQL accessible ? Vérifier `docker compose logs postgres`
- [ ] Token JWT valide ? Refaire login

---

## Sécurité - À NE PAS OUBLIER

### 1. Protéger la clé Firebase

```bash
# JAMAIS committer
echo "identity-provider/config/firebase-service-account.json" >> .gitignore

# Garder en safe (secure environment variables sur serveur)
# Ne jamais en version control
```

### 2. Règles Firestore Production

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /signalements/{docId} {
      // Lecture publique (mobile peut lire)
      allow read: if true;
      
      // Écriture via Admin SDK seulement (backend)
      allow write: if false;
    }
  }
}
```

### 3. IAM Roles (Google Cloud)

- Service Account : `Firestore Admin` (minima requise)
- Pas d'autres rôles
- Vérifier régulièrement

---

## Performance & Quotas

### Limite Firestore (Plan Spark - Gratuit)

| Métrique | Limite |
|----------|--------|
| Lectures | 50k/jour |
| Écritures | 20k/jour |
| Suppressions | 20k/jour |
| Stockage | 1 GB |

**Notre usage** :
- ~20 reads/jour (status check)
- ~1 write/jour (sync)
- = **Bien dans les limites gratuites**

### Optimisation

```javascript
// MAUVAIS - Requête full read
await db.collection('signalements').get();  // 1 read = count docs

// BON - Utiliser snapshot listener
db.collection('signalements')
  .where('date_mise_a_jour', '>', date)
  .limit(50)
  .onSnapshot(snapshot => {
    // Traiter seulement diff
  });
```

---

## Intégration Mobile (Futur)

### Installation SDK Firebase (React Native)

```bash
npm install @react-native-firebase/app @react-native-firebase/firestore
```

### Lecture en React Native

```javascript
import firestore from '@react-native-firebase/firestore';

const signalements = firestore()
  .collection('signalements')
  .where('statut', '==', 'NOUVEAU')
  .get();
```

---

## Support & Débogage

### Logs Backend

```bash
# Voir logs en temps réel
docker compose logs -f identity-provider

# Voir juste les erreurs Firebase
docker compose logs identity-provider | grep -i firebase
```

### Firebase Emulator (Dev Local)

```bash
# Installation
npm install -g firebase-tools

# Initialiser
firebase init emulators

# Démarrer
firebase emulators:start --only firestore

# Dans le code
export FIRESTORE_EMULATOR_HOST=localhost:8080
```

---

## Checklist Déploiement

- [ ] Firebase project créé et actif
- [ ] Firestore Database activée
- [ ] Service account clé téléchargée
- [ ] Fichier clé en `identity-provider/config/`
- [ ] `.gitignore` contient la clé
- [ ] Variables ENV configurées
- [ ] Docker compose rebuild exécuté
- [ ] Tests automatisés tous PASS
- [ ] Vérification Firebase Console (9 docs)
- [ ] Boutons sync affichés dans ManagerView
- [ ] Règles Firestore définies
- [ ] Documentation lue & comprise

---

## Questions Fréquentes

**Q: Pourquoi synchroniser vers Firebase ?**
A: Pour que l'app mobile puisse accéder aux signalements en temps réel sans passer par le serveur

**Q: Est-ce que les données en Firebase remplacent PostgreSQL ?**
A: Non ! PostgreSQL reste la source de vérité. Firebase est une copie pour mobile.

**Q: Qui peut voir les données dans Firestore ?**
A: Par défaut, tout le monde (selon règles). À restreindre en production.

**Q: Comment ajouter une photo depuis mobile ?**
A: Mobile → Créer doc en Firestore → PULL → PostgreSQL récupère

---

**Version**: 1.0  
**Date**: 5 février 2026  
**Status**: ✅ Production Ready
