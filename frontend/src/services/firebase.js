/**
 * Firebase Client Configuration
 * 
 * ⚠️ REMPLACEZ LES VALEURS CI-DESSOUS PAR VOS PROPRES CREDENTIALS FIREBASE
 */

import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore'

// ⚠️ CONFIGURATION FIREBASE - À REMPLACER AVEC VOS CREDENTIALS
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "VOTRE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "votre-projet.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "votre-projet",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "votre-projet.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc"
}

// Initialiser Firebase
let app = null
let auth = null
let db = null

try {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  console.log('🔥 Firebase initialisé avec succès')
} catch (error) {
  console.error('❌ Erreur initialisation Firebase:', error)
}

// ==========================================
// SERVICES D'AUTHENTIFICATION FIREBASE
// ==========================================

export const firebaseAuthService = {
  // Connexion avec email/mot de passe
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      const token = await user.getIdToken()
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          name: user.displayName || email.split('@')[0],
          role: user.email === 'manager@cloudmap.local' ? 'manager' : 'user'
        },
        token: token
      }
    } catch (error) {
      console.error('Erreur Firebase login:', error)
      throw new Error(getFirebaseErrorMessage(error.code))
    }
  },

  // Inscription
  register: async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Mettre à jour le profil avec le nom
      await updateProfile(user, { displayName: name })
      
      // Créer le document utilisateur dans Firestore
      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        email: email,
        name: name,
        role: 'user',
        createdAt: new Date()
      })
      
      return {
        success: true,
        message: 'Inscription réussie',
        user: {
          id: user.uid,
          email: user.email,
          name: name,
          role: 'user'
        }
      }
    } catch (error) {
      console.error('Erreur Firebase register:', error)
      throw new Error(getFirebaseErrorMessage(error.code))
    }
  },

  // Déconnexion
  logout: async () => {
    try {
      await signOut(auth)
      return { success: true }
    } catch (error) {
      console.error('Erreur Firebase logout:', error)
      throw error
    }
  },

  // Obtenir l'utilisateur actuel
  getCurrentUser: () => {
    return auth?.currentUser
  },

  // Écouter les changements d'authentification
  onAuthStateChange: (callback) => {
    return onAuthStateChanged(auth, callback)
  },

  // Vérifier le token
  verifyToken: async () => {
    const user = auth?.currentUser
    if (user) {
      const token = await user.getIdToken(true)
      return { valid: true, token }
    }
    return { valid: false }
  }
}

// ==========================================
// SERVICES SIGNALEMENTS FIREBASE (Firestore)
// ==========================================

export const firebaseSignalementService = {
  // Récupérer tous les signalements
  getAll: async (statut = null) => {
    try {
      let q = collection(db, 'signalements')
      
      if (statut && statut !== 'TOUS') {
        q = query(q, where('statut', '==', statut), orderBy('date_creation', 'desc'))
      } else {
        q = query(q, orderBy('date_creation', 'desc'))
      }
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Erreur Firebase getAll signalements:', error)
      throw error
    }
  },

  // Récupérer les statistiques
  getStats: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'signalements'))
      const signalements = snapshot.docs.map(doc => doc.data())
      
      const total = signalements.length
      const nouveau = signalements.filter(s => s.statut === 'NOUVEAU').length
      const enCours = signalements.filter(s => s.statut === 'EN_COURS').length
      const termine = signalements.filter(s => s.statut === 'TERMINE').length
      const totalSurface = signalements.reduce((sum, s) => sum + (s.surface_m2 || 0), 0)
      const totalBudget = signalements.reduce((sum, s) => sum + (s.budget || 0), 0)
      const avancement = total > 0 ? ((termine / total) * 100).toFixed(1) : 0
      
      return {
        total_signalements: total,
        total_surface_m2: totalSurface,
        total_budget: totalBudget,
        avancement_pourcentage: parseFloat(avancement),
        par_statut: {
          nouveau,
          en_cours: enCours,
          termine
        }
      }
    } catch (error) {
      console.error('Erreur Firebase getStats:', error)
      throw error
    }
  },

  // Récupérer un signalement par ID
  getById: async (id) => {
    try {
      const docRef = doc(db, 'signalements', id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      }
      throw new Error('Signalement non trouvé')
    } catch (error) {
      console.error('Erreur Firebase getById:', error)
      throw error
    }
  },

  // Créer un signalement
  create: async (data) => {
    try {
      const docRef = await addDoc(collection(db, 'signalements'), {
        ...data,
        statut: data.statut || 'NOUVEAU',
        date_creation: new Date(),
        date_mise_a_jour: new Date()
      })
      return { id: docRef.id, ...data }
    } catch (error) {
      console.error('Erreur Firebase create:', error)
      throw error
    }
  },

  // Mettre à jour un signalement
  update: async (id, data) => {
    try {
      const docRef = doc(db, 'signalements', id)
      await updateDoc(docRef, {
        ...data,
        date_mise_a_jour: new Date()
      })
      return { id, ...data }
    } catch (error) {
      console.error('Erreur Firebase update:', error)
      throw error
    }
  },

  // Supprimer un signalement
  delete: async (id) => {
    try {
      const docRef = doc(db, 'signalements', id)
      await deleteDoc(docRef)
      return { success: true }
    } catch (error) {
      console.error('Erreur Firebase delete:', error)
      throw error
    }
  },

  // Écouter les changements en temps réel
  onSignalementsChange: (callback) => {
    const q = query(collection(db, 'signalements'), orderBy('date_creation', 'desc'))
    return onSnapshot(q, (snapshot) => {
      const signalements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(signalements)
    })
  }
}

// ==========================================
// MESSAGES D'ERREUR FIREBASE
// ==========================================

function getFirebaseErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'Cet email est déjà utilisé',
    'auth/invalid-email': 'Email invalide',
    'auth/operation-not-allowed': 'Opération non autorisée',
    'auth/weak-password': 'Mot de passe trop faible (minimum 6 caractères)',
    'auth/user-disabled': 'Ce compte a été désactivé',
    'auth/user-not-found': 'Utilisateur non trouvé',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-credential': 'Identifiants invalides',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.'
  }
  return messages[code] || 'Une erreur est survenue'
}

// Export des instances Firebase
export { app, auth, db }
