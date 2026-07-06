/**
 * VoiceInput — pulsante microfono per input vocale.
 *
 * Registra l'audio, lo invia a Whisper STT e chiama onTrascrizione(testo).
 * Si integra nell'area input di SessionScreen.
 *
 * Stati visivi:
 *   idle      → icona microfono grigia
 *   recording → animazione pulse rossa + icona stop
 *   loading   → spinner mentre Whisper trascrive
 *   error     → tooltip con errore, auto-reset dopo 3s
 */

import { useState, useCallback } from 'react'
import { avviaRegistrazione, fermaRegistrazione, annullaRegistrazione } from '../services/stt.js'

// ─────────────────────────────────────────────────────────────────────────────

export default function VoiceInput({ onTrascrizione, lingua = 'it', disabled = false, variant = 'default' }) {
  const [stato, setStato] = useState('idle') // 'idle' | 'recording' | 'loading' | 'error'
  const [errore, setErrore] = useState(null)
  const inline = variant === 'inline'

  const avvia = useCallback(async () => {
    if (disabled || stato !== 'idle') return
    setErrore(null)
    try {
      await avviaRegistrazione()
      setStato('recording')
    } catch (err) {
      setErrore(err.message)
      setStato('error')
      setTimeout(() => setStato('idle'), 3000)
    }
  }, [disabled, stato])

  const ferma = useCallback(async () => {
    if (stato !== 'recording') return
    setStato('loading')
    try {
      const testo = await fermaRegistrazione(lingua)
      if (testo) onTrascrizione(testo)
      setStato('idle')
    } catch (err) {
      setErrore(err.message)
      setStato('error')
      setTimeout(() => setStato('idle'), 3000)
    }
  }, [stato, lingua, onTrascrizione])

  const annulla = useCallback(() => {
    annullaRegistrazione()
    setStato('idle')
    setErrore(null)
  }, [])

  // ── Rendering ──────────────────────────────────────────────────────────────

  if (stato === 'recording') {
    if (inline) {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={ferma}
            title="Ferma e trascrivi"
            className="relative flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
          >
            <span className="absolute w-5 h-5 rounded-full border border-red-500 animate-ping opacity-25" />
            <IconMicrofono />
          </button>
          <button
            onClick={annulla}
            title="Annulla"
            className="text-stone-700 text-xs font-sans hover:text-stone-500 transition-colors"
          >
            ✕
          </button>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={ferma}
          title="Ferma e trascrivi"
          className="w-10 h-10 flex items-center justify-center rounded-sm border border-red-800 bg-red-950/40 text-red-400 hover:border-red-600 hover:text-red-300 transition-all relative"
        >
          <span className="absolute inset-0 rounded-sm border border-red-500 animate-ping opacity-30" />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="3" width="10" height="10" rx="1" />
          </svg>
        </button>
        <button
          onClick={annulla}
          title="Annulla"
          className="text-stone-700 text-xs font-sans hover:text-stone-500 transition-colors"
        >
          ✕
        </button>
      </div>
    )
  }

  if (stato === 'loading') {
    return (
      <div className={inline ? 'flex items-center' : 'w-10 h-10 flex items-center justify-center'}>
        <span className="flex gap-0.5">
          <span className="w-1 h-3 bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-3 bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-3 bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    )
  }

  if (stato === 'error') {
    return (
      <div className="relative">
        <button
          disabled
          className={inline
            ? 'flex items-center justify-center text-red-800'
            : 'w-10 h-10 flex items-center justify-center rounded-sm border border-red-900/50 text-red-800'
          }
        >
          <IconMicrofono />
        </button>
        {errore && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-stone-900 border border-red-900/50 rounded-sm px-3 py-2 text-xs text-red-400 font-sans shadow-lg">
            {errore}
          </div>
        )}
      </div>
    )
  }

  // idle
  if (inline) {
    return (
      <button
        onClick={avvia}
        disabled={disabled}
        title="Parla (trascrizione automatica)"
        className={[
          'flex items-center justify-center transition-colors',
          disabled
            ? 'text-stone-800 cursor-not-allowed'
            : 'text-stone-500 hover:text-stone-300',
        ].join(' ')}
      >
        <IconMicrofono />
      </button>
    )
  }

  return (
    <button
      onClick={avvia}
      disabled={disabled}
      title="Parla (trascrizione automatica)"
      className={[
        'w-10 h-10 flex items-center justify-center rounded-sm border transition-all',
        disabled
          ? 'border-stone-800 text-stone-800 cursor-not-allowed'
          : 'border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300',
      ].join(' ')}
    >
      <IconMicrofono />
    </button>
  )
}

// ── Icone SVG ─────────────────────────────────────────────────────────────────

function IconMicrofono() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="1" width="6" height="8" rx="3" />
      <path d="M2 8a6 6 0 0 0 12 0" />
      <line x1="8" y1="14" x2="8" y2="16" />
      <line x1="5" y1="16" x2="11" y2="16" />
    </svg>
  )
}
