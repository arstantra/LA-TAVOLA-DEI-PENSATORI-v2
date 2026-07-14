# La Tavola dei Pensatori v2 — Contesto per nuova sessione

Questo file contiene tutto il contesto necessario per riprendere lo sviluppo
di v2 in una nuova sessione. Leggerlo prima di scrivere qualsiasi codice.

---

## Cos'è il progetto

Un simposio conversazionale multi-agente dove grandi pensatori del Novecento
siedono a tavola insieme. L'utente sceglie 2-5 commensali e conversa con loro
via testo (e voce, nelle fasi avanzate).

Il sistema è dichiaratamente artificiale. Ogni interfaccia riporta:
*"Le voci sono sintetiche, modellate sui pensatori reali. Le parole sono generate
da AI nello stile del loro pensiero. Non rappresentano le loro opinioni reali."*

**v1** (già funzionante, non toccare): approccio single-model, un system prompt
per tutti i pensatori, Claude li interpreta in sequenza nella stessa risposta.

**v2** (questo progetto): approccio multi-agente, ogni pensatore è un agente
separato con il proprio system prompt e la propria chiamata API.

---

## Architettura v2

### Flusso per ogni round

```
1. Utente lancia un tema
2. Orchestratore chiama ogni pensatore in PARALLELO: "vuoi intervenire?"
   → ogni pensatore risponde con JSON: {vuole_parlare, urgenza, perche}
3. Orchestratore ordina la coda per urgenza (alta → media → bassa)
4. Presenta la coda al moderatore (utente)
5. Esegue le risposte in SEQUENZA (ogni pensatore vede le risposte precedenti)
6. Ogni risposta in streaming appare man mano che arriva
```

### Principio fondamentale
**I pensatori propongono, il moderatore dispone.**
I pensatori segnalano interesse, non decidono mai da soli quando parlare.

### Controlli del moderatore
- **Interrupt** — interrompe un pensatore a metà risposta
- **Give floor** — indica chi parla dopo, bypassa la coda
- **Silence / Reactivate** — muto/riattiva un pensatore per la sessione
- **Direct question** — interroga uno specifico, bypassa tutti
- **Change topic** — nuovo tema, i pensatori ripartono
- **Bring back** — riporta la conversazione al tema originale

---

## Stack tecnico

| Componente | Tecnologia |
|---|---|
| Frontend | React + Vite + Tailwind |
| LLM | Anthropic claude-sonnet-4-6 |
| API key | localStorage — chiave personale dell'utente |
| Backend | **Nessuno** — tutte le chiamate dal browser |
| Voce output | ElevenLabs TTS (Fase 3, non ancora) |
| Voce input | ElevenLabs STT scribe_v1 (Fase 3, non ancora) |
| Persistenza | localStorage |

L'API Anthropic è chiamata direttamente dal browser con
`anthropic-dangerous-direct-browser-access: true` in produzione.
In sviluppo, il proxy Vite aggiunge la chiave dal file `.env`.

---

## Stato attuale della cartella v2

### File già presenti e pronti

```
package.json                          copiato da v1, invariato
vite.config.js                        copiato da v1, invariato
tailwind.config.js                    copiato da v1, invariato
postcss.config.js                     copiato da v1, invariato
index.html                            copiato da v1, invariato

src/index.css                         copiato da v1
src/main.jsx                          copiato da v1

src/data/pensatori.js                 10 pensatori predefiniti con voiceId e tag tematici (+ TAG_LIST)
src/data/prompts.js                   system prompt curati per tutti e 10
src/data/customPrompts.js             system prompt per pensatori custom
src/data/orchestratorePrompt.js       ISTRUZIONE_SEGNALE + funzione ordinaCoda

src/services/chiavi.js                gestione localStorage (Anthropic + ElevenLabs)
src/services/agenti.js                chiamate API per singolo agente (segnale + risposta)
src/services/orchestratore.js         coordinamento turni, raccolta segnali, esecuzione coda
src/services/tts.js                   ElevenLabs TTS (da usare in Fase 3)
src/services/stt.js                   ElevenLabs STT (da usare in Fase 3)
src/services/sessions.js              persistenza localStorage

src/components/TavolaVisual.jsx       visualizzazione SVG tavola rotonda
src/components/VoiceInput.jsx         input vocale (da usare in Fase 3)
src/components/FormPensatoreCustom.jsx  pensatori custom
```

### File da creare (il lavoro di questa sessione)

```
src/App.jsx                           stato globale, routing tra schermate
src/components/ConfigScreen.jsx       selezione commensali + archivio sessioni
src/components/SessionScreen.jsx      schermata conversazione (cuore UI)
src/components/ModeratorControls.jsx  pannello controlli moderatore
src/components/SignalQueue.jsx        visualizza chi vuole parlare con urgenza
```

---

## Fase 1 — Obiettivo minimo (questa sessione)

Prototipo funzionante con:
- 2 pensatori: Faggin e Illich
- ConfigScreen: selezione commensali
- SessionScreen: lancio tema, risposte sequenziali in streaming
- Controlli base: interrupt, give floor, silence/reactivate
- SignalQueue: mostra chi vuole parlare
- Nessuna voce ancora (solo testo)
- Persistenza sessioni opzionale (si aggiunge dopo)

**Tema di test consigliato per verifica:**
*"Cosa siete voi, in questa stanza?"*
Se Faggin e Illich rispondono in modo autentico e si contraddicono,
il sistema funziona.

---

## Dettaglio dei file nuovi da creare

### App.jsx

Gestisce lo stato globale:
```
stato: {
  schermata: 'config' | 'sessione'
  commensali: []           // pensatori selezionati (2-5)
  statiPensatori: {}       // { [id]: 'attivo' | 'silenzioso' | 'parlando' | 'in_attesa' }
  storia: []               // messaggi della conversazione corrente
  coda: []                 // segnali ordinati in attesa di esecuzione
  modalita: 'aperta' | 'diretta' | 'confronto'
  lingua: 'it'
  isRunning: false         // c'e' un pensatore che sta parlando?
}
```

### ConfigScreen.jsx

- Mostra i 10 pensatori con card cliccabili
- Selezione multipla (min 2, max 5) con feedback visivo
- Pulsante "Inizia sessione" → passa a SessionScreen
- Archivio sessioni precedenti (opzionale Fase 1)
- Si può copiare molto da ConfigScreen.jsx di v1

### SessionScreen.jsx

Struttura:
```
[Header: pensatori seduti con indicatore chi sta parlando]
[Feed conversazione: messaggi con stile tipografico per pensatore]
[SignalQueue: chi vuole parlare e perché]
[ModeratorControls: interrupt, give floor, silence, domanda diretta]
[Input utente: campo testo + pulsante invia]
[Dichiarazione etica sempre visibile in basso]
```

Logica principale:
1. Utente invia messaggio → aggiunge alla storia
2. Chiama `raccogliSegnali()` da orchestratore.js
3. Mostra la coda in SignalQueue
4. Chiama `eseguiCoda()` con i callback UI
5. Ogni chunk aggiorna il messaggio in streaming nello stato

### ModeratorControls.jsx

Pulsanti contestuali (appaiono solo quando pertinenti):
- **[Interrompi]** — visibile solo mentre un pensatore sta parlando
- **[Dai la parola a ▼]** — dropdown con commensali attivi
- **[Silenzia / Riattiva]** per ogni commensale (piccolo toggle vicino al nome)
- **[Domanda diretta a ▼]** — salta la raccolta segnali

### SignalQueue.jsx

Mostra i segnali raccolti prima dell'esecuzione:
```
● Faggin vuole parlare [ALTA] "La coscienza non è computazione, devo rispondere a Illich"
● Illich vuole parlare [MEDIA] "La convivialità è minacciata anche dai simposî artificiali"
```
Con pulsanti per riordinare manualmente o rimuovere qualcuno dalla coda.

---

## API Anthropic — chiamate chiave

### Chiamata segnale (leggera, in parallelo)
```js
// Da agenti.js — chiediSegnale()
{
  model: 'claude-sonnet-4-6',
  max_tokens: 120,
  system: systemPromptPensatore + ISTRUZIONE_SEGNALE,
  messages: [{ role: 'user', content: temaCorrente }]
}
// Risposta attesa: {"vuole_parlare": true, "urgenza": "alta", "perche": "..."}
```

### Chiamata risposta (streaming)
```js
// Da agenti.js — streamRisposta()
{
  model: 'claude-sonnet-4-6',
  max_tokens: 800,
  stream: true,
  system: systemPromptPensatore,   // invariato, senza ISTRUZIONE_SEGNALE
  messages: [
    { role: 'user', content: tema + '[altri commensali: ...]' },
    { role: 'assistant', content: rispostaPrecedenteDelPensatore },  // se esiste
    ...
  ]
}
```

---

## Regola encoding — CRITICA (OneDrive + bash)

I file `.js` e `.jsx` vanno scritti tramite bash con heredoc puro ASCII:

```bash
cat > "/percorso/file.jsx" << 'ENDOFFILE'
// solo caratteri ASCII nel codice sorgente
// nessun accento, em dash, caratteri non-ASCII
ENDOFFILE
```

I file `.md` e di configurazione non-JS possono usare Write/Edit normalmente.

Le accentate nei commenti JS si scrivono senza accento (es. `e'` invece di `è`,
`piu'` invece di `più`) o si evitano.

---

## Percorsi bash

La cartella v2 in bash è:
`/sessions/nifty-pensive-maxwell/mnt/LA TAVOLA DEI PENSATORI v2/`

La cartella v1 (solo lettura riferimento) è:
`/sessions/nifty-pensive-maxwell/mnt/LA TAVOLA DEI PENSATORI v1/`

---

## I 10 pensatori predefiniti

| id | Nome | Territorio |
|---|---|---|
| faggin | Federico Faggin | Coscienza, tecnologia, identità |
| illich | Ivan Illich | Critica istituzioni, autonomia, convivialità |
| fukuoka | Masanobu Fukuoka | Natura, non-fare, agricoltura come filosofia |
| sen | Amartya Sen | Libertà, giustizia, capacità umane |
| alexander | Christopher Alexander | Bellezza, luoghi, pattern del vivere |
| morin | Edgar Morin | Complessità, educazione, pensiero connettivo |
| shiva | Vandana Shiva | Biodiversità, semi, critica agricoltura industriale |
| berry | Wendell Berry | Terra, comunità, modernità |
| freire | Paulo Freire | Educazione degli oppressi, coscientizzazione |
| schumacher | Ernst F. Schumacher | Economia umana, locale, Small is Beautiful |

### Tavoli tematici (tag)

Ogni pensatore ha un campo `tags` (vedi `TAG_LIST` in `pensatori.js`):
Design, Educazione, Economia, Ecologia, Tecnologia, Società, Filosofia.
La ConfigScreen mostra chip filtro sopra la griglia ("Tavoli tematici");
il FormPensatoreCustom permette di assegnare tag anche ai pensatori custom.

| id | tags |
|---|---|
| faggin | tecnologia, filosofia |
| illich | educazione, societa |
| fukuoka | ecologia, filosofia |
| sen | economia, societa |
| alexander | design, filosofia |
| morin | educazione, filosofia |
| shiva | ecologia, societa |
| berry | ecologia, economia |
| freire | educazione, societa |
| schumacher | economia, ecologia |

Tensioni più produttive per i test:
- **Faggin ↔ Morin**: coscienza irriducibile vs emergente da complessità
- **Illich ↔ Sen**: libertà vernacolare vs capacità misurabili
- **Fukuoka ↔ Alexander**: non-fare vs progettare pattern

---

## Per iniziare subito

```bash
cd "/sessions/nifty-pensive-maxwell/mnt/LA TAVOLA DEI PENSATORI v2"
npm install   # installa dipendenze (solo la prima volta)
npm run dev   # avvia su http://localhost:5173
```

Il file `.env` non esiste ancora in v2 — crearlo copiandolo da v1:
```bash
cp "/sessions/nifty-pensive-maxwell/mnt/LA TAVOLA DEI PENSATORI v1/.env" \
   "/sessions/nifty-pensive-maxwell/mnt/LA TAVOLA DEI PENSATORI v2/.env" 2>/dev/null || echo "crea .env manualmente"
```

Contenuto `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...   # opzionale in Fase 1
```
