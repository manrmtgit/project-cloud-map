// Service hybride avec basculement automatique Firebase/PostgreSQL
import { firebaseAuthService, firebaseSignalementService, auth } from './firebaseClient'
import { authService as pgAuthService } from './api'
import { signalementService as pgSignalementService } from './signalement.api'

// État de la connexion
let isOnline = navigator.onLine
let connectionMode = 'checking' // 'online' (Firebase) | 'offline' (PostgreSQL) | 'checking'

// Listeners pour les changements de mode
const modeListeners = new Set()

// Vérifier si Firebase/Internet est accessible
const checkFirebaseConnection = async () => {
  // Si pas d'internet selon le navigateur, pas la peine de vérifier
  if (!navigator.onLine) {
    return false
  }
  
  try {
    // Vérifier la connexion internet en pingant Google (très fiable)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return true // Si on arrive ici, internet fonctionne
  } catch (error) {
    console.log('❌ Pas de connexion internet détectée')
    return false
  }
}

// Vérifier si PostgreSQL (backend local) est accessible
const checkPostgresConnection = async () => {
  try {
    const response = await fetch('http://localhost:3000/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch (error) {
    return false
  }
}

// Déterminer le mode de connexion
const determineConnectionMode = async () => {
  const wasMode = connectionMode

  // Vérifier d'abord si on a internet
  const hasInternet = await checkFirebaseConnection()
  
  if (hasInternet) {
    // Internet disponible = utiliser Firebase
    connectionMode = 'online'
    console.log('🔥 Mode Firebase (internet disponible)')
  } else {
    // Pas d'internet, vérifier PostgreSQL local
    const pgOk = await checkPostgresConnection()
    if (pgOk) {
      connectionMode = 'offline'
      console.log('🗄️ Mode PostgreSQL (hors-ligne)')
    } else {
      connectionMode = 'disconnected'
      console.log('❌ Aucune connexion disponible')
    }
  }

  // Notifier les listeners si le mode a changé
  if (wasMode !== connectionMode) {
    console.log(`🔄 Mode changé: ${wasMode} → ${connectionMode}`)
    notifyModeChange()
  }

  return connectionMode
}

// Notifier les listeners du changement de mode
const notifyModeChange = () => {
  modeListeners.forEach(listener => listener(connectionMode))
}

// Écouter les changements de connexion
window.addEventListener('online', () => {
  isOnline = true
  determineConnectionMode()
})

window.addEventListener('offline', () => {
  isOnline = false
  determineConnectionMode()
})

// Vérification périodique (toutes les 30 secondes)
setInterval(determineConnectionMode, 30000)

// Initialiser le mode de connexion
determineConnectionMode()

// ============================================
// SERVICE HYBRIDE D'AUTHENTIFICATION
// ============================================
export const hybridAuthService = {
  // S'abonner aux changements de mode
  onModeChange: (callback) => {
    modeListeners.add(callback)
    // Retourner immédiatement le mode actuel
    callback(connectionMode)
    // Retourner une fonction pour se désabonner
    return () => modeListeners.delete(callback)
  },

  // Récupérer le mode actuel
  getMode: () => connectionMode,

  // Forcer la vérification du mode
  checkMode: determineConnectionMode,

  // Inscription
  register: async (userData) => {
    await determineConnectionMode()
    
    if (connectionMode === 'online') {
      try {
        console.log('📝 Inscription via Firebase...')
        const result = await firebaseAuthService.register(
          userData.email, 
          userData.password, 
          userData.name
        )
        localStorage.setItem('token', result.token)
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('authMode', 'firebase')
        return result
      } catch (error) {
        console.warn('⚠️ Échec Firebase, tentative PostgreSQL...', error.message)
        // Fallback sur PostgreSQL
      }
    }
    
    // Mode offline ou fallback
    console.log('📝 Inscription via PostgreSQL...')
    const result = await pgAuthService.register(userData)
    localStorage.setItem('authMode', 'postgres')
    return result
  },

  // Connexion
  login: async (credentials) => {
    await determineConnectionMode()
    
    if (connectionMode === 'online') {
      try {
        console.log('🔑 Connexion via Firebase...')
        const result = await firebaseAuthService.login(
          credentials.email, 
          credentials.password
        )
        localStorage.setItem('token', result.token)
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('authMode', 'firebase')
        return result
      } catch (error) {
        console.warn('⚠️ Échec Firebase, tentative PostgreSQL...', error.message)
        // Fallback sur PostgreSQL
      }
    }
    
    // Mode offline ou fallback
    console.log('🔑 Connexion via PostgreSQL...')
    const result = await pgAuthService.login(credentials)
    localStorage.setItem('authMode', 'postgres')
    return result
  },

  // Déconnexion
  logout: async () => {
    const authMode = localStorage.getItem('authMode')
    
    if (authMode === 'firebase') {
      await firebaseAuthService.logout()
    }
    
    pgAuthService.logout()
    localStorage.removeItem('authMode')
  },

  // Vérifier l'authentification
  verify: async () => {
    const authMode = localStorage.getItem('authMode')
    
    if (authMode === 'firebase') {
      const user = await firebaseAuthService.getCurrentUser()
      if (user) {
        const token = await user.getIdToken()
        return { valid: true, token }
      }
      throw new Error('Non authentifié')
    }
    
    return pgAuthService.verify()
  }
}

// ============================================
// SERVICE HYBRIDE DES SIGNALEMENTS
// ============================================
export const hybridSignalementService = {
  // Récupérer tous les signalements
  getAll: async (statut = null) => {
    await determineConnectionMode()
    
    if (connectionMode === 'online') {
      try {
        console.log('📍 Chargement signalements via Firebase...')
        return await firebaseSignalementService.getAll(statut)
      } catch (error) {
        console.warn('⚠️ Échec Firebase, tentative PostgreSQL...', error.message)
      }
    }
    
    console.log('📍 Chargement signalements via PostgreSQL...')
    return await pgSignalementService.getAll(statut)
  },

  // Récupérer les statistiques
  getStats: async () => {
    await determineConnectionMode()
    
    if (connectionMode === 'online') {
      try {
        console.log('📊 Chargement stats via Firebase...')
        return await firebaseSignalementService.getStats()
      } catch (error) {
        console.warn('⚠️ Échec Firebase, tentative PostgreSQL...', error.message)
      }
    }
    
    console.log('📊 Chargement stats via PostgreSQL...')
    return await pgSignalementService.getStats()
  },

  // Écouter les changements en temps réel (Firebase uniquement)
  subscribe: (callback, statut = null) => {
    if (connectionMode === 'online') {
      return firebaseSignalementService.subscribeToSignalements(callback, statut)
    }
    // En mode offline, pas de temps réel
    return () => {}
  },

  // Créer un signalement
  create: async (data) => {
    await determineConnectionMode()
    
    if (connectionMode === 'online') {
      try {
        return await firebaseSignalementService.create(data)
      } catch (error) {
        console.warn('⚠️ Échec Firebase, tentative PostgreSQL...', error.message)
      }
    }
    
    return await pgSignalementService.create(data)
  },

  // Mettre à jour un signalement
  update: async (id, data) => {
    await determineConnectionMode()
    
    if (connectionMode === 'online') {
      try {
        return await firebaseSignalementService.update(id, data)
      } catch (error) {
        console.warn('⚠️ Échec Firebase, tentative PostgreSQL...', error.message)
      }
    }
    
    return await pgSignalementService.update(id, data)
  },

  // Supprimer un signalement
  delete: async (id) => {
    // Supprimer via PostgreSQL (et synchro Firebase si online)
    return await pgSignalementService.delete(id)
  }
}

export default {
  auth: hybridAuthService,
  signalements: hybridSignalementService
}
