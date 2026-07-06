/**
 * Gestione persistenza sessioni in localStorage.
 *
 * Ogni sessione ha:
 * - id: stringa unica (timestamp)
 * - nome: titolo della sessione (auto-generato o rinominato dall'utente)
 * - data: ISO string della creazione
 * - commensali: array dei pensatori selezionati
 * - messaggi: array completo dei messaggi
 * - modalita: 'aperta' | 'diretta' | 'confronto'
 */

const CHIAVE_STORAGE = 'tavola_sessioni'
const MAX_SESSIONI = 30

/**
 * Carica tutte le sessioni salvate, dalla più recente alla più vecchia.
 */
export function caricaSessioni() {
  try {
    const raw = localStorage.getItem(CHIAVE_STORAGE)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * Salva (o aggiorna) una sessione. Se esiste già con lo stesso id, la sovrascrive.
 * Tiene al massimo MAX_SESSIONI sessioni, eliminando le più vecchie.
 */
export function salvaSessione(sessione) {
  const sessioni = caricaSessioni()
  const idx = sessioni.findIndex(s => s.id === sessione.id)

  if (idx >= 0) {
    sessioni[idx] = sessione
  } else {
    sessioni.unshift(sessione)
  }

  const tagliate = sessioni.slice(0, MAX_SESSIONI)
  try {
    localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(tagliate))
  } catch (err) {
    // localStorage pieno — rimuovi messaggi vecchi e riprova
    console.warn('localStorage pieno, cerco di fare spazio…', err)
    const ridotte = tagliate.slice(0, Math.floor(MAX_SESSIONI / 2))
    localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(ridotte))
  }
}

/**
 * Elimina una sessione per id.
 */
export function eliminaSessione(id) {
  const sessioni = caricaSessioni().filter(s => s.id !== id)
  localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(sessioni))
}

/**
 * Carica una sessione specifica per id.
 */
export function caricaSessione(id) {
  return caricaSessioni().find(s => s.id === id) || null
}

/**
 * Crea una nuova sessione vuota.
 */
export function nuovaSessione(commensali) {
  return {
    id: `sessione_${Date.now()}`,
    nome: generaNomeAutomatico(commensali),
    data: new Date().toISOString(),
    commensali,
    messaggi: [],
    modalita: 'aperta',
  }
}

/**
 * Genera un nome automatico basato sui commensali e la data.
 */
function generaNomeAutomatico(commensali) {
  const ora = new Date()
  const giorno = ora.getDate()
  const mesi = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
  ]
  const mese = mesi[ora.getMonth()]
  const anno = ora.getFullYear()

  return `Simposio del ${giorno} ${mese} ${anno}`
}

/**
 * Esporta una sessione come testo plain.
 */
export function esportaSessioneTesto(sessione) {
  const lines = []
  lines.push(`# ${sessione.nome}`)
  lines.push(`${new Date(sessione.data).toLocaleString('it-IT')}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const msg of sessione.messaggi) {
    if (msg.tipo === 'sistema') {
      lines.push(`*[${msg.testo}]*`)
      lines.push('')
    } else if (msg.tipo === 'utente') {
      lines.push(`**Tu:** ${msg.testo}`)
      lines.push('')
    } else if (msg.tipo === 'pensatore') {
      lines.push(`**${msg.pensatore.nome}:**`)
      lines.push(msg.testo)
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Formatta la data di una sessione in formato leggibile.
 */
export function formattaData(isoString) {
  const d = new Date(isoString)
  const ora = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  const giorno = d.getDate()
  const mesi = [
    'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
    'lug', 'ago', 'set', 'ott', 'nov', 'dic',
  ]
  const mese = mesi[d.getMonth()]
  const anno = d.getFullYear()
  return `${giorno} ${mese} ${anno}, ${ora}:${min}`
}

// ─────────────────────────────────────────────────────────────────────────
// Pensatori custom
// ─────────────────────────────────────────────────────────────────────────

const CHIAVE_CUSTOM = 'pensatori_custom'

export function caricaPensatoriCustom() {
  try {
    const raw = localStorage.getItem(CHIAVE_CUSTOM)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function salvaPensatoreCustom(pensatore) {
  const lista = caricaPensatoriCustom()
  const idx = lista.findIndex(function(p) { return p.id === pensatore.id })
  if (idx >= 0) {
    lista[idx] = pensatore
  } else {
    lista.unshift(pensatore)
  }
  try {
    localStorage.setItem(CHIAVE_CUSTOM, JSON.stringify(lista))
  } catch (err) {
    console.warn('localStorage pieno (custom):', err)
  }
}

export function eliminaPensatoreCustom(id) {
  const lista = caricaPensatoriCustom().filter(function(p) { return p.id !== id })
  localStorage.setItem(CHIAVE_CUSTOM, JSON.stringify(lista))
}

// ─────────────────────────────────────────────────────────────────────────
// Override voci — { [pensatoreId]: voiceId }
// ─────────────────────────────────────────────────────────────────────────

const CHIAVE_VOCI = 'voci_override'

export function caricaVociOverride() {
  try {
    const raw = localStorage.getItem(CHIAVE_VOCI)
    if (!raw) return {}
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

export function salvaVoceOverride(pensatoreId, voiceId) {
  const overrides = caricaVociOverride()
  if (voiceId) {
    overrides[pensatoreId] = voiceId
  } else {
    delete overrides[pensatoreId]
  }
  localStorage.setItem(CHIAVE_VOCI, JSON.stringify(overrides))
}

export function rimuoviVoceOverride(pensatoreId) {
  salvaVoceOverride(pensatoreId, null)
}
