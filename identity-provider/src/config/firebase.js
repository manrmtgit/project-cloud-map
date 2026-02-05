const admin = require('firebase-admin');

// Configuration Firebase (utiliser les variables d'environnement en production)
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID || "signalement-routier-demo",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
};

// Initialiser Firebase Admin uniquement si les credentials sont disponibles
let db = null;

try {
  if (process.env.FIREBASE_PROJECT_ID && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
    
    db = admin.firestore();
    console.log('🔥 Firebase connecté avec succès');
  } else {
    console.log('⚠️  Firebase non configuré - variables d\'environnement manquantes');
  }
} catch (error) {
  console.error('❌ Erreur configuration Firebase:', error.message);
}

module.exports = {
  db,
  admin,
  isConfigured: () => db !== null
};