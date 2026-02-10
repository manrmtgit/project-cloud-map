/**
 * Service Hybride - Authentification avec basculement automatique Firebase/PostgreSQL
 */

import { connectionManager } from './connectionManager'
import { firebaseAuthService } from './firebase'
import { authService as postgresAuthService } from './api'

class HybridAuthService {
  constructor() {
    this.mode = connectionManager.getMode()
    
    // S'abonner aux changements de mode
    connectionManager.subscribe((newMode) => {
      this.mode = newMode
      console.log(`🔄 Auth Service basculé vers: ${newMode.toUpperCase()}`)
    })
  }

  /**
   * Login - Essaie Firebase d'abord, puis PostgreSQL si échec
   */
  async login(credentials) {
    const { email, password } = credentials
    
    // Vérifier la connectivité
    const isOnline = navigator.onLine
    
    if (isOnline) {
      try {
        console.log('🔥 Tentative de connexion via Firebase...')
        const result = await firebaseAuthService.login(email, password)
        
        // Stocker le token et l'utilisateur
        localStorage.setItem('token', result.token)
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('authMode', 'firebase')
        
        console.log('✅ Connexion Firebase réussie')
        return result
      } catch (firebaseError) {
        console.warn('⚠️ Échec Firebase, tentative PostgreSQL...', firebaseError.message)
        // Si Firebase échoue (utilisateur n'existe pas sur Firebase), essayer PostgreSQL
      }
    }
    
    // Fallback vers PostgreSQL
    try {
      console.log('🐘 Tentative de connexion via PostgreSQL...')
      const result = await postgresAuthService.login(credentials)
      localStorage.setItem('authMode', 'postgres')
      console.log('✅ Connexion PostgreSQL réussie')
      return result
    } catch (postgresError) {
      console.error('❌ Échec PostgreSQL:', postgresError.message)
      throw postgresError
    }
  }

  /**
   * Register - Crée le compte sur Firebase ET PostgreSQL pour la synchronisation
   */
  async register(userData) {
    const { email, password, name } = userData
    const isOnline = navigator.onLine
    
    // Toujours créer sur PostgreSQL (stockage local permanent)
    let postgresResult = null
    try {
      console.log('🐘 Création du compte PostgreSQL...')
      postgresResult = await postgresAuthService.register(userData)
      console.log('✅ Compte PostgreSQL créé')
    } catch (error) {
      console.error('❌ Échec création PostgreSQL:', error.message)
      throw error
    }
    
    // Si en ligne, créer aussi sur Firebase
    if (isOnline) {
      try {
        console.log('🔥 Création du compte Firebase...')
        await firebaseAuthService.register(email, password, name)
        console.log('✅ Compte Firebase créé')
      } catch (firebaseError) {
        console.warn('⚠️ Compte Firebase non créé:', firebaseError.message)
        // Ne pas échouer si Firebase échoue, PostgreSQL est le backup
      }
    }
    
    return postgresResult
  }

  /**
   * Logout - Déconnecte des deux services
   */
  async logout() {
    const authMode = localStorage.getItem('authMode')
    
    try {
      if (authMode === 'firebase') {
        await firebaseAuthService.logout()
      }
    } catch (error) {
      console.warn('Erreur déconnexion Firebase:', error)
    }
    
    // Toujours nettoyer le localStorage
    postgresAuthService.logout()
    localStorage.removeItem('authMode')
  }

  /**
   * Verify - Vérifie le token selon le mode d'authentification
   */
  async verify() {
    const authMode = localStorage.getItem('authMode')
    
    if (authMode === 'firebase' && navigator.onLine) {
      try {
        return await firebaseAuthService.verifyToken()
      } catch (error) {
        // Fallback vers PostgreSQL
        return await postgresAuthService.verify()
      }
    }
    
    return await postgresAuthService.verify()
  }

  /**
   * Obtenir le mode d'authentification actuel
   */
  getAuthMode() {
    return localStorage.getItem('authMode') || this.mode
  }

  /**
   * Vérifier si on est en mode online
   */
  isOnline() {
    return navigator.onLine
  }
}

// Singleton
export const hybridAuthService = new HybridAuthService()
export default hybridAuthService
