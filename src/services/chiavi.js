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
