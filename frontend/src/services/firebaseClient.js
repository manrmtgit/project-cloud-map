// Configuration Firebase Client
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
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCeOV9yrOmkt8eRE2HbRbJjk_t5Opq-QUs",
  authDomain: "projet-cloud-67405.firebaseapp.com",
  databaseURL: "https://projet-cloud-67405-default-rtdb.firebaseio.com",
  projectId: "projet-cloud-67405",
  storageBucket: "projet-cloud-67405.firebasestorage.app",
  messagingSenderId: "698809419822",
  appId: "1:698809419822:web:9f233ff870105ba3c2b7bf",
  measurementId: "G-52W6X2R6Z0"
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Service d'authentification Firebase
export const firebaseAuthService = {
  // Inscription
  register: async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Mettre à jour le profil avec le nom
      await updateProfile(user, { displayName: name })
      
      // Créer le document utilisateur dans Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        name: name,
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Récupérer le token
      const token = await user.getIdToken()
      
      return {
        user: {
          id: user.uid,
          email: user.email,
          name: name,
          role: 'user'
        },
        token: token
      }
    } catch (error) {
      console.error('Erreur inscription Firebase:', error)
      throw error
    }
  },

  // Connexion
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Récupérer les données utilisateur depuis Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.exists() ? userDoc.data() : {}
      
      // Récupérer le token
      const token = await user.getIdToken()
      
      return {
        user: {
          id: user.uid,
          email: user.email,
          name: userData.name || user.displayName || email.split('@')[0],
          role: userData.role || 'user'
        },
        token: token
      }
    } catch (error) {
      console.error('Erreur connexion Firebase:', error)
      throw error
    }
  },

  // Déconnexion
  logout: async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Erreur déconnexion Firebase:', error)
    }
  },

  // Vérifier l'état d'authentification
  getCurrentUser: () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  },

  // Récupérer le token actuel
  getToken: async () => {
    const user = auth.currentUser
    if (user) {
      return await user.getIdToken()
    }
    return null
  }
}

// Service Firestore pour les signalements
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
      console.error('Erreur récupération signalements Firebase:', error)
      throw error
    }
  },

  // Récupérer les statistiques
  getStats: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'signalements'))
      const signalements = snapshot.docs.map(doc => doc.data())
      
      const stats = {
        total_signalements: signalements.length,
        total_surface_m2: signalements.reduce((acc, s) => acc + (s.surface_m2 || 0), 0),
        total_budget: signalements.reduce((acc, s) => acc + (s.budget || 0), 0),
        par_statut: {
          nouveau: signalements.filter(s => s.statut === 'NOUVEAU').length,
          en_cours: signalements.filter(s => s.statut === 'EN_COURS').length,
          termine: signalements.filter(s => s.statut === 'TERMINE').length
        }
      }
      
      const total = stats.total_signalements
      const termine = stats.par_statut.termine
      stats.avancement_pourcentage = total > 0 ? ((termine / total) * 100).toFixed(1) : 0
      
      return stats
    } catch (error) {
      console.error('Erreur récupération stats Firebase:', error)
      throw error
    }
  },

  // Écouter les changements en temps réel
  subscribeToSignalements: (callback, statut = null) => {
    let q = collection(db, 'signalements')
    
    if (statut && statut !== 'TOUS') {
      q = query(q, where('statut', '==', statut), orderBy('date_creation', 'desc'))
    } else {
      q = query(q, orderBy('date_creation', 'desc'))
    }
    
    return onSnapshot(q, (snapshot) => {
      const signalements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(signalements)
    })
  },

  // Créer un signalement
  create: async (data) => {
    try {
      const docRef = doc(collection(db, 'signalements'))
      await setDoc(docRef, {
        ...data,
        statut: data.statut || 'NOUVEAU',
        date_creation: serverTimestamp(),
        date_mise_a_jour: serverTimestamp()
      })
      return { id: docRef.id, ...data }
    } catch (error) {
      console.error('Erreur création signalement Firebase:', error)
      throw error
    }
  },

  // Mettre à jour un signalement
  update: async (id, data) => {
    try {
      await setDoc(doc(db, 'signalements', id), {
        ...data,
        date_mise_a_jour: serverTimestamp()
      }, { merge: true })
      return { id, ...data }
    } catch (error) {
      console.error('Erreur mise à jour signalement Firebase:', error)
      throw error
    }
  }
}

export { auth, db }
