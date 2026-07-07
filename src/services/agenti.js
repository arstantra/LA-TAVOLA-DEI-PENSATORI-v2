/**
 * agenti.js — Gestione chiamate API per singolo agente pensatore.
 *
 * Differenza rispetto ad api.js di v1:
 * - v1: una chiamata per tutti i pensatori (approccio 1, un modello fa teatro)
 * - v2: una chiamata per pensatore, ognuno riceve il contesto degli altri
 *
 * Due tipi di chiamata:
 * 1. chiediSegnale()  — risposta JSON breve: vuole intervenire?
 * 2. streamRisposta() — risposta completa in streaming
 *
 * La chiave API viene letta da localStorage tramite chiavi.js — nessun backend.
 */

import { buildSystemPrompt } from '../data/prompts.js'
import { buildCustomSystemPrompt } from '../data/customPrompts.js'
import { ISTRUZIONE_SEGNALE } from '../data/orchestratorePrompt.js'
import { getChiaveAnthropic } from './chiavi.js'

const IS_PROD = import.meta.env.PROD
const API_URL = IS_PROD
  ? 'https://api.anthropic.com/v1/messages'
  : '/api/anthropic/v1/messages'

function getHeaders() {
  const h = { 'Content-Type': 'application/json' }
  if (IS_PROD) {
    h['x-api-key'] = getChiaveAnthropic()
    h['anthropic-version'] = '2023-06-01'
    h['anthropic-dangerous-direct-browser-access'] = 'true'
  }
  return h
}

/** Restituisce il system prompt base del pensatore (invariato da v1). */
function getSystemPromptBase(pensatore, altriCommensali, modalita, lingua) {
  if (pensatore.custom) {
    return buildCustomSystemPrompt(pensatore, altriCommensali, modalita, lingua)
  }
  return buildSystemPrompt(pensatore.id, altriCommensali, modalita, lingua, pensatore)
}

/**
 * Costruisce i messaggi API per un pensatore specifico.
 * Ogni pensatore vede i messaggi degli altri come contesto nel turno utente.
 * Identico alla logica di buildApiMessages in api.js di v1.
 */
function buildMessages(storia, pensatoreId) {
  const messaggiFiltrati = storia.filter(
    m => m.tipo !== 'sistema' && !m.streaming
  )

  const rounds = []
  let roundCorrente = null

  for (const msg of messaggiFiltrati) {
    if (msg.tipo === 'utente') {
      roundCorrente = { userMsg: msg.testo, thisResponse: null, othersResponses: [] }
      rounds.push(roundCorrente)
    } else if (msg.tipo === 'pensatore' && roundCorrente) {
      if (msg.pensatore.id === pensatoreId) {
        roundCorrente.thisResponse = msg.testo
      } else {
        roundCorrente.othersResponses.push(msg)
      }
    }
  }

  const messages = []

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]
    const isUltimo = i === rounds.length - 1

    let userContent = round.userMsg
    if (round.othersResponses.length > 0) {
      const contesto = round.othersResponses
        .map(r => {
          const testo = r.testo.length > 400
            ? r.testo.substring(0, 400) + '...'
            : r.testo
          return r.pensatore.nome + ': "' + testo + '"'
        })
        .join('\n\n')
      userContent += '\n\n[Gli altri commensali hanno gia\' risposto:\n' + contesto + ']'
    }

    messages.push({ role: 'user', content: userContent })

    if (round.thisResponse) {
      messages.push({ role: 'assistant', content: round.thisResponse })
    } else if (!isUltimo) {
      messages.push({ role: 'assistant', content: '[Ascolto.]' })
    }
  }

  return messages
}

/**
 * Chiede a un pensatore se vuole intervenire sul tema corrente.
 * Chiamata leggera: usa max_tokens basso, aspetta JSON.
 *
 * Restituisce: { vuole_parlare: bool, urgenza: string|null, perche: string|null }
 */
export async function chiediSegnale({ pensatore, storia, altriCommensali, modalita, lingua = 'it' }) {
  const systemBase = getSystemPromptBase(pensatore, altriCommensali, modalita, lingua)
  const systemPrompt = systemBase + '\n' + ISTRUZIONE_SEGNALE
  const messages = buildMessages(storia, pensatore.id)

  const silenzio = (errore = null) => ({
    pensatoreId: pensatore.id, pensatore,
    vuole_parlare: false, urgenza: null, tipo: null, perche: null,
    errore,
  })

  if (messages.length === 0 || messages[messages.length - 1].role === 'assistant') {
    return silenzio()
  }

  // In produzione, senza chiave la chiamata fallirebbe comunque:
  // meglio un errore chiaro subito.
  if (IS_PROD && !getChiaveAnthropic()) {
    return silenzio('Chiave API Anthropic non configurata.')
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 120,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      let dettaglio = ''
      try {
        const errData = await response.json()
        dettaglio = errData.error?.message ? ': ' + errData.error.message : ''
      } catch { /* corpo non JSON */ }
      if (response.status === 401) return silenzio('Chiave API non valida o revocata (401).')
      return silenzio('Errore API ' + response.status + dettaglio)
    }

    const data = await response.json()
    const testo = data.content[0]?.text?.trim() || ''
    const jsonMatch = testo.match(/\{.*\}/)
    if (!jsonMatch) return silenzio()

    const segnale = JSON.parse(jsonMatch[0])
    return {
      pensatoreId: pensatore.id,
      pensatore,
      vuole_parlare: !!segnale.vuole_parlare,
      urgenza: segnale.urgenza || null,
      tipo: segnale.tipo || null,
      perche: segnale.perche || null,
      errore: null,
    }
  } catch (err) {
    return silenzio('Errore di rete: ' + (err?.message || 'connessione fallita'))
  }
}

/**
 * Genera in streaming la risposta completa di un pensatore.
 * Il pensatore "legge" le risposte degli altri gia' presenti nella storia.
 */
export async function* streamRisposta({ pensatore, storia, altriCommensali, modalita, lingua = 'it' }) {
  const systemPrompt = getSystemPromptBase(pensatore, altriCommensali, modalita, lingua)
  const messages = buildMessages(storia, pensatore.id)

  if (messages.length === 0) throw new Error('Nessun messaggio da inviare')
  if (messages[messages.length - 1].role === 'assistant') {
    messages.push({ role: 'user', content: '[Il moderatore ti ha dato la parola. Puoi continuare o approfondire.]' })
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1600,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    let errMsg = 'Errore API ' + response.status
    try {
      const errData = await response.json()
      errMsg += ': ' + (errData.error?.message || JSON.stringify(errData))
    } catch {}
    throw new Error(errMsg)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        if (
          parsed.type === 'content_block_delta' &&
          parsed.delta?.type === 'text_delta' &&
          parsed.delta.text
        ) {
          yield parsed.delta.text
        }
      } catch {
        // chunk non valido, ignora
      }
    }
  }
}
