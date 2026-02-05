# 🚀 Guide de Test Firebase via l'Interface Web

## Étapes pour tester la synchronisation Firebase via ManagerView

### 1️⃣ Ouvre l'interface Manager

```
http://localhost:5173/manager
```

### 2️⃣ Connecte-toi

- **Email** : `manager@cloudmap.local`
- **Mot de passe** : `Manager123!`

### 3️⃣ Regarde les boutons Firebase

Dans le header de l'interface Manager, tu vois :

```
┌─────────────────────────────────────────────────────────┐
│  📤 → Firebase    📥 ← Firebase    🔄 Firebase          │
│  (Vert)           (Violet)          (Bleu)              │
└─────────────────────────────────────────────────────────┘
```

### 4️⃣ PUSH vers Firebase

1. **Clique sur** `📤 → Firebase` (bouton vert)
2. **Attends** quelques secondes
3. **Tu verras** une alerte : "✅ Envoi Firebase réussi !"
4. **Message** : "9 signalements synchronisés vers Firebase"

### 5️⃣ Vérification dans Firebase Console

1. **Ouvre** https://console.firebase.google.com/
2. **Sélectionne** le projet `signalementroutier-1b496`
3. **Va à** : Firestore Database → Collection `signalements`
4. **Tu dois voir** : 9 documents avec les données

Chaque document contient :
```
{
  "id": "...",
  "titre": "Route dégradée",
  "latitude": -18.8798,
  "longitude": 47.5269,
  "statut": "NOUVEAU",
  "avancement": 0,
  ... et plus
}
```

### 6️⃣ PULL depuis Firebase

1. **Clique sur** `📥 ← Firebase` (bouton violet)
2. **Attends**
3. **Message** : "✅ Récupération Firebase réussie !"

Cela récupère les données depuis Firestore et les met à jour en PostgreSQL (utile si des données ont été modifiées depuis une autre source)

### 7️⃣ Synchronisation Bidirectionnelle

1. **Clique sur** `🔄 Firebase` (bouton bleu)
2. **Cela effectue** : PUSH + PULL complets
3. **Message** : "✅ Synchronisation bidirectionnelle réussie !"

---

## 📊 Statistiques

### Avant Sync
- PostgreSQL : 9 signalements
- Firebase : 0 signalements

### Après PUSH
- PostgreSQL : 9 signalements
- Firebase : 9 signalements ✅

### Après PULL
- PostgreSQL : 9 signalements (inchangé)
- Firebase : 9 signalements (inchangé)

---

## 🎨 États visuels des boutons

### Bouton Normal
```
📤 → Firebase    (Vert)    Cliquez pour envoyer
```

### Bouton en cours de synchronisation
```
📤 Envoi...      (Gris opaque, désactivé)
🔄 Sync...      (Pulsation)
```

### Bouton après succès
```
✅ Action réussie !  (Alerte)
```

---

## 🔍 Vérifier via Logs

Voir les logs du backend :

```bash
docker compose -f frontend/docker-compose.yml logs identity-provider --tail 20
```

Tu verras :
```
✅ Firebase connecté avec succès (fichier JSON)
   Projet: signalementroutier-1b496
   Collection: signalements
```

---

## ⚠️ Si ça ne fonctionne pas

### Erreur : "Impossible de se connecter"

```bash
# Vérifier API accessible
curl http://localhost:3000/api/signalements

# Si non, redémarrer
cd frontend && docker compose restart identity-provider
```

### Erreur : "Firebase non configuré"

```bash
# Vérifier le fichier existe
Test-Path "identity-provider/config/firebase-service-account.json"

# S'il existe pas : copier-le depuis votre Firebase Console
# Project Settings → Service Accounts → Generate new private key
```

### Erreur : "9 signalements, mais nothing in Firestore"

```bash
# Attendre un peu (Firebase peut prendre quelques secondes)
# Rafraîchir la console Firebase (F5)
# Vérifier les règles Firestore permettent write
```

---

## 📱 Prochaine Étape : App Mobile

Une fois le sync Firebase validé, tu peux créer une app mobile (React Native / Flutter) qui :

1. **Lit** la collection `signalements` depuis Firestore
2. **Affiche** les points sur une carte
3. **Envoie** de nouveaux signalements vers Firestore
4. **Le backend PULL** récupère les nouveaux

---

## 💾 Sauvegarde et Restore

### Backup Firestore

```bash
# Via Firebase Console
# Firestore Database → Données → Exporter
```

### Restore PostgreSQL (depuis backup)

```bash
# Commandes docker
docker exec identity-provider-db \
  pg_dump -U postgres identity_db > backup.sql
```

---

**Status** : ✅ Prêt à tester !

Essaie maintenant et dis-moi si tu as des questions 🚀
