/**
 * orchestratore.js — Cuore di v2. Coordina i turni tra i pensatori.
 *
 * Responsabilita':
 * 1. Raccogliere i segnali da tutti i pensatori (in parallelo)
 * 2. Ordinare la coda per urgenza
 * 3. Eseguire le risposte in sequenza (ogni pensatore vede le risposte precedenti)
 * 4. Rispettare i comandi del moderatore (stato pensatori, interruzioni, override)
 *
 * Non decide mai da solo chi parla: presenta la coda al moderatore
 * e aspetta istruzioni, oppure esegue la policy di default se il moderatore
 * ha abilitato la modalita' automatica.
 */

import { chiediSegnale, streamRisposta } from './agenti.js'
import { ordinaCoda } from '../data/orchestratorePrompt.js'

/**
 * Stati possibili per un pensatore nella sessione.
 */
export const STATI_PENSATORE = {
  ATTIVO: 'attivo',       // partecipa normalmente
  SILENZIOSO: 'silenzioso', // moderatore lo ha messo in muto
  PARLANDO: 'parlando',   // sta generando una risposta
  IN_ATTESA: 'in_attesa', // e' in coda, aspetta il suo turno
}

/**
 * Raccoglie i segnali da tutti i pensatori attivi in parallelo.
 * I pensatori silenziosi vengono saltati.
 *
 * Restituisce { coda, astenuti }:
 *   coda:     segnali ordinati per urgenza, pronti per il moderatore
 *   astenuti: pensatori che hanno scelto di non intervenire (con eventuale motivo)
 */
export async function raccogliSegnali({ commensali, statiPensatori, storia, modalita, lingua }) {
  const attivi = commensali.filter(p => statiPensatori[p.id] !== STATI_PENSATORE.SILENZIOSO)
  const altriCommensali = commensali

  // Chiamate in parallelo: tutti i pensatori rispondono contemporaneamente
  const promesse = attivi.map(pensatore =>
    chiediSegnale({ pensatore, storia, altriCommensali, modalita, lingua })
  )

  const segnali = await Promise.all(promesse)
  return {
    coda: ordinaCoda(segnali),
    astenuti: segnali.filter(s => !s.vuole_parlare && s.pensatore),
  }
}

/**
 * Esegue in streaming la risposta di un pensatore specifico.
 * Aggiorna la storia man mano che il testo arriva (per mostrarlo in tempo reale).
 *
 * onChunk(testo): callback chiamata ad ogni frammento di testo
 * onFine(testoCompleto): callback chiamata quando la risposta e' terminata
 * abortSignal: segnale per interrompere (comando moderatore Interrupt)
 */
export async function eseguiRisposta({
  pensatore,
  storia,
  commensali,
  modalita,
  lingua,
  onChunk,
  onFine,
  abortSignal,
}) {
  const altriCommensali = commensali.filter(p => p.id !== pensatore.id)
  let testoCompleto = ''

  try {
    const stream = streamRisposta({ pensatore, storia, altriCommensali, modalita, lingua })

    for await (const chunk of stream) {
      if (abortSignal?.aborted) break
      testoCompleto += chunk
      onChunk?.(chunk, testoCompleto)
    }

    onFine?.(testoCompleto, false) // false = completata normalmente
  } catch (err) {
    if (abortSignal?.aborted) {
      onFine?.(testoCompleto, true) // true = interrotta dal moderatore
    } else {
      throw err
    }
  }
}

/**
 * Esegue in sequenza una lista ordinata di pensatori.
 * Ogni pensatore "vede" le risposte di quelli precedenti nella storia.
 *
 * storiaMutabile: array che viene aggiornato ad ogni risposta completata,
 *   cosi' il pensatore successivo ha gia' il contesto di chi ha parlato prima.
 *
 * onPensatoreInizio(pensatore): chiamata quando inizia a parlare
 * onChunk(pensatore, chunk, testoFinoraCompleto): chunk in arrivo
 * onPensatoreFine(pensatore, testo, interrotta): risposta completata
 * getAbortSignal(pensatoreId): ritorna il segnale di abort per quel pensatore
 */
export async function eseguiCoda({
  coda,
  storiaMutabile,
  commensali,
  modalita,
  lingua,
  onPensatoreInizio,
  onChunk,
  onPensatoreFine,
  getAbortSignal,
}) {
  for (const segnale of coda) {
    const { pensatore } = segnale
    onPensatoreInizio?.(pensatore)

    await eseguiRisposta({
      pensatore,
      storia: [...storiaMutabile],
      commensali,
      modalita,
      lingua,
      onChunk: (chunk, testo) => onChunk?.(pensatore, chunk, testo),
      onFine: (testo, interrotta) => {
        // Aggiunge la risposta alla storia mutabile per i pensatori successivi
        if (testo.trim()) {
          storiaMutabile.push({
            tipo: 'pensatore',
            pensatore,
   