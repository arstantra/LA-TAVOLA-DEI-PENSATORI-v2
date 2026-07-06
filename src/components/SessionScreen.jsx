/**
 * SessionScreen.jsx — Schermata della sessione in corso.
 *
 * Layout a due colonne:
 *   [Colonna centrale]  trascrizione della discussione + input del moderatore
 *   [Console laterale]  partecipanti, richieste di intervento, moderazione
 *
 * Due densita':
 *   - lavoro:        console visibile, testo compatto
 *   - presentazione: console nascosta, tipografia grande (proiezione/didattica)
 *
 * Sistema voci:
 *   TTS automatico via ElevenLabs a fine streaming, un audio alla volta.
 *   STT: VoiceInput accanto al textarea, trascrizione nel campo, invio manuale.
 */

import { useState, useRef, useEffect } from 'react'
import SignalQueue from './SignalQueue.jsx'
import ModeratorControls from './ModeratorControls.jsx'
import VoiceInput from './VoiceInput.jsx'
import { raccogliSegnali, eseguiRisposta, STATI_PENSATORE } from '../services/orchestratore.js'
import { generaAudio, ttsDisponibile } from '../services/tts.js'

const COLORI_PENSATORI = [
  'text-amber-300',
  'text-sky-300',
  'text-emerald-300',
  'text-rose-300',
  'text-violet-300',
  'text-orange-300',
  'text-teal-300',
  'text-pink-300',
  'text-lime-300',
  'text-cyan-300',
]

const BORDI_PENSATORI = [
  'border-amber-300/40',
  'border-sky-300/40',
  'border-emerald-300/40',
  'border-rose-300/40',
  'border-violet-300/40',
  'border-orange-300/40',
  'border-teal-300/40',
  'border-pink-300/40',
  'border-lime-300/40',
  'border-cyan-300/40',
]

export default function SessionScreen({
  commensali,
  statiPensatori,
  setStatiPensatori,
  storia,
  setStoria,
  coda,
  setCoda,
  isRunning,
  setIsRunning,
  onTornaConfig,
}) {
  const [inputTesto, setInputTesto] = useState('')
  const [caricandoSegnali, setCaricandoSegnali] = useState(false)
  const [pensatoreCorrente, setPensatoreCorrente] = useState(null)
  const [messaggioStreaming, setMessaggioStreaming] = useState(null)
  const [astenuti, setAstenuti] = useState([])

  // --- Densita': lavoro | presentazione ---
  const [presentazione, setPresentazione] = useState(
    () => localStorage.getItem('ltp_presentazione') === '1'
  )
  function togglePresentazione() {
    setPresentazione(p => {
      localStorage.setItem('ltp_presentazione', p ? '0' : '1')
      return !p
    })
  }

  // --- Dialogo autonomo ---
  const [modalitaAutonoma, setModalitaAutonoma] = useState(false)
  const [countdownAuto, setCountdownAuto] = useState(null)

  // --- Sistema voci ---
  // Coda sequenziale: un intervento alla volta, nell'ordine in cui e' stato detto.
  // audioCorrenteId: id del messaggio in riproduzione (per i pulsanti nel feed)
  const [vociAttive, setVociAttive] = useState(ttsDisponibile())
  const [audioCorrenteId, setAudioCorrenteId] = useState(null)
  const audioRef = useRef(null)           // elemento Audio in riproduzione
  const codaAudioRef = useRef([])         // [{ id, testo, voiceId }]
  const inRiproduzioneRef = useRef(false) // il loop della coda e' attivo?
  const risolviAudioRef = useRef(null)    // resolve della Promise di riproduzione
  const cacheAudioRef = useRef({})        // { [msgId]: objectURL } — evita rigenerazioni

  const abortControllers = useRef({})
  const storiaRef = useRef(storia)
  const feedRef = useRef(null)
  const modalitaAutonomaRef = useRef(false)
  const stopAutoRef = useRef(false)
  const statiPensatoriRef = useRef(statiPensatori)
  const vociAttiveRef = useRef(vociAttive)

  useEffect(() => { storiaRef.current = storia }, [storia])
  useEffect(() => { modalitaAutonomaRef.current = modalitaAutonoma }, [modalitaAutonoma])
  useEffect(() => { statiPensatoriRef.current = statiPensatori }, [statiPensatori])
  useEffect(() => { vociAttiveRef.current = vociAttive }, [vociAttive])

  // Scroll automatico in fondo alla trascrizione
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [storia, messaggioStreaming])

  function aggiungiMessaggio(msg) {
    setStoria(prev => {
      const nuova = [...prev, msg]
      storiaRef.current = nuova
      return nuova
    })
  }

  // ── TTS: coda sequenziale ─────────────────────────────────────────────────

  /** Ferma l'audio in corso (il loop della coda passa al successivo). */
  function fermaAudioCorrente() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setAudioCorrenteId(null)
    if (risolviAudioRef.current) {
      const r = risolviAudioRef.current
      risolviAudioRef.current = null
      r()
    }
  }

  /** Svuota la coda e ferma l'audio in corso. */
  function fermaTuttoAudio() {
    codaAudioRef.current = []
    fermaAudioCorrente()
  }

  /**
   * Loop della coda: genera (o recupera dalla cache) e riproduce
   * un intervento alla volta, in ordine. Un solo loop attivo per volta.
   */
  async function processaCodaAudio() {
    if (inRiproduzioneRef.current) return
    inRiproduzioneRef.current = true

    while (codaAudioRef.current.length > 0) {
      const item = codaAudioRef.current.shift()

      let url = cacheAudioRef.current[item.id]
      if (!url) {
        try {
          url = await generaAudio(item.testo, item.voiceId)
          cacheAudioRef.current[item.id] = url
        } catch {
          continue // errore TTS non bloccante: salta al prossimo
        }
      }

      await new Promise(resolve => {
        const audio = new Audio(url)
        audioRef.current = audio
        risolviAudioRef.current = resolve
        setAudioCorrenteId(item.id)
        audio.onended = () => {
          audioRef.current = null
          risolviAudioRef.current = null
          setAudioCorrenteId(null)
          resolve()
        }
        audio.play().catch(() => {
          audioRef.current = null
          risolviAudioRef.current = null
          setAudioCorrenteId(null)
          resolve()
        })
      })
    }

    inRiproduzioneRef.current = false
  }

  /** Accoda un intervento (riproduzione automatica, rispetta l'ordine). */
  function accodaAudio(msg) {
    if (!msg.pensatore?.voiceId || !ttsDisponibile()) return
    codaAudioRef.current.push({ id: msg.id, testo: msg.testo, voiceId: msg.pensatore.voiceId })
    processaCodaAudio()
  }

  /** Riproduzione manuale di un singolo intervento (pulsante nel feed). */
  function riproduciSingolo(msg) {
    if (!msg.pensatore?.voiceId || !ttsDisponibile()) return
    codaAudioRef.current = []
    fermaAudioCorrente()
    codaAudioRef.current.push({ id: msg.id, testo: msg.testo, voiceId: msg.pensatore.voiceId })
    processaCodaAudio()
  }

  function toggleVoci() {
    if (vociAttive) fermaTuttoAudio()
    setVociAttive(v => !v)
  }

  // ── Dialogo autonomo ──────────────────────────────────────────────────────

  function toggleModalitaAutonoma() {
    if (modalitaAutonoma) {
      stopAutoRef.current = true
      modalitaAutonomaRef.current = false
      setModalitaAutonoma(false)
      setCountdownAuto(null)
    } else {
      stopAutoRef.current = false
      modalitaAutonomaRef.current = true
      setModalitaAutonoma(true)
    }
  }

  // ── Input moderatore ──────────────────────────────────────────────────────

  async function inviaTema(testo) {
    if (!testo.trim() || isRunning || caricandoSegnali || countdownAuto !== null) return

    const msgUtente = {
      tipo: 'utente',
      testo: testo.trim(),
      timestamp: Date.now(),
    }
    aggiungiMessaggio(msgUtente)
    setInputTesto('')

    setCaricandoSegnali(true)
    setCoda([])
    setAstenuti([])

    try {
      const risultato = await raccogliSegnali({
        commensali,
        statiPensatori,
        storia: [...storiaRef.current],
        modalita: 'aperta',
        lingua: 'it',
      })
      setCaricandoSegnali(false)
      setAstenuti(risultato.astenuti)

      if (risultato.coda.length === 0) {
        aggiungiMessaggio({
          tipo: 'sistema',
          testo: 'Nessun partecipante chiede la parola su questa questione.',
          timestamp: Date.now(),
        })
        return
      }

      setCoda(risultato.coda)
      await eseguiCodaUI(risultato.coda)
    } catch (err) {
      setCaricandoSegnali(false)
      aggiungiMessaggio({
        tipo: 'sistema',
        testo: 'Errore durante la raccolta delle richieste: ' + err.message,
        timestamp: Date.now(),
      })
    }
  }

  // ── Esecuzione coda ───────────────────────────────────────────────────────

  /**
   * Esegue un giro di interventi e, se il dialogo autonomo e' attivo,
   * continua con i giri successivi. Loop while per evitare ricorsione.
   */
  async function eseguiCodaUI(codaDaEseguire) {
    let codaCorrente = codaDaEseguire

    while (true) {
      setIsRunning(true)
      const storiaMutabile = [...storiaRef.current]

      for (const segnale of codaCorrente) {
        const { pensatore } = segnale
        const controller = new AbortController()
        abortControllers.current[pensatore.id] = controller

        setPensatoreCorrente(pensatore)
        setStatiPensatori(prev => ({ ...prev, [pensatore.id]: STATI_PENSATORE.PARLANDO }))
        setMessaggioStreaming({ pensatore, testo: '' })

        try {
          await eseguiRisposta({
            pensatore,
            storia: [...storiaMutabile],
            commensali,
            modalita: 'aperta',
            lingua: 'it',
            onChunk: (chunk, testo) => {
              setMessaggioStreaming({ pensatore, testo })
            },
            onFine: (testo, interrotta) => {
              if (testo.trim()) {
                const msg = {
                  id: Date.now() + '_' + pensatore.id,
                  tipo: 'pensatore',
                  pensatore,
                  testo,
                  interrotta: !!interrotta,
                  timestamp: Date.now(),
                }
                storiaMutabile.push(msg)
                setStoria([...storiaMutabile])
                storiaRef.current = [...storiaMutabile]

                // Accoda l'audio: la coda garantisce la riproduzione in sequenza
                if (!interrotta && vociAttiveRef.current) {
                  accodaAudio(msg)
                }
              }
            },
            abortSignal: controller.signal,
          })
        } catch (err) {
          if (!controller.signal.aborted) {
            aggiungiMessaggio({
              tipo: 'sistema',
              testo: 'Errore nell\'intervento di ' + pensatore.nome + ': ' + err.message,
              timestamp: Date.now(),
            })
          } else {
            fermaTuttoAudio()
          }
        }

        delete abortControllers.current[pensatore.id]
        setMessaggioStreaming(null)
        setStatiPensatori(prev => ({
          ...prev,
          [pensatore.id]: prev[pensatore.id] === STATI_PENSATORE.SILENZIOSO
            ? STATI_PENSATORE.SILENZIOSO
            : STATI_PENSATORE.ATTIVO,
        }))
      }

      setPensatoreCorrente(null)
      setIsRunning(false)
      setCoda([])

      // --- Prosecuzione autonoma ---
      if (!modalitaAutonomaRef.current || stopAutoRef.current) break

      for (let i = 3; i >= 1; i--) {
        if (stopAutoRef.current) { setCountdownAuto(null); return }
        setCountdownAuto(i)
        await new Promise(r => setTimeout(r, 1000))
      }
      setCountdownAuto(null)
      if (stopAutoRef.current) break

      // Trigger nascosto: non appare nella trascrizione, serve solo all'API
      const trigger = {
        tipo: 'utente',
        testo: 'La discussione prosegue. Rispondete nel merito agli argomenti emersi: sviluppate, obiettate o precisate punti specifici gia\' avanzati.',
        hidden: true,
        timestamp: Date.now(),
      }
      const nuovaStoria = [...storiaRef.current, trigger]
      storiaRef.current = nuovaStoria
      setStoria(nuovaStoria)

      setCaricandoSegnali(true)
      let nuovoRisultato = null
      try {
        nuovoRisultato = await raccogliSegnali({
          commensali,
          statiPensatori: statiPensatoriRef.current,
          storia: storiaRef.current,
          modalita: 'aperta',
          lingua: 'it',
        })
        setCaricandoSegnali(false)
      } catch {
        setCaricandoSegnali(false)
        break
      }

      setAstenuti(nuovoRisultato.astenuti)

      if (nuovoRisultato.coda.length === 0 || stopAutoRef.current) {
        aggiungiMessaggio({
          tipo: 'sistema',
          testo: 'La discussione si esaurisce. Proponi una nuova questione per riprendere.',
          timestamp: Date.now(),
        })
        stopAutoRef.current = true
        setModalitaAutonoma(false)
        modalitaAutonomaRef.current = false
        break
      }

      setCoda(nuovoRisultato.coda)
      codaCorrente = nuovoRisultato.coda
    }
  }

  // ── Comandi moderatore ────────────────────────────────────────────────────

  function interrompi() {
    if (pensatoreCorrente) {
      const ctrl = abortControllers.current[pensatoreCorrente.id]
      if (ctrl) ctrl.abort()
    }
  }

  function daiParola(pensatore) {
    if (isRunning || caricandoSegnali) return
    eseguiCodaUI([{ pensatore, urgenza: 'alta', tipo: null, perche: 'Il moderatore concede la parola' }])
  }

  function domandaDiretta(pensatore, domanda) {
    if (isRunning || caricandoSegnali) return
    const msgUtente = { tipo: 'utente', testo: domanda, timestamp: Date.now() }
    aggiungiMessaggio(msgUtente)
    eseguiCodaUI([{ pensatore, urgenza: 'alta', tipo: null, perche: 'Domanda diretta del moderatore' }])
  }

  function silenzia(pensatoreId) {
    setStatiPensatori(prev => ({ ...prev, [pensatoreId]: STATI_PENSATORE.SILENZIOSO }))
    setCoda(prev => prev.filter(s => s.pensatore.id !== pensatoreId))
  }

  function riattiva(pensatoreId) {
    setStatiPensatori(prev => ({ ...prev, [pensatoreId]: STATI_PENSATORE.ATTIVO }))
  }

  function riordinaCoda(nuovaCoda) {
    setCoda(nuovaCoda)
  }

  function rimuoviDaCoda(pensatoreId) {
    setCoda(prev => prev.filter(s => s.pensatore.id !== pensatoreId))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      inviaTema(inputTesto)
    }
  }

  function onTrascrizione(testo) {
    setInputTesto(prev => (prev ? prev + ' ' + testo : testo))
  }

  // ── Mappe colori ──────────────────────────────────────────────────────────

  const coloreMap = {}
  const bordoMap = {}
  commensali.forEach((p, i) => {
    coloreMap[p.id] = COLORI_PENSATORI[i % COLORI_PENSATORI.length]
    bordoMap[p.id] = BORDI_PENSATORI[i % BORDI_PENSATORI.length]
  })

  const bloccato = isRunning || caricandoSegnali || countdownAuto !== null
  const ttsOk = ttsDisponibile()

  // Classi dipendenti dalla densita'
  const nomeCls = presentazione ? 'text-base tracking-wide' : 'text-xs tracking-wide'
  const prosaCls = presentazione ? 'text-xl leading-relaxed' : 'text-[15px] leading-relaxed'
  const larghezzaFeed = presentazione ? 'max-w-3xl' : 'max-w-2xl'

  const btnHeaderCls = (attivo) => [
    'text-xs px-2.5 py-1 rounded border transition-colors',
    attivo
      ? 'border-stone-400 text-stone-200 bg-stone-800'
      : 'border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300',
  ].join(' ')

  return (
    <div className="h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="font-serif text-amber-100/90 text-sm tracking-wide flex-shrink-0">
            La Tavola dei Pensatori
          </h1>
          {/* In presentazione i partecipanti appaiono qui (console nascosta) */}
          {presentazione && (
            <div className="flex items-center gap-3 flex-wrap">
              {commensali.map(p => {
                const stato = statiPensatori[p.id]
                const isParlando = stato === STATI_PENSATORE.PARLANDO
                const isSilenzioso = stato === STATI_PENSATORE.SILENZIOSO
                return (
                  <span key={p.id} className={[
                    'text-xs font-serif',
                    isParlando ? 'text-amber-200' : isSilenzioso ? 'text-stone-700 line-through' : 'text-stone-500',
                  ].join(' ')}>
                    {p.nome.split(' ').slice(-1)[0]}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={toggleVoci} title={vociAttive ? 'Disattiva la lettura automatica degli interventi' : 'Lettura automatica degli interventi (richiede chiave ElevenLabs). I singoli interventi restano ascoltabili dal feed.'} className={btnHeaderCls(vociAttive)}>
            Lettura automatica
          </button>
          <button onClick={toggleModalitaAutonoma} title={modalitaAutonoma ? 'Sospendi il dialogo autonomo' : 'I partecipanti proseguono la discussione tra loro'} className={btnHeaderCls(modalitaAutonoma)}>
            Dialogo autonomo
          </button>
          <button onClick={togglePresentazione} title="Testo grande, console nascosta" className={btnHeaderCls(presentazione)}>
            Presentazione
          </button>
          <button
            onClick={onTornaConfig}
            className="text-xs text-stone-600 hover:text-stone-400 transition-colors ml-1"
          >
            Chiudi sessione
          </button>
        </div>
      </header>

      {/* Corpo: trascrizione + console */}
      <div className="flex-1 flex min-h-0">
        {/* Colonna centrale */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Trascrizione */}
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto px-4 py-5"
            style={{ minHeight: 0 }}
          >
            <div className={`${larghezzaFeed} mx-auto w-full flex flex-col gap-5`}>
              {storia.length === 0 && !caricandoSegnali && (
                <div className="text-center text-stone-600 text-sm mt-10 font-serif italic">
                  Proponi una questione per aprire la sessione.
                </div>
              )}

              {storia.map((msg, i) => {
                if (msg.hidden) return null

                if (msg.tipo === 'utente') {
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <span className={`${nomeCls} uppercase text-stone-500`}>
                        Moderatore
                      </span>
                      <p className={`${prosaCls} text-stone-400 italic whitespace-pre-wrap`}>
                        {msg.testo}
                      </p>
                    </div>
                  )
                }
                if (msg.tipo === 'pensatore') {
                  const msgId = msg.id || 'idx_' + i
                  const inRiproduzione = audioCorrenteId === msgId
                  const audioPossibile = ttsOk && msg.pensatore.voiceId
                  return (
                    <div key={i} className={`flex flex-col gap-1 border-l-2 pl-3 ${bordoMap[msg.pensatore.id] || 'border-stone-700'}`}>
                      <span className={`${nomeCls} uppercase font-medium ${coloreMap[msg.pensatore.id] || 'text-amber-300'} flex items-center gap-2`}>
                        <span>
                          {msg.pensatore.nome}
                          {msg.interrotta && <span className="text-stone-600 ml-2 font-normal normal-case">[interrotto dal moderatore]</span>}
                        </span>
                        {audioPossibile && (
                          <button
                            onClick={() => inRiproduzione
                              ? fermaTuttoAudio()
                              : riproduciSingolo({ ...msg, id: msgId })}
                            title={inRiproduzione ? 'Ferma la lettura' : 'Ascolta questo intervento'}
                            className={[
                              'text-[10px] px-1.5 py-0.5 rounded border font-normal normal-case tracking-normal transition-colors flex-shrink-0',
                              inRiproduzione
                                ? 'border-amber-600 text-amber-300'
                                : 'border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300',
                            ].join(' ')}
                          >
                            {inRiproduzione ? '■ ferma' : '▸ ascolta'}
                          </button>
                        )}
                      </span>
                      <p className={`${prosaCls} font-serif text-stone-200 whitespace-pre-wrap`}>
                        {msg.testo}
                      </p>
                    </div>
                  )
                }
                if (msg.tipo === 'sistema') {
                  return (
                    <div key={i} className="text-xs text-stone-600 italic text-center">
                      {msg.testo}
                    </div>
                  )
                }
                return null
              })}

              {/* Intervento in corso */}
              {messaggioStreaming && (
                <div className={`flex flex-col gap-1 border-l-2 pl-3 ${bordoMap[messaggioStreaming.pensatore.id] || 'border-stone-700'}`}>
                  <span className={`${nomeCls} uppercase font-medium ${coloreMap[messaggioStreaming.pensatore.id] || 'text-amber-300'}`}>
                    {messaggioStreaming.pensatore.nome}
                    <span className="text-stone-600 ml-2 font-normal animate-pulse">&#x25CF;</span>
                  </span>
                  <p className={`${prosaCls} font-serif text-stone-200 whitespace-pre-wrap`}>
                    {messaggioStreaming.testo}
                    <span className="animate-pulse text-stone-600">|</span>
                  </p>
                </div>
              )}

              {caricandoSegnali && (
                <div className="text-xs text-stone-600 italic animate-pulse">
                  I partecipanti valutano se chiedere la parola...
                </div>
              )}
            </div>
          </div>

          {/* Countdown dialogo autonomo */}
          {countdownAuto !== null && (
            <div className={`${larghezzaFeed} mx-auto w-full px-4 pb-2 flex items-center gap-3 text-xs`}>
              <span className="text-stone-400">
                La discussione prosegue tra <span className="text-stone-200 font-medium">{countdownAuto}s</span>
              </span>
              <button
                onClick={toggleModalitaAutonoma}
                className="px-2 py-0.5 rounded border border-stone-600 text-stone-400 hover:border-stone-400 hover:text-stone-200 transition-colors"
              >
                Sospendi
              </button>
            </div>
          )}

          {/* Input moderatore */}
          <div className="border-t border-stone-800 px-4 pt-3 pb-2 flex-shrink-0">
            <div className={`${larghezzaFeed} mx-auto w-full flex gap-2 items-end`}>
              <VoiceInput
                onTrascrizione={onTrascrizione}
                lingua="it"
                disabled={bloccato}
              />
              <textarea
                value={inputTesto}
                onChange={e => setInputTesto(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  countdownAuto !== null
                    ? 'Premi "Sospendi" per intervenire...'
                    : 'Proponi una questione o rivolgiti ai partecipanti... (Invio per inviare)'
                }
                rows={2}
                disabled={bloccato}
                className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 resize-none focus:outline-none focus:border-amber-700 disabled:opacity-50"
              />
              <button
                onClick={() => inviaTema(inputTesto)}
                disabled={!inputTesto.trim() || bloccato}
                className="px-4 py-2.5 bg-amber-700 hover:bg-amber-600 text-stone-950 text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                Invia
              </button>
            </div>
            {/* Dichiarazione */}
            <p className="text-center text-[11px] text-stone-700 pt-2">
              Voci sintetiche modellate sui pensatori reali. Parole generate da AI nello stile del loro pensiero: non rappresentano le loro opinioni reali.
            </p>
          </div>
        </div>

        {/* Console laterale */}
        {!presentazione && (
          <aside className="w-72 flex-shrink-0 border-l border-stone-800 overflow-y-auto hidden md:flex flex-col gap-5 px-3 py-4" style={{ backgroundColor: 'rgba(20, 17, 15, 0.6)' }}>
            {/* Partecipanti */}
            <section className="flex flex-col gap-1.5">
              <h2 className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Partecipanti</h2>
              {commensali.map(p => {
                const stato = statiPensatori[p.id]
                const isParlando = stato === STATI_PENSATORE.PARLANDO
                const isSilenzioso = stato === STATI_PENSATORE.SILENZIOSO
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={[
                      'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all',
                      isParlando ? 'bg-amber-400 animate-pulse' : isSilenzioso ? 'bg-stone-800' : 'bg-stone-600',
                    ].join(' ')} />
                    <span className={[
                      'text-sm font-serif flex-1 min-w-0 truncate',
                      isParlando ? 'text-amber-200' : isSilenzioso ? 'text-stone-700 line-through' : 'text-stone-300',
                    ].join(' ')}>
                      {p.nome}
                    </span>
                    <button
                      onClick={() => isSilenzioso ? riattiva(p.id) : silenzia(p.id)}
                      disabled={isParlando}
                      title={isSilenzioso ? 'Riammetti alla discussione' : 'Sospendi dalla discussione'}
                      className="text-[11px] px-1.5 py-0.5 rounded border border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400 disabled:opacity-30 transition-colors flex-shrink-0"
                    >
                      {isSilenzioso ? 'riammetti' : 'sospendi'}
                    </button>
                  </div>
                )
              })}
            </section>

            {/* Richieste di intervento */}
            <section className="flex flex-col gap-1.5">
              <h2 className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Richieste di intervento</h2>
              {coda.length === 0 && astenuti.length === 0 ? (
                <p className="text-xs text-stone-700 italic">Nessuna richiesta in attesa.</p>
              ) : (
                <SignalQueue
                  coda={coda}
                  astenuti={astenuti}
                  onRiordina={riordinaCoda}
                  onRimuovi={rimuoviDaCoda}
                  isRunning={isRunning}
                />
              )}
            </section>

            {/* Moderazione */}
            <section className="flex flex-col gap-1.5">
              <h2 className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Moderazione</h2>
              <ModeratorControls
                commensali={commensali}
                statiPensatori={statiPensatori}
                isRunning={isRunning}
                pensatoreCorrente={pensatoreCorrente}
                onInterrompi={interrompi}
                onDaiParola={daiParola}
                onDomandaDiretta={domandaDiretta}
              />
            </section>
          </aside>
        )}
      </div>
    </div>
  )
}
