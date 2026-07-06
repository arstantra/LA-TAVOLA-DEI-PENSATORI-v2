/**
 * Servizio Text-to-Speech — ElevenLabs API.
 *
 * Dev:  proxy Vite (chiave nel .env locale).
 * Prod: chiamata diretta con chiave dell'utente da localStorage.
 *
 * Cache: gli audio già generati vengono tenuti in memoria (URL blob)
 * per evitare chiamate duplicate sullo stesso testo.
 */

import { getChiaveElevenLabs, chiaveElevenLabsPresente } from './chiavi.js'

const IS_PROD = import.meta.env.PROD
const TTS_BASE = IS_PROD
  ? 'https://api.elevenlabs.io/v1/text-to-speech'
  : '/api/elevenlabs/v1/text-to-speech'
const MODELLO = 'eleven_multilingual_v2'

// Cache: chiave = `${voiceId}::${testo}`, valore = URL blob
const audioCache = new Map()

/**
 * Genera audio da testo tramite ElevenLabs.
 */
export async function generaAudio(testo, voiceId) {
  const cacheKey = `${voiceId}::${testo}`
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)
  }

  const testoTroncato = testo.length > 4500
    ? testo.substring(0, 4500) + '…'
    : testo

  const ttsHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'audio/mpeg',
  }
  if (IS_PROD) ttsHeaders['xi-api-key'] = getChiaveElevenLabs()

  const response = await fetch(`${TTS_BASE}/${voiceId}`, {
    method: 'POST',
    headers: ttsHeaders,
    body: JSON.stringify({
      text: testoTroncato,
      model_id: MODELLO,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.80,
        style: 0.25,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    let errMsg = `ElevenLabs errore ${response.status}`
    try {
      const errData = await response.json()
      errMsg += `: ${errData.detail?.message || JSON.stringify(errData.detail) || JSON.stringify(errData)}`
    } catch {}
    throw new Error(errMsg)
  }

  const arrayBuffer = await response.arrayBuffer()
  const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)

  audioCache.set(cacheKey, url)
  return url
}

/**
 * Libera tutti gli URL blob in cache.
 */
export function svuotaCacheAudio() {
  for (const url of audioCache.values()) {
    URL.revokeObjectURL(url)
  }
  audioCache.clear()
}

/**
 * Restituisce true se la chiave ElevenLabs è configurata.
 */
export function ttsDisponibile() {
  return IS_PROD ? chiaveElevenLabsPresente() : true
}
