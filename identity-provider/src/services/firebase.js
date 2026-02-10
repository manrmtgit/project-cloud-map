/**
 * Firebase Admin SDK configuration pour le backend
 */

const admin = require('firebase-admin');
const path = require('path');

let firebaseApp = null;
let firebaseEnabled = false;

const initializeFirebase = () => {
  try {
    // Vérifier si Firebase est déjà initialisé
    if (firebaseApp) {
      return firebaseApp;
    }

    // Charger le fichier Service Account
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    const serviceAccount = require(serviceAccountPath);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://projet-cloud-67405-default-rtdb.firebaseio.com"
    });

    firebaseEnabled = true;
    console.log('✅ Firebase Admin SDK initialisé');
    return firebaseApp;
  } catch (error) {
    console.warn('⚠️ Firebase non configuré:', error.message);
    firebaseEnabled = false;
    return null;
  }
};

// Initialiser Firebase au démarrage
initializeFirebase();

// Firestore
const getFirestore = () => {
  if (!firebaseEnabled) return null;
  return admin.firestore();
};

// Auth
const getAuth = () => {
  if (!firebaseEnabled) return null;
  return admin.auth();
};

// Vérifier un token Firebase
const verifyFirebaseToken = async (idToken) => {
  if (!firebaseEnabled) {
    throw new Error('Firebase non activé');
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Erreur vérification token Firebase:', error);
    throw error;
  }
};

// Synchroniser un utilisateur vers Firestore
const syncUserToFirestore = async (user) => {
  if (!firebaseEnabled) return;
  
  try {
    const db = admin.firestore();
    await db.collection('users').doc(user.id).set({
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✅ Utilisateur ${user.email} synchronisé vers Firestore`);
  } catch (error) {
    console.error('Erreur sync utilisateur vers Firestore:', error);
  }
};

// Synchroniser un signalement vers Firestore
const syncSignalementToFirestore = async (signalement) => {
  if (!firebaseEnabled) return;
  
  try {
    const db = admin.firestore();
    const docRef = db.collection('signalements').doc(signalement.id.toString());
    await docRef.set({
      ...signalement,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✅ Signalement ${signalement.id} synchronisé vers Firestore`);
  } catch (error) {
    console.error('Erreur sync signalement vers Firestore:', error);
  }
};

module.exports = {
  admin,
  initializeFirebase,
  getFirestore,
  getAuth,
  verifyFirebaseToken,
  syncUserToFirestore,
  syncSignalementToFirestore,
  isFirebaseEnabled: () => firebaseEnabled
};
