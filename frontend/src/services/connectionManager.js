/**
 * Connection Manager - Gère le basculement automatique entre Firebase et PostgreSQL
 * 
 * - Si Internet disponible → Firebase
 * - Si pas d'Internet → PostgreSQL local
 */

class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine
    this.mode = this.isOnline ? 'firebase' : 'postgres'
    this.listeners = []
    
    // Écouter les changements de connexion
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())
    
    console.log(`🔌 Mode initial: ${this.mode.toUpperCase()}`)
  }

  handleOnline() {
    this.isOnline = true
    this.mode = 'firebase'
    console.log('🌐 Connexion Internet détectée → Mode FIREBASE')
    this.notifyListeners()
  }

  handleOffline() {
    this.isOnline = false
    this.mode = 'postgres'
    console.log('📴 Pas de connexion Internet → Mode POSTGRES')
    this.notifyListeners()
  }

  // Vérification active de la connectivité
  async checkConnectivity() {
    try {
      // Essayer d'atteindre Firebase
      const response = await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=AIzaSyTest', {
        method: 'GET',
        mode: 'no-cors'
      })
      this.isOnline = true
      this.mode = 'firebase'
      return true
    } catch (error) {
      this.isOnline = false
      this.mode = 'postgres'
      return false
    }
  }

  // S'abonner aux changements de mode
  subscribe(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.mode, this.isOnline))
  }

  getMode() {
    return this.mode
  }

  isFirebaseMode() {
    return this.mode === 'firebase'
  }

  isPostgresMode() {
    return this.mode === 'postgres'
  }
}

// Singleton
export const connectionManager = new ConnectionManager()
export default connectionManager
