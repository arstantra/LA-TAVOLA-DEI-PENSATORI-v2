# La Tavola dei Pensatori — v2 Multi-Agente

Documento di architettura. Riassume tutte le decisioni prese prima di scrivere una riga di codice.

---

## Differenza fondamentale con v1

**v1** — Un singolo system prompt descrive tutti i pensatori presenti. Claude li interpreta in sequenza nella stessa risposta. Un modello, più personaggi, buon risultato, ma è sempre una voce sola che fa teatro.

**v2** — Ogni pensatore è un agente separato con il proprio system prompt. Ogni agente riceve come contesto le risposte degli altri. Il dialogo è reale: Illich risponde davvero a quello che ha detto Faggin, non a una parafrasi interna.

---

## Architettura

### Componenti

```
UTENTE (moderatore)
     ↓ lancia tema / interviene
ORCHESTRATORE
     ↓ distribuisce il tema, raccoglie segnali
AGENTE Pensatore A    AGENTE Pensatore B    AGENTE Pensatore C
     ↓                     ↓                     ↓
  risposta              segnale               risposta
     ↓
ORCHESTRATORE — presenta la coda all'utente
     ↓
UTENTE decide chi parla
```

### Flusso per ogni round

1. Utente lancia un tema
2. Orchestratore chiama ogni pensatore con una richiesta breve: "vuoi intervenire? una frase"
3. Ogni pensatore risponde con un segnale strutturato: `{ vuole_parlare: true, urgenza: "alta", perché: "..." }`
4. Orchestratore presenta la coda ordinata all'utente (o usa una policy di default)
5. Per ogni pensatore in coda: chiamata API con system prompt completo + tutta la storia
6. Ogni risposta è resa visibile prima di chiamare il successivo (il successivo "legge" quella precedente)

---

## Livello di autonomia

**I pensatori propongono, il moderatore dispone.**

**Fanno da soli:**
- Rispondono nel loro stile autentico
- Segnalano interesse a intervenire con motivazione breve
- Reagiscono a ciò che gli altri hanno detto quando è il loro turno
- Possono divergere, citarsi, contradirsi

**Non fanno mai:**
- Decidere da soli quando parlare
- Uscire dal tema senza segnalarlo
- Produrre risposte infinite (max_tokens vincolato)
- Rompere il personaggio

---

## Controlli del moderatore

| Azione | Descrizione |
|---|---|
| **Interrupt** | Interrompe un pensatore a metà risposta |
| **Give floor** | Indica chi parla dopo, bypassando la coda |
| **Silence** | Mette un pensatore in stato muto per la sessione |
| **Reactivate** | Riattiva un pensatore silenziato |
| **Direct question** | Interroga uno specifico, bypassando tutti |
| **Change topic** | Nuovo tema, i pensatori ripartono |
| **Bring back** | Riporta la conversazione al tema originale |

---

## Stack tecnico

Identico a v1:

| Componente | Tecnologia |
|---|---|
| Frontend | React + Vite + Tailwind |
| LLM | Anthropic claude-sonnet-4-6 |
| Voce output | ElevenLabs TTS (Fase 3) |
| Voce input | ElevenLabs STT scribe_v1 (Fase 3) |
| Persistenza | localStorage |
| API key | localStorage — chiave personale dell'utente |
| Backend | Nessuno — tutte le chiamate dal browser |

**Nessun backend.** L'orchestrazione è logica JavaScript nel browser che fa chiamate sequenziali all'API Anthropic. La chiave API resta in localStorage esattamente come in v1.

---

## Struttura file (target)

```
src/
  components/
    ConfigScreen.jsx          — selezione commensali + archivio sessioni
    SessionScreen.jsx         — schermata conversazione (riscritta)
    TavolaVisual.jsx          — visualizzazione SVG tavola rotonda (da v1)
    ModeratorControls.jsx     — pannello controlli moderatore (NUOVO)
    SignalQueue.jsx            — visualizza chi vuole parlare (NUOVO)
    VoiceInput.jsx            — input vocale (da v1)
    FormPensatoreCustom.jsx   — pensatori custom (da v1)
  services/
    orchestratore.js          — logica di coordinamento turni (NUOVO, cuore di v2)
    agenti.js                 — chiamate API per singolo agente (NUOVO)
    api.js                    — chiamate Anthropic streaming (adattato da v1)
    tts.js                    — ElevenLabs TTS (da v1)
    stt.js                    — ElevenLabs STT (da v1)
    chiavi.js                 — gestione localStorage API keys (da v1)
    sessioni.js               — persistenza sessioni (da v1)
  data/
    pensatori.js              — dati 10 pensatori + voiceId + TAG_LIST e tag tematici (da v1, esteso)
    prompts.js                — system prompt curati (da v1, il vero patrimonio)
    customPrompts.js          — system prompt pensatori custom (da v1)
    orchestratorePrompt.js    — system prompt dell'orchestratore (NUOVO)
```

---

## Cosa si copia da v1

Valore diretto, nessuna modifica:
- `src/data/pensatori.js` — tutti i dati dei 10 pensatori
- `src/data/prompts.js` — i system prompt curati
- `src/data/customPrompts.js` — logic pensatori custom
- `src/services/chiavi.js` — gestione localStorage
- `src/services/tts.js` — ElevenLabs TTS
- `src/services/stt.js` — ElevenLabs STT
- `src/services/sessioni.js` — persistenza
- `src/components/TavolaVisual.jsx` — visualizzazione tavola
- `src/components/VoiceInput.jsx` — input vocale
- `src/components/FormPensatoreCustom.jsx` — pensatori custom
- `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`

Da riscrivere (nuova logica multi-agente):
- `src/services/orchestratore.js` — cuore di v2
- `src/services/agenti.js` — gestione chiamate per agente
- `src/components/SessionScreen.jsx` — nuovo flusso di conversazione
- `src/components/ModeratorControls.jsx` — controlli moderatore
- `src/components/SignalQueue.jsx` — coda segnali
- `src/App.jsx` — stato globale rivisto

---

## Aggiunta ai system prompt per v2

I system prompt di v1 si usano invariati per le risposte complete.
Per le chiamate di tipo "segnale" (vuole intervenire?), l'orchestratore
inietta una sezione aggiuntiva:

```
## Segnale di intervento
Ti viene chiesto se vuoi intervenire sul tema in corso.
Rispondi SOLO con un JSON, nessun altro testo:
{"vuole_parlare": true/false, "urgenza": "alta/media/bassa", "perche": "una frase"}
```

Questa sezione NON è presente nelle chiamate di risposta completa.

---

## Stime di costo

| Modalità | Costo per sessione (10 round) |
|---|---|
| Solo testo, 3 pensatori | ~$0.80–1.00 |
| Solo testo, 5 pensatori | ~$1.20–1.50 |
| Con voce (ElevenLabs) | +$8–15 per sessione |

Con prompt caching (system prompt fissi): risparmio ~30–40% sul costo Claude.

---

## Fasi di sviluppo v2

### Fase 1 — Prototipo multi-agente testo
- Orchestratore base: distribuisce tema, raccoglie segnali, ordina coda
- 2 pensatori: Faggin e Illich (prima tensione da testare)
- Controlli moderatore: interrupt, give floor, direct question
- Nessuna voce ancora

### Fase 2 — Tavola completa
- Tutti e 10 i pensatori
- Tutti i controlli moderatore
- Persistenza sessioni

### Fase 3 — Voce
- Integrazione TTS e STT da v1 (copia diretta)
- Voci clonate dove disponibili

---

## Regola encoding (OneDrive + bash)

Identica a v1. I file `.js` e `.jsx` vanno scritti tramite bash con heredoc puro ASCII.
I file `.md` e di configurazione possono usare Write/Edit normalmente.
