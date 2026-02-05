const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let firebaseInitialized = false;

try {
  // Vérifier si le fichier JSON existe
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
    ? path.resolve(__dirname, '../../', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : null;

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    // Charger depuis le fichier JSON
    const serviceAccount = require(serviceAccountPath);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      
      db = admin.firestore();
      firebaseInitialized = true;
      console.log('✅ Firebase connecté avec succès (fichier JSON)');
      console.log(`   Projet: ${serviceAccount.project_id}`);
      console.log(`   Collection: ${process.env.FIREBASE_SIGNALEMENTS_COLLECTION || 'signalements'}`);
    }
  } else {
    console.warn('⚠️  Fichier service account non trouvé à:', serviceAccountPath);
    console.warn('    Vérifiez FIREBASE_SERVICE_ACCOUNT_PATH dans .env');
  }
} catch (error) {
  console.error('❌ Erreur initialisation Firebase:', error.message);
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('   Le fichier firebase-service-account.json n\'existe pas');
    console.error('   Téléchargez-le depuis Firebase Console > Project Settings > Service Accounts');
  }
}

module.exports = {
  db,
  admin,
  isConfigured: () => firebaseInitialized && db !== null
};