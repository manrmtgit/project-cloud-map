/**
 * Service Hybride - Signalements avec basculement automatique Firebase/PostgreSQL
 */

import { connectionManager } from './connectionManager'
import { firebaseSignalementService } from './firebase'
import { signalementService as postgresSignalementService } from './signalement.api'

class HybridSignalementService {
  constructor() {
    this.mode = connectionManager.getMode()
    
    // S'abonner aux changements de mode
    connectionManager.subscribe((newMode) => {
      this.mode = newMode
      console.log(`🔄 Signalement Service basculé vers: ${newMode.toUpperCase()}`)
    })
  }

  /**
   * Obtenir le service actif selon la connectivité
   */
  getActiveService() {
    if (navigator.onLine) {
      return firebaseSignalementService
    }
    return postgresSignalementService
  }

  /**
   * Récupérer tous les signalements
   */
  async getAll(statut = null) {
    const isOnline = navigator.onLine
    
    if (isOnline) {
      try {
        console.log('🔥 Chargement signalements depuis Firebase...')
        const result = await firebaseSignalementService.getAll(statut)
        console.log(`✅ ${result.length} signalements chargés depuis Firebase`)
        return result
      } catch (error) {
        console.warn('⚠️ Échec Firebase, fallback PostgreSQL...', error.message)
      }
    }
    
    // Fallback PostgreSQL
    console.log('🐘 Chargement signalements depuis PostgreSQL...')
    const result = await postgresSignalementService.getAll(statut)
    console.log(`✅ ${result.length} signalements chargés depuis PostgreSQL`)
    return result
  }

  /**
   * Récupérer les statistiques
   */
  async getStats() {
    const isOnline = navigator.onLine
    
    if (isOnline) {
      try {
        console.log('🔥 Chargement stats depuis Firebase...')
        return await firebaseSignalementService.getStats()
      } catch (error) {
        console.warn('⚠️ Échec Firebase stats, fallback PostgreSQL...')
      }
    }
    
    console.log('🐘 Chargement stats depuis PostgreSQL...')
    return await postgresSignalementService.getStats()
  }

  /**
   * Récupérer un signalement par ID
   */
  async getById(id) {
    const isOnline = navigator.onLine
    
    if (isOnline) {
      try {
        return await firebaseSignalementService.getById(id)
      } catch (error) {
        console.warn('⚠️ Échec Firebase getById, fallback PostgreSQL...')
      }
    }
    
    return await postgresSignalementService.getById(id)
  }

  /**
   * Créer un signalement (sur les deux systèmes si possible)
   */
  async create(data) {
    const isOnline = navigator.onLine
    let result = null
    
    // Toujours créer sur PostgreSQL (stockage local)
    try {
      console.log('🐘 Création signalement PostgreSQL...')
      result = await postgresSignalementService.create(data)
      console.log('✅ Signalement créé dans PostgreSQL')
    } catch (error) {
      console.error('❌ Échec création PostgreSQL:', error.message)
      throw error
    }
    
    // Si en ligne, synchroniser avec Firebase
    if (isOnline) {
      try {
        console.log('🔥 Synchronisation avec Firebase...')
        await firebaseSignalementService.create({
          ...data,
          postgres_id: result.id // Lier les deux
        })
        console.log('✅ Synchronisé avec Firebase')
      } catch (error) {
        console.warn('⚠️ Sync Firebase échouée (sera synchronisé plus tard):', error.message)
      }
    }
    
    return result
  }

  /**
   * Mettre à jour un signalement
   */
  async update(id, data) {
    const isOnline = navigator.onLine
    let result = null
    
    // Mettre à jour PostgreSQL
    try {
      result = await postgresSignalementService.update(id, data)
    } catch (error) {
      console.error('❌ Échec update PostgreSQL:', error.message)
      throw error
    }
    
    // Synchroniser avec Firebase si en ligne
    if (isOnline) {
      try {
        await firebaseSignalementService.update(id, data)
      } catch (error) {
        console.warn('⚠️ Sync Firebase update échouée:', error.message)
      }
    }
    
    return result
  }

  /**
   * Supprimer un signalement
   */
  async delete(id) {
    const isOnline = navigator.onLine
    
    // Supprimer de PostgreSQL
    try {
      await postgresSignalementService.delete(id)
    } catch (error) {
      console.error('❌ Échec delete PostgreSQL:', error.message)
      throw error
    }
    
    // Supprimer de Firebase si en ligne
    if (isOnline) {
      try {
        await firebaseSignalementService.delete(id)
      } catch (error) {
        console.warn('⚠️ Sync Firebase delete échouée:', error.message)
      }
    }
    
    return { success: true }
  }

  /**
   * Obtenir le mode actuel
   */
  getMode() {
    return navigator.onLine ? 'firebase' : 'postgres'
  }
}

// Singleton
export const hybridSignalementService = new HybridSignalementService()
export default hybridSignalementService
