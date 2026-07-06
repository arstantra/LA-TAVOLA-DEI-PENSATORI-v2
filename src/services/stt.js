/**
 * Servizio Speech-to-Text -- ElevenLabs Scribe API.
 *
 * Dev:  proxy Vite (chiave nel .env locale).
 * Prod: chiamata diretta con chiave dell'utente da localStorage.
 * Stessa chiave ElevenLabs usata per il TTS.
 */

import { getChiaveElevenLabs } from './chiavi.js'

const IS_PROD = import.meta.env.PROD
const STT_URL = IS_PROD
  ? 'https://api.elevenlabs.io/v1/speech-to-text'
  : '/api/elevenlabs/v1/speech-to-text'

let mediaRecorder = null
let chunksAudio = []
let streamMicrofono = null

/**
 * Avvia la registrazione dal microfono.
 */
export async function avviaRegistrazione() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Il tuo browser non supporta la registrazione audio.')
  }
  if (!window.MediaRecorder) {
    throw new Error('Il tuo browser non supporta MediaRecorder.')
  }

  streamMicrofono = await navigator.mediaDevices.getUserMedia({ audio: true })
  chunksAudio = []

  const mimeType = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ].find(function(t) { return MediaRecorder.isTypeSupported(t) }) || ''

  mediaRecorder = new MediaRecorder(
    streamMicrofono,
    mimeType ? { mimeType: mimeType } : {}
  )

  mediaRecorder.ondataavailable = function(e) {
    if (e.data.size > 0) chunksAudio.push(e.data)
  }

  mediaRecorder.start(100)
}

/**
 * Ferma la registrazione e invia l'audio a ElevenLabs Scribe.
 */
export async function fermaRegistrazione(linguaCodice) {
  if (!linguaCodice) linguaCodice = 'it'

  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    throw new Error('Nessuna registrazione in corso.')
  }

  const blob = await new Promise(function(resolve, reject) {
    mediaRecorder.onstop = function() {
      const mt = mediaRecorder.mimeType || 'audio/webm'
      resolve(new Blob(chunksAudio, { type: mt }))
    }
    mediaRecorder.onerror = function(e) {
      reject(e.error || new Error('Errore registrazione'))
    }
    mediaRecorder.stop()
  })

  if (streamMicrofono) {
    streamMicrofono.getTracks().forEach(function(t) { t.stop() })
    streamMicrofono = null
  }
  mediaRecorder = null

  if (blob.size < 1000) {
    throw new Error('Audio troppo breve o silenzioso.')
  }

  const formData = new FormData()
  const ext = blob.type.includes('ogg') ? 'ogg'
    : blob.type.includes('mp4') ? 'mp4'
    : 'webm'
  formData.append('file', blob, 'audio.' + ext)
  formData.append('model_id', 'scribe_v1')
  formData.append('language_code', linguaCodice.split('-')[0])

  const sttHeaders = {}
  if (IS_PROD) sttHeaders['xi-api-key'] = getChiaveElevenLabs()

  const response = await fetch(STT_URL, {
    method: 'POST',
    headers: sttHeaders,
    body: formData,
  })

  if (!response.ok) {
    let errMsg = 'ElevenLabs STT errore ' + response.status
    try {
      const errData = await response.json()
      if (errData.detail) errMsg += ': ' + JSON.stringify(errData.detail)
    } catch (e) {}
    throw new Error(errMsg)
  }

  const data = await response.json()
  return (data.text || '').trim()
}

/**
 * Annulla una registrazione in corso.
 */
export function annullaRegistrazione() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  if (streamMicrofono) {
    streamMicrofono.getTracks().forEach(function(t) { t.stop() })
    streamMicrofono = null
  }
  mediaRecorder = null
  chunksAudio = []
}

/**
 * Restituisce true se una registrazione e' attiva.
 */
export function isRegistrando() {
  return mediaRecorder !== null && mediaRecorder.state === 'recording'
}
