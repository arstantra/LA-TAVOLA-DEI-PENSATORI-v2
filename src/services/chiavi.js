/**
 * Gestione chiavi API utente — localStorage.
 *
 * Le chiavi non lasciano mai il browser dell'utente.
 * Non vengono mai inviate a server propri — solo direttamente
 * ad Anthropic e ElevenLabs quando necessario.
 */

const KEY_ANTHROPIC   = 'tavola_anthropic_key'
const KEY_ELEVENLABS  = 'tavola_elevenlabs_key'

export function getChiaveAnthropic()    { return localStorage.getItem(KEY_ANTHROPIC)  || '' }
export function getChiaveElevenLabs()   { return localStorage.getItem(KEY_ELEVENLABS) || '' }

export function setChiaveAnthropic(k)   { localStorage.setItem(KEY_ANTHROPIC,  k.trim()) }
export function setChiaveElevenLabs(k)  { localStorage.setItem(KEY_ELEVENLABS, k.trim()) }

export function chiaveAnthropicPresente()   { return !!getChiaveAnthropic() }
export function chiaveElevenLabsPresente()  { return !!getChiaveElevenLabs() }

export function rimuoviChiaveAnthropic()   { localStorage.removeItem(KEY_ANTHROPIC) }
export function rimuoviChiaveElevenLabs()  { localStorage.removeItem(KEY_ELEVENLABS) }

// ─────────────────────────────────────────────────────────────────────────
// Verifica chiavi — chiamate leggere per controllare che le chiavi
// siano valide e attive.
//
// Dev:  passa dal proxy Vite (la chiave arriva dal .env locale)
// Prod: chiamata diretta con la chiave da localStorage
//
// Restituiscono: { ok: bool, messaggio: string }
// ─────────────────────────────────────────────────────────────────────────

const IS_PROD = import.meta.env.PROD

export async function verificaChiaveAnthropic() {
  if (IS_PROD && !chiaveAnthropicPresente()) {
    return { ok: false, messaggio: 'Nessuna chiave salvata.' }
  }

  const url = IS_PROD
    ? 'https://api.anthropic.com/v1/models'
    : '/api/anthropic/v1/models'

  const headers = {}
  if (IS_PROD) {
    headers['x-api-key'] = getChiaveAnthropic()
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  }

  try {
    const res = await fetch(url, { headers })
    if (res.ok) return { ok: true, messaggio: 'Chiave valida e attiva.' }
    if (res.status === 401) return { ok: false, messaggio: 'Chiave non valida o revocata (401).' }
    if (res.status === 403) return { ok: false, messaggio: 'Chiave senza permessi (403).' }
    if (res.status === 429) return { ok: true, messaggio: 'Chiave valida, ma rate limit raggiunto (429).' }
    let dettaglio = ''
    try {
      const data = await res.json()
      dettaglio = data.error?.message ? ' — ' + data.error.message : ''
    } catch { /* corpo non JSON */ }
    return { ok: false, messaggio: 'Errore API ' + res.status + dettaglio }
  } catch {
    return {
      ok: false,
      messaggio: IS_PROD
        ? 'Errore di rete: impossibile raggiungere api.anthropic.com.'
        : 'Proxy dev non raggiungibile: il server Vite è attivo? La chiave è nel .env?',
    }
  }
}

export async function verificaChiaveElevenLabs() {
  if (IS_PROD && !chiaveElevenLabsPresente()) {
    return { ok: false, messaggio: 'Nessuna chiave salvata.' }
  }

  const url = IS_PROD
    ? 'https://api.elevenlabs.io/v1/user'
    : '/api/elevenlabs/v1/user'

  const headers = {}
  if (IS_PROD) headers['xi-api-key'] = getChiaveElevenLabs()

  try {
    const res = await fetch(url, { headers })
    if (res.ok) {
      let extra = ''
      try {
        const data = await res.json()
        const sub = data.subscription
        if (sub && typeof sub.character_count === 'number' && typeof sub.character_limit === 'number') {
          extra = ` Caratteri usati: ${sub.character_count.toLocaleString('it-IT')} / ${sub.character_limit.toLocaleString('it-IT')}.`
        }
      } catch { /* corpo non JSON */ }
      return { ok: true, messaggio: 'Chiave valida e attiva.' + extra }
    }
    if (res.status === 401) return { ok: false, messaggio: 'Chiave non valida o revocata (401).' }
    return { ok: false, messaggio: 'Errore API ' + res.status }
  } catch {
    return {
      ok: false,
      messaggio: IS_PROD
        ? 'Errore di rete: impossibile raggiungere api.elevenlabs.io.'
        : 'Proxy dev non raggiungibile: il server Vite è attivo? La chiave è nel .env?',
    }
  }
}
