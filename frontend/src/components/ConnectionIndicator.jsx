/**
 * Composant indicateur du mode de connexion (Firebase/PostgreSQL)
 */

import React from 'react'
import { useAuth } from '../context/AuthContext'
import './ConnectionIndicator.css'

const ConnectionIndicator = () => {
  const { connectionMode } = useAuth()

  const getIndicatorData = () => {
    switch (connectionMode) {
      case 'online':
        return {
          icon: '🔥',
          label: 'Firebase',
          className: 'online',
          tooltip: 'Connecté à Firebase (temps réel)'
        }
      case 'offline':
        return {
          icon: '🗄️',
          label: 'PostgreSQL',
          className: 'offline',
          tooltip: 'Mode hors-ligne (PostgreSQL local)'
        }
      case 'checking':
        return {
          icon: '⏳',
          label: 'Connexion...',
          className: 'checking',
          tooltip: 'Vérification de la connexion...'
        }
      case 'disconnected':
        return {
          icon: '❌',
          label: 'Déconnecté',
          className: 'disconnected',
          tooltip: 'Aucune connexion disponible'
        }
      default:
        return {
          icon: '❓',
          label: 'Inconnu',
          className: 'unknown',
          tooltip: 'État de connexion inconnu'
        }
    }
  }

  const data = getIndicatorData()

  return (
    <div className={`connection-indicator ${data.className}`} title={data.tooltip}>
      <span className="indicator-dot"></span>
      <span className="indicator-text">
        {data.icon} {data.label}
      </span>
    </div>
  )
}

export default ConnectionIndicator
