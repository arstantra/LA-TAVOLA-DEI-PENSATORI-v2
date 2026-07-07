import { useState, useEffect } from 'react'
import {
  getChiaveAnthropic,
  getChiaveElevenLabs,
  setChiaveAnthropic,
  setChiaveElevenLabs,
  rimuoviChiaveAnthropic,
  rimuoviChiaveElevenLabs,
  verificaChiaveAnthropic,
  verificaChiaveElevenLabs,
} from '../services/chiavi.js'

/**
 * PannelloChiavi.jsx — Configurazione e verifica delle chiavi API.
 *
 * Produzione (sito online): le chiavi vivono in localStorage del browser
 * e vengono inviate direttamente ad Anthropic / ElevenLabs.
 *
 * Sviluppo (npm run dev): le chiavi arrivano dal file .env locale tramite
 * il proxy Vite — qui si può solo verificarne il funzionamento.
 */

const IS_PROD = import.meta.env.PROD

// stato verifica: null = mai verificata, 'verificando', { ok, messaggio }
function SezioneChiave({ titolo, sottotitolo, valoreSalvato, onSalva, onRimuovi, onVerifica, placeholder }) {
  const [input, setInput] = useState('')
  const [visibile, setVisibile] = useState(false)
  const [esito, setEsito] = useState(null)
  const [salvata, setSalvata] = useState(!!valoreSalvato)

  const mascherata = valoreSalvato
    ? valoreSalvato.slice(0, 7) + '…' + valoreSalvato.slice(-4)
    : ''

  async function verifica() {
    setEsito('verificando')
    const r = await onVerifica()
    setEsito(r)
  }

  function salva() {
    if (!input.trim()) return
    onSalva(input.trim())
    setInput('')
    setSalvata(true)
    setEsito(null)
  }

  function rimuovi() {
    onRimuovi()
    setSalvata(false)
    setEsito(null)
  }

  const pallino =
    esito === 'verificando'
      ? 'bg-amber-400 animate-pulse'
      : esito?.ok
      ? 'bg-emerald-400'
      : esito
      ? 'bg-red-500'
      : IS_PROD
      ? salvata ? 'bg-stone-500' : 'bg-red-500'
      : 'bg-stone-500'

  return (
    <div className="border border-stone-800 rounded-sm p-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${pallino}`} />
          <h3 className="text-stone-200 text-sm font-medium">{titolo}</h3>
        </div>
        <button
          onClick={verifica}
          disabled={esito === 'verificando' || (IS_PROD && !salvata)}
          className="text-xs px-3 py-1.5 rounded border border-stone-700 text-stone-300 hover:border-stone-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {esito === 'verificando' ? 'Verifica in corso…' : 'Verifica'}
        </button>
      </div>
      <p className="text-xs text-stone-500 mb-3">{sottotitolo}</p>

      {IS_PROD ? (
        salvata ? (
          <div className="flex items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-sm px-3 py-2">
            <span className="text-xs text-stone-400 font-mono truncate">{mascherata}</span>
            <button
              onClick={rimuovi}
              className="text-xs text-stone-500 hover:text-red-400 transition-colors flex-shrink-0"
            >
              Rimuovi
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type={visibile ? 'text' : 'password'}
              className="flex-1 bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 text-stone-200 text-sm font-mono placeholder-stone-600 focus:outline-none focus:border-stone-400"
              placeholder={placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salva() }}
            />
            <button
              onClick={() => setVisibile(v => !v)}
              title={visibile ? 'Nascondi' : 'Mostra'}
              className="text-xs px-2 rounded border border-stone-700 text-stone-500 hover:text-stone-300 transition-colors"
            >
              {visibile ? '🙈' : '👁'}
            </button>
            <button
              onClick={salva}
              disabled={!input.trim()}
              className="text-xs px-3 py-2 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Salva
            </button>
          </div>
        )
      ) : (
        <p className="text-xs text-stone-600 bg-stone-900/50 border border-stone-800 rounded-sm px-3 py-2">
          In sviluppo la chiave arriva dal file <span className="font-mono text-stone-500">.env</span> tramite
          il proxy Vite. Usa &ldquo;Verifica&rdquo; per controllare che funzioni.
        </p>
      )}

      {esito && esito !== 'verificando' && (
        <p className={`text-xs mt-2 ${esito.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {esito.ok ? '✓ ' : '✗ '}{esito.messaggio}
        </p>
      )}
    </div>
  )
}

export default function PannelloChiavi({ onChiudi }) {
  // Chiudi con Esc
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onChiudi() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChiudi])

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onChiudi}>
      <div
        className="w-full max-w-lg bg-stone-950 border border-stone-700 rounded-sm max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h2 className="text-stone-100 text-lg font-serif">Chiavi API</h2>
          <button
            onClick={onChiudi}
            className="text-stone-500 hover:text-stone-200 transition-colors text-xl leading-none px-1"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-5">
          {IS_PROD && (
            <p className="text-xs text-stone-500 leading-relaxed">
              Le chiavi vengono salvate solo in questo browser (localStorage) e inviate
              direttamente ad Anthropic ed ElevenLabs. Non passano mai da altri server.
              <br />
              <span className="text-amber-600/80">
                Nota: la versione online non usa le chiavi del file .env locale — quelle
                valgono solo per <span className="font-mono">npm run dev</span>.
              </span>
            </p>
          )}

          <SezioneChiave
            titolo="Anthropic (pensatori)"
            sottotitolo="Obbligatoria: senza questa chiave nessun pensatore può rispondere."
            valoreSalvato={getChiaveAnthropic()}
            onSalva={setChiaveAnthropic}
            onRimuovi={rimuoviChiaveAnthropic}
            onVerifica={verificaChiaveAnthropic}
            placeholder="sk-ant-…"
          />

          <SezioneChiave
            titolo="ElevenLabs (voci)"
            sottotitolo="Facoltativa: serve solo per la sintesi vocale degli interventi."
            valoreSalvato={getChiaveElevenLabs()}
            onSalva={setChiaveElevenLabs}
            onRimuovi={rimuoviChiaveElevenLabs}
            onVerifica={verificaChiaveElevenLabs}
            placeholder="chiave ElevenLabs"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onChiudi}
            className="text-sm px-5 py-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
