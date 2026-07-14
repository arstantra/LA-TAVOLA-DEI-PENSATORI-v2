import { useState } from 'react'
import { PENSATORI, TAG_LIST } from '../data/pensatori.js'
import FormPensatoreCustom from './FormPensatoreCustom.jsx'
import PannelloChiavi from './PannelloChiavi.jsx'
import { chiaveAnthropicPresente } from '../services/chiavi.js'
import {
  caricaSessioni,
  eliminaSessione,
  esportaSessioneTesto,
  formattaData,
  caricaPensatoriCustom,
  salvaPensatoreCustom,
  eliminaPensatoreCustom,
} from '../services/sessions.js'

/**
 * ConfigScreen.jsx — Selezione partecipanti e archivio sessioni.
 *
 * - 10 pensatori predefiniti + custom persistiti in localStorage
 * - Selezione: min 2, max 5
 * - Archivio: riprendi, esporta come testo, elimina
 */

export default function ConfigScreen({ onInizia, onRiprendi }) {
  const [selezionati, setSelezionati] = useState([])
  const [mostraFormCustom, setMostraFormCustom] = useState(false)
  const [pensatoreInModifica, setPensatoreInModifica] = useState(null)
  const [mostraChiavi, setMostraChiavi] = useState(false)
  const [chiaveOk, setChiaveOk] = useState(() => chiaveAnthropicPresente())
  const [customPensatori, setCustomPensatori] = useState(() => caricaPensatoriCustom())
  const [sessioni, setSessioni] = useState(() => caricaSessioni())
  const [tagAttivo, setTagAttivo] = useState(null)

  const tuttePensatori = [...PENSATORI, ...customPensatori]
  const pensatoriVisibili = tagAttivo
    ? tuttePensatori.filter(p => (p.tags || []).includes(tagAttivo))
    : tuttePensatori
  const IS_PROD = import.meta.env.PROD

  function toggleSelezione(pensatore) {
    setSelezionati(prev => {
      const gia = prev.find(p => p.id === pensatore.id)
      if (gia) return prev.filter(p => p.id !== pensatore.id)
      if (prev.length >= 5) return prev
      return [...prev, pensatore]
    })
  }

  function salvaCustom(pensatore) {
    const inModifica = !!pensatoreInModifica
    salvaPensatoreCustom(pensatore)
    setCustomPensatori(caricaPensatoriCustom())
    setMostraFormCustom(false)
    setPensatoreInModifica(null)
    setSelezionati(prev => {
      const idx = prev.findIndex(p => p.id === pensatore.id)
      if (idx >= 0) {
        // Già selezionato: aggiorna in place
        const next = [...prev]
        next[idx] = pensatore
        return next
      }
      if (inModifica || prev.length >= 5) return prev
      return [...prev, pensatore]
    })
  }

  function modificaCustom(e, pensatore) {
    e.stopPropagation()
    setPensatoreInModifica(pensatore)
    setMostraFormCustom(true)
  }

  function rimuoviCustom(e, pensatoreId) {
    e.stopPropagation()
    eliminaPensatoreCustom(pensatoreId)
    setCustomPensatori(caricaPensatoriCustom())
    setSelezionati(prev => prev.filter(p => p.id !== pensatoreId))
  }

  function handleElimina(id) {
    eliminaSessione(id)
    setSessioni(caricaSessioni())
  }

  function handleEsporta(sessione) {
    const testo = esportaSessioneTesto(sessione)
    const blob = new Blob([testo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (sessione.nome || 'sessione') + '.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const pronti = selezionati.length >= 2

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800 px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif tracking-wide text-amber-100">
            La Tavola dei Pensatori
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Scegli da 2 a 5 partecipanti per la sessione
          </p>
        </div>
        <button
          onClick={() => setMostraChiavi(true)}
          title="Configura e verifica le chiavi API"
          className="flex items-center gap-2 text-xs px-3 py-2 rounded border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-colors flex-shrink-0"
        >
          <span
            className={[
              'w-2 h-2 rounded-full',
              !IS_PROD ? 'bg-sky-400' : chiaveOk ? 'bg-emerald-400' : 'bg-red-500',
            ].join(' ')}
          />
          Chiavi API
        </button>
      </header>

      {/* Avviso chiave mancante (solo produzione) */}
      {IS_PROD && !chiaveOk && (
        <div className="bg-red-950/40 border-b border-red-900/50 px-6 py-3 text-sm text-red-300 flex items-center justify-between gap-4 flex-wrap">
          <span>
            Nessuna chiave API Anthropic configurata: i pensatori non potranno rispondere.
          </span>
          <button
            onClick={() => setMostraChiavi(true)}
            className="text-xs px-3 py-1.5 rounded border border-red-700 text-red-200 hover:bg-red-900/40 transition-colors"
          >
            Configura ora
          </button>
        </div>
      )}

      {/* Griglia pensatori */}
      <main className="flex-1 px-6 py-6">
        {/* Filtri tematici */}
        <div className="max-w-7xl mx-auto mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-600 uppercase tracking-wider mr-1">Tavoli tematici</span>
          <button
            onClick={() => setTagAttivo(null)}
            className={[
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              tagAttivo === null
                ? 'border-amber-500 bg-amber-950/50 text-amber-200'
                : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200',
            ].join(' ')}
          >
            Tutti
          </button>
          {TAG_LIST.map(t => (
            <button
              key={t.id}
              onClick={() => setTagAttivo(prev => (prev === t.id ? null : t.id))}
              className={[
                'text-xs px-3 py-1.5 rounded-full border transition-colors',
                tagAttivo === t.id
                  ? 'border-amber-500 bg-amber-950/50 text-amber-200'
                  : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200',
              ].join(' ')}
            >
              {t.nome}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
          {pensatoriVisibili.map(p => {
            const isSelezionato = selezionati.find(s => s.id === p.id)
            const isDisabilitato = !isSelezionato && selezionati.length >= 5
            return (
              <button
                key={p.id}
                onClick={() => toggleSelezione(p)}
                disabled={isDisabilitato}
                className={[
                  'relative text-left rounded-lg border p-4 transition-all duration-150 focus:outline-none',
                  isSelezionato
                    ? 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500'
                    : isDisabilitato
                    ? 'border-stone-800 bg-stone-900/30 opacity-40 cursor-not-allowed'
                    : 'border-stone-700 bg-stone-900/50 hover:border-stone-500 hover:bg-stone-800/50 cursor-pointer',
                ].join(' ')}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-stone-500 font-mono">
                    {p.custom ? 'personalizzato' : `${p.nazionalita} · ${p.anni}`}
                  </span>
                  <span className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    {isSelezionato && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center mt-0.5">
                        <span className="text-stone-950 text-xs font-bold leading-none">
                          {selezionati.indexOf(selezionati.find(s => s.id === p.id)) + 1}
                        </span>
                      </span>
                    )}
                    {p.custom && (
                      <>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => modificaCustom(e, p)}
                          onKeyDown={(e) => { if (e.key === 'Enter') modificaCustom(e, p) }}
                          title="Modifica questo pensatore personalizzato"
                          className="text-stone-600 hover:text-amber-400 text-sm leading-none mt-0.5 cursor-pointer"
                        >
                          ✎
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => rimuoviCustom(e, p.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') rimuoviCustom(e, p.id) }}
                          title="Elimina questo pensatore personalizzato"
                          className="text-stone-600 hover:text-red-400 text-sm leading-none mt-0.5 cursor-pointer"
                        >
                          &times;
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <h3 className="font-serif text-base text-stone-100 leading-snug mb-1">
                  {p.nome}
                </h3>
                <p className="text-xs text-amber-600/80 mb-2 italic">
                  {p.territorio}
                </p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  {p.descrizione}
                </p>
                {p.citazione && (
                  <p className="text-xs text-stone-500 mt-2 italic leading-relaxed">
                    {p.citazione}
                  </p>
                )}
                {(p.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tags.map(tid => {
                      const t = TAG_LIST.find(x => x.id === tid)
                      return (
                        <span
                          key={tid}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-stone-800 text-stone-500"
                        >
                          {t ? t.nome : tid}
                        </span>
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}

          {/* Card aggiungi pensatore custom */}
          <button
            onClick={() => setMostraFormCustom(true)}
            className="text-left rounded-lg border border-dashed border-stone-700 p-4 hover:border-stone-500 hover:bg-stone-900/30 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px] text-stone-500 hover:text-stone-300"
          >
            <span className="text-3xl mb-2">+</span>
            <span className="text-sm">Pensatore personalizzato</span>
          </button>
        </div>

        {/* Archivio sessioni */}
        {sessioni.length > 0 && (
          <div className="max-w-7xl mx-auto mt-10">
            <h2 className="text-sm text-stone-500 uppercase tracking-wider mb-3">
              Archivio sessioni
            </h2>
            <div className="flex flex-col gap-2">
              {sessioni.map(s => {
                const nomi = (s.commensali || [])
                  .map(c => c.nome.split(' ').slice(-1)[0])
                  .join(', ')
                const nInterventi = (s.messaggi || []).filter(m => m.tipo === 'pensatore').length
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 bg-stone-900/50 border border-stone-800 rounded-lg px-4 py-2.5 flex-wrap"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-200 truncate">{s.nome}</p>
                      <p className="text-xs text-stone-500">
                        {formattaData(s.data)} &middot; {nomi} &middot; {nInterventi} intervent{nInterventi === 1 ? 'o' : 'i'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onRiprendi?.(s)}
                        className="text-xs px-3 py-1.5 rounded border border-amber-800 text-amber-300 hover:bg-amber-950/40 hover:border-amber-600 transition-colors"
                      >
                        Riprendi
                      </button>
                      <button
                        onClick={() => handleEsporta(s)}
                        title="Scarica la trascrizione come testo"
                        className="text-xs px-3 py-1.5 rounded border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-colors"
                      >
                        Esporta
                      </button>
                      <button
                        onClick={() => handleElimina(s.id)}
                        title="Elimina la sessione dall'archivio"
                        className="text-xs px-2 py-1.5 rounded border border-stone-800 text-stone-600 hover:border-red-800 hover:text-red-400 transition-colors"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Form pensatore custom (creazione o modifica) */}
        {mostraFormCustom && (
          <FormPensatoreCustom
            key={pensatoreInModifica?.id || 'nuovo'}
            pensatore={pensatoreInModifica}
            onSalva={salvaCustom}
            onChiudi={() => { setMostraFormCustom(false); setPensatoreInModifica(null) }}
          />
        )}

        {/* Pannello chiavi API */}
        {mostraChiavi && (
          <PannelloChiavi
            onChiudi={() => {
              setMostraChiavi(false)
              setChiaveOk(chiaveAnthropicPresente())
            }}
          />
        )}
      </main>

      {/* Footer con selezione e pulsante */}
      <footer className="sticky bottom-0 border-t border-stone-800 bg-stone-950/95 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {selezionati.length === 0 ? (
              <span className="text-stone-500 text-sm">Nessun partecipante selezionato</span>
            ) : (
              selezionati.map(p => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 bg-amber-950/50 border border-amber-700/50 text-amber-200 text-xs rounded-full px-3 py-1"
                >
                  {p.nome}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelezione(p) }}
                    className="text-amber-400 hover:text-red-400 leading-none"
                  >
                    &times;
                  </button>
                </span>
              ))
            )}
          </div>
          <button
            onClick={() => pronti && onInizia(selezionati)}
            disabled={!pronti}
            className={[
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 flex-shrink-0',
              pronti
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer'
                : 'bg-stone-800 text-stone-600 cursor-not-allowed',
            ].join(' ')}
          >
            {selezionati.length < 2
              ? `Seleziona ancora ${2 - selezionati.length}`
              : `Inizia con ${selezionati.length} pensator${selezionati.length === 1 ? 'e' : 'i'}`}
          </button>
        </div>
      </footer>

      {/* Dichiarazione etica */}
      <div className="text-center text-xs text-stone-600 px-6 pb-3">
        Le voci sono sintetiche, modellate sui pensatori reali. Le parole sono generate da AI nello stile del loro pensiero. Non rappresentano le loro opinioni reali.
      </div>
    </div>
  )
}
