/**
 * System prompt dell'Orchestratore — La Tavola dei Pensatori v2.
 *
 * L'orchestratore non e' un pensatore. E' il meccanismo che coordina i turni.
 * Riceve i segnali dai pensatori e li presenta al moderatore in formato strutturato.
 *
 * Due modalita':
 * - SEGNALE: chiede a un pensatore se vuole intervenire (risposta JSON breve)
 * - RISPOSTA: da' la parola a un pensatore (risposta completa in prosa)
 *
 * Il prompt di SEGNALE viene iniettato in coda al system prompt di ogni pensatore
 * solo durante le chiamate di tipo segnale. Le chiamate di risposta usano il
 * system prompt normale senza modifiche.
 */

/**
 * Istruzione aggiuntiva iniettata in coda al system prompt del pensatore
 * durante una chiamata di tipo SEGNALE.
 *
 * Non sostituisce il system prompt: si aggiunge alla fine.
 * Cosi' il pensatore rimane nel personaggio anche nel segnale.
 */
export const ISTRUZIONE_SEGNALE = `
## Richiesta di intervento

Ti viene chiesto se intendi intervenire sulla questione in discussione.
Il criterio e' la pertinenza del contributo, non l'intensita' emotiva.
Rispondi SOLO con un oggetto JSON valido su una sola riga, nessun altro testo prima o dopo:
{"vuole_parlare": true, "urgenza": "alta", "tipo": "obiezione", "perche": "una frase sintetica in italiano che indica l'argomento, non l'emozione"}

Valori possibili per "tipo":
- "replica"      — rispondi direttamente a un argomento appena avanzato da un altro partecipante
- "obiezione"    — hai un'obiezione di merito o di metodo a una tesi emersa
- "precisazione" — correggi o precisi un punto specifico gia' toccato
- "contributo"   — porti una prospettiva nuova e pertinente alla questione

Valori possibili per "urgenza":
- "alta"  — la discussione non puo' proseguire correttamente senza il tuo intervento (replica dovuta, errore da correggere)
- "media" — contributo sostanziale ma la discussione regge anche senza
- "bassa" — nota marginale, puo' attendere

Chiedi la parola solo se hai un argomento: non intervenire per presenza scenica.
Se la questione esula dal tuo territorio o non hai nulla di sostanziale da aggiungere:
{"vuole_parlare": false, "urgenza": null, "tipo": null, "perche": null}

IMPORTANTE: nessun testo al di fuori del JSON. Nessuna spiegazione. Solo il JSON.
`

/**
 * Policy di default per ordinare la coda dei segnali quando il moderatore
 * non ha dato istruzioni esplicite sull'ordine.
 *
 * Ordine: alta urgenza prima, poi media, poi bassa.
 * A parita' di urgenza: ordine casuale (per non privilegiare sempre lo stesso).
 */
export function ordinaCoda(segnali) {
  const priorita = { alta: 0, media: 1, bassa: 2 }
  return [...segnali]
    .filter(s => s.vuole_parlare)
    .sort((a, b) => {
      const pa = priorita[a.urgenza] ?? 3
      const pb = priorita[b.urgenza] ?? 3
      if (pa !== pb) return pa - pb
      return Math.random() - 0.5
    })
}
