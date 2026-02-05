# 🔧 Guide de Dépannage Firebase - Cloud Map

## Problèmes Courants et Solutions

---

## ❌ Erreur : "Firebase non configuré"

### Symptômes
- Logs backend affichent : "⚠️ Fichier service account non trouvé"
- Boutons sync non fonctionnels
- Message : "Firebase non configuré"

### Causes Possibles
1. Fichier `firebase-service-account.json` manquant
2. Mauvais chemin dans `FIREBASE_SERVICE_ACCOUNT_PATH`
3. Fichier pas copié dans le container Docker
4. Permissions manquantes

### Solutions

**Étape 1: Vérifier le fichier existe**
```powershell
Test-Path "d:/S5/Rojo/project-cloud-map/identity-provider/config/firebase-service-account.json"
```

Si retourne `False` :
- Télécharger depuis Firebase Console
- Project Settings → Service Accounts → Generate new private key
- Placer dans `identity-provider/config/`

**Étape 2: Vérifier le chemin ENV**
```powershell
# Vérifier docker-compose.yml
Select-String "FIREBASE_SERVICE_ACCOUNT_PATH" frontend/docker-compose.yml
```

Doit avoir :
```yaml
- FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

**Étape 3: Vérifier le volume Docker**
```powershell
docker compose config | Select-String -A 5 "volumes"
```

Doit contenir :
```yaml
- ../identity-provider/config:/app/config
```

**Étape 4: Rebuild Docker**
```powershell
cd frontend
docker compose down identity-provider
docker compose up -d --build identity-provider
Start-Sleep -Seconds 3
docker compose logs identity-provider --tail 20
```

Doit voir :
```
✅ Firebase connecté avec succès (fichier JSON)
```

---

## ❌ Erreur : "pool.query is not a function"

### Symptômes
```
POST /api/signalements/sync/push
Response: {"error":"pool.query is not a function"}
```

### Cause
Importation incorrecte du pool PostgreSQL

### Solution

Ouvrir `identity-provider/src/services/firebaseSync.service.js` ligne 1-2 :

**Mauvais** ❌ :
```javascript
const pool = require('../config/database');
```

**Correct** ✅ :
```javascript
const { pool } = require('../config/database');
```

Puis redémarrer :
```powershell
docker compose restart identity-provider
```

---

## ❌ Erreur : "Cannot use undefined as a Firestore value"

### Symptômes
```
PUSH error: Value for argument "data" is not a valid Firestore document.
Cannot use "undefined" as a Firestore value (found in field "date_en_cours")
```

### Cause
Valeurs `undefined` ou `null` envoyées à Firestore

### Solution

Déjà corrigée dans `firebaseSync.service.js` (lignes 58-85) qui utilise des null-checks :

```javascript
const firebaseData = {
  id: signalement.id,
  titre: signalement.titre,
  ...
  ...(signalement.date_en_cours && { date_en_cours: ... }),
};
```

Si problème persiste, vérifier que le code est à jour :
```powershell
Select-String "date_en_cours &&" identity-provider/src/services/firebaseSync.service.js
```

---

## ❌ Erreur : "Permission denied" dans Firestore

### Symptômes
```
Error writing to Firestore: Permission denied (permission_denied)
```

### Causes
1. Règles Firestore trop restrictives
2. Service Account sans permissions
3. Firestore Database non créée

### Solution

**1. Vérifier Firestore existe**
- Firebase Console → Firestore Database
- Doit y avoir une base de données créée

**2. Vérifier les règles**
```
Firebase Console → Firestore → Rules
```

Doit avoir (pour dev) :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /signalements/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Pour production, utiliser plutôt :
```javascript
match /signalements/{document=**} {
  allow read: if true;
  allow write: if false;
}
```

**3. Redéployer les règles**
```bash
firebase deploy --only firestore:rules
```

---

## ❌ Erreur : "Impossible de se connecter à l'API"

### Symptômes
```
curl: Failed to connect to localhost port 3000
ou
Test-firebase.ps1: Cannot connect to API
```

### Causes
1. Container backend pas démarré
2. Port 3000 occupé
3. API ne s'est pas lancée correctement

### Solution

**Vérifier le status des containers**
```powershell
cd frontend
docker compose ps
```

Tu dois voir :
```
identity-provider-api    Running   0.0.0.0:3000->3000/tcp
postgres                 Running   0.0.0.0:5432->5432/tcp
```

**Si pas running, lancer**
```powershell
docker compose up -d identity-provider postgres
Start-Sleep -Seconds 5
docker compose logs identity-provider --tail 30
```

**Si erreur dans les logs**
```powershell
# Voir l'erreur complète
docker compose logs identity-provider

# Rebuild
docker compose down -v
docker compose up -d --build

# Attendre 10 secondes et vérifier
Start-Sleep -Seconds 10
curl http://localhost:3000/api/signalements
```

**Si le port 3000 est utilisé**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou changer le port dans docker-compose.yml
# ports:
#   - "3001:3000"
```

---

## ❌ Erreur : "Authentification échouée"

### Symptômes
```
POST /api/auth/login
Response: {"error":"Email ou mot de passe incorrect"}
```

### Causes
1. Compte manager pas créé
2. Mot de passe incorrect
3. Hash bcrypt invalide

### Solution

**Réinit la base de données**
```powershell
docker compose down -v
docker compose up -d
Start-Sleep -Seconds 10

# Vérifier que le manager est créé
docker exec identity-provider-db psql -U postgres -d identity_db -c "SELECT email FROM users;"
```

Doit afficher :
```
        email
-------------------------
manager@cloudmap.local
```

**Si pas de manager, s'assurer que init.sql a été exécuté**
```powershell
# Check le fichier init.sql contient
Select-String "manager@cloudmap.local" identity-provider/init.sql
```

Doit avoir un INSERT pour le manager avec password hashe

---

## ❌ Erreur : "9 signalements en PostgreSQL, 0 en Firebase"

### Symptômes
- PUSH button cliqué
- Message: "Succès"
- Mais Firebase console montre 0 documents

### Causes
1. PUSH a échoué silencieusement
2. Firestore rules bloquent write
3. Service Account pas actif

### Solution

**Vérifier les logs**
```powershell
docker compose logs identity-provider --tail 50 | Select-String -i "firebase\|error"
```

**Vérifier les règles Firestore**
```
Firebase Console → Firestore → Rules
Cliquer "Publish"
```

**Tester directement avec curl**
```powershell
# Get token
$TOKEN = (curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"manager@cloudmap.local","password":"Manager123!"}' | ConvertFrom-Json).token

# Test PUSH
curl -X POST http://localhost:3000/api/signalements/sync/push `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json"
```

Si erreur, faire :
```powershell
docker compose down
docker compose up -d --build
Start-Sleep -Seconds 10
# Retry
```

---

## ❌ Les boutons ne font rien dans l'interface

### Symptômes
- Boutons 📤📥🔄 visibles
- Au clic : rien ne se passe
- Console JavaScript montre erreurs

### Solutions

**Ouvrir DevTools**
```
F12 → Console
```

**Vérifier les erreurs**
```javascript
// Doit voir les requêtes réseau
// Vérifier qu'il y a pas d'erreur 401/403/500
```

**Redémarrer le frontend**
```powershell
docker compose down frontend
docker compose up -d frontend
```

**Vérifier que token est présent**
```javascript
// Dans la console du navigateur
localStorage.getItem('token')
// Doit retourner un JWT long, pas null
```

Si null :
```javascript
// Besoin de se connecter
// Aller à http://localhost:5173/login
```

---

## ⚠️ Base de Données PostgreSQL Corrompue

### Symptômes
- Erreurs "Connection refused"
- Tables manquantes
- Données incohérentes

### Solution Nucléaire (Reset Complet)

```powershell
# ATTENTION: Ceci supprime TOUT!

cd frontend

# Arrêter et supprimer tous les volumes
docker compose down -v

# Rebuild from scratch
docker compose build --no-cache

# Redémarrer
docker compose up -d

# Vérifier
Start-Sleep -Seconds 10
docker compose logs identity-provider --tail 20
docker compose ps
```

Puis vérifier les signalements seeding :
```powershell
docker exec identity-provider-db psql -U postgres -d identity_db -c "SELECT COUNT(*) FROM signalements;"
```

Doit retourner `9`

---

## 🐛 Mode Debug Complet

### Activer les logs complets

**1. Ajouter dans Dockerfile**
```dockerfile
ENV NODE_DEBUG=*
```

**2. Redémarrer**
```powershell
docker compose up -d --build identity-provider
docker compose logs -f identity-provider
```

**3. Exécuter les tests avec logs**
```powershell
docker compose logs identity-provider --tail 200 | Out-File test-logs.txt
```

### Vérifier les requêtes réseau

**Frontend (React)**
```javascript
// Ouvrir DevTools (F12)
// Onglet Network
// Cliquer sur bouton sync
// Voir la requête POST
```

**Backend (Node)**
```bash
docker compose logs identity-provider | grep -E "POST|PUT|GET|Firebase"
```

---

## 📞 Si Rien Ne Marche

**Checklist ultime**

```powershell
# 1. Restart complètement Docker
docker compose down -v
docker system prune -a -f
docker compose up -d --build

# 2. Attendre 30 secondes
Start-Sleep -Seconds 30

# 3. Vérifier tous les containers
docker compose ps

# 4. Vérifier les logs
docker compose logs

# 5. Tester l'API
curl http://localhost:3000/api/signalements

# 6. Tester Firebase
curl http://localhost:3000/api/signalements/sync/status

# 7. Si ça marche, continuer
# Si ça marche pas, c'est système → contacter support Docker
```

---

## 📧 Erreurs Spécifiques Firebase Console

### "Error: Service account keys are not available"
→ Créer une nouvelle clé : Project Settings → Service Accounts → Generate

### "Error: Invalid service account"
→ Vérifier le fichier JSON est valide (ouvrir, copier, parser)

### "Error: Database URL is invalid"
→ Vérifier format : `https://PROJECT_ID.firebaseio.com`

### "Error: Firestore collection not found"
→ Créer collection manuelle dans Firebase Console d'abord

---

## ✨ Conseils Généraux

1. **Toujours vérifier les logs d'abord**
   ```powershell
   docker compose logs [SERVICE] --tail 50
   ```

2. **Restart est souvent la solution**
   ```powershell
   docker compose restart [SERVICE]
   ```

3. **Clean rebuild si vraiment coincé**
   ```powershell
   docker compose down -v && docker compose up -d --build
   ```

4. **Vérifier les fichiers de config**
   - `.env` existe et a les bonnes valeurs
   - `firebase-service-account.json` existe et valide
   - `docker-compose.yml` a les variables ENV

5. **Documentation est ton ami**
   - Relire `FIREBASE_INTEGRATION.md`
   - Relire les logs
   - Chercher l'erreur dans ce guide

---

## 🔗 Ressources

- Firebase Console : https://console.firebase.google.com/
- Firebase Docs : https://firebase.google.com/docs
- Node.js Docker : https://github.com/nodejs/docker-node
- PostgreSQL Docs : https://www.postgresql.org/docs/

---

**Dernière Mise à Jour** : 5 février 2026  
**Status** : ✅ À jour et complet
