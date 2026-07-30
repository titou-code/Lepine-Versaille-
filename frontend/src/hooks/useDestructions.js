import { useState } from 'react'
import { api } from '../lib/api'

export function useDestructions() {
  const [loading, setLoading] = useState(false)

  // Admin / super_admin : destruction directe.
  async function marquerDetruit({ document_id, date_destruction, effectue_par, methode, notes }) {
    setLoading(true)
    try {
      await api.post('/destructions', { document_id, date_destruction, methode, notes })
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Archiviste : proposer une destruction (crée une demande en attente).
  async function proposerDestruction({ document_id, motif }) {
    setLoading(true)
    try {
      await api.post('/destructions', { document_id, motif })
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Admin / super_admin : liste des demandes en attente.
  async function getDemandes() {
    return api.get('/destructions/demandes')
  }

  // Admin / super_admin : valider une demande (destruction réelle).
  async function validerDemande(id) {
    setLoading(true)
    try {
      await api.post(`/destructions/demandes/${id}/valider`, {})
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Admin / super_admin : refuser une demande (le document n'est pas détruit).
  async function refuserDemande(id) {
    setLoading(true)
    try {
      await api.post(`/destructions/demandes/${id}/refuser`, {})
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  return { loading, marquerDetruit, proposerDestruction, getDemandes, validerDemande, refuserDemande }
}
