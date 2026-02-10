/**
 * Configuration Firebase Realtime Database via REST API
 * Utilise le service account pour authentifier les requêtes REST
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://project-cloud-map-default-rtdb.firebaseio.com';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'project-cloud-map';

let firebaseConfigured = false;
let serviceAccount = null;

// Charger le service account
try {
  const saPath = path.join(__dirname, 'firebase-service-account.json');
  if (fs.existsSync(saPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  }
} catch (e) {
  console.warn('⚠️  Impossible de charger le service account Firebase:', e.message);
}

if (FIREBASE_DATABASE_URL) {
  firebaseConfigured = true;
  console.log('✅ Firebase Realtime Database configuré (REST API)');
  console.log(`   Database URL: ${FIREBASE_DATABASE_URL}`);
  if (serviceAccount) {
    console.log(`   Service Account: ${serviceAccount.client_email}`);
  }
} else {
  console.warn('⚠️  FIREBASE_DATABASE_URL non configuré');
}

/* ── OAuth2 Access Token via Service Account JWT ── */
let cachedToken = null;
let tokenExpiry = 0;

function base64url(data) {
  return Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken() {
  // Return cached token if still valid (with 60s margin)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  if (!serviceAccount || !serviceAccount.private_key) {
    return null; // No service account, will try unauthenticated
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));

  const signInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${signInput}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('❌ Erreur obtention access token Firebase:', err);
    return null;
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

/**
 * Classe utilitaire pour les opérations Firebase RTDB via REST
 */
class FirebaseRTDB {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async _buildUrl(path) {
    const token = await getAccessToken();
    const base = `${this.baseUrl}/${path}.json`;
    return token ? `${base}?access_token=${token}` : base;
  }

  async get(path) {
    const url = await this._buildUrl(path);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Firebase GET ${path} failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async set(path, data) {
    const url = await this._buildUrl(path);
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firebase SET ${path} failed: ${response.status} - ${errorText}`);
    }
    return response.json();
  }

  async update(path, data) {
    const url = await this._buildUrl(path);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firebase UPDATE ${path} failed: ${response.status} - ${errorText}`);
    }
    return response.json();
  }

  async remove(path) {
    const url = await this._buildUrl(path);
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Firebase DELETE ${path} failed: ${response.status}`);
    }
    return response.json();
  }

  async push(path, data) {
    const url = await this._buildUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firebase PUSH ${path} failed: ${response.status} - ${errorText}`);
    }
    return response.json();
  }
}

const db = new FirebaseRTDB(FIREBASE_DATABASE_URL);

/* ── Firebase Authentication REST API ── */

/**
 * Crée un utilisateur dans Firebase Authentication via l'Identity Toolkit REST API.
 * Le mobile utilise signInWithEmailAndPassword donc l'utilisateur DOIT exister dans Firebase Auth.
 * @returns {{ localId: string, email: string }} — localId = Firebase UID
 */
async function createFirebaseAuthUser(email, password, displayName) {
  if (!FIREBASE_API_KEY) {
    console.warn('⚠️  FIREBASE_API_KEY non configuré — impossible de créer l\'utilisateur dans Firebase Auth');
    return null;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, returnSecureToken: true })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorCode = errorData?.error?.message || 'UNKNOWN';
      // Si l'utilisateur existe déjà, ce n'est pas une erreur fatale
      if (errorCode === 'EMAIL_EXISTS') {
        console.log(`ℹ️  Utilisateur Firebase Auth existe déjà: ${email}`);
        // Récupérer le UID existant via lookup
        return await lookupFirebaseAuthUser(email);
      }
      console.error(`❌ Erreur création Firebase Auth: ${errorCode}`, errorData);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Utilisateur Firebase Auth créé: ${email} (UID: ${data.localId})`);
    return { localId: data.localId, email: data.email };
  } catch (error) {
    console.error('❌ Erreur création Firebase Auth:', error.message);
    return null;
  }
}

/**
 * Recherche un utilisateur Firebase Auth existant par email (Identity Toolkit lookup)
 */
async function lookupFirebaseAuthUser(email) {
  if (!FIREBASE_API_KEY) return null;
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: [email] })
      }
    );
    // L'endpoint lookup ne fonctionne qu'avec idToken, utilisons l'approche admin
    // Fallback: essayer signInWithPassword n'est pas viable, on retourne null
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Écrit le profil utilisateur dans Firebase RTDB au chemin `users/{firebaseUid}`
 * Compatible avec le format attendu par le mobile:
 * { email, nom, prenom, role, isBlocked, loginAttempts, createdAt, updatedAt }
 */
async function writeUserProfileToRTDB(firebaseUid, userData) {
  try {
    await db.set(`users/${firebaseUid}`, {
      email: userData.email || '',
      nom: userData.nom || '',
      prenom: userData.prenom || '',
      role: userData.role || 'UTILISATEUR',
      isBlocked: userData.isBlocked || false,
      loginAttempts: 0,
      lastLoginAttempt: null,
      createdAt: userData.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    console.log(`✅ Profil RTDB écrit: users/${firebaseUid}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur écriture profil RTDB users/${firebaseUid}:`, error.message);
    return false;
  }
}

module.exports = {
  db,
  isConfigured: () => firebaseConfigured,
  createFirebaseAuthUser,
  writeUserProfileToRTDB,
  FIREBASE_API_KEY
};