import { useState } from 'react'

const LINGUE = [
  { codice: 'it', nome: 'Italiano' },
  { codice: 'en', nome: 'Inglese' },
  { codice: 'fr', nome: 'Francese' },
  { codice: 'de', nome: 'Tedesco' },
  { codice: 'es', nome: 'Spagnolo' },
  { codice: 'pt', nome: 'Portoghese' },
  { codice: 'ja', nome: 'Giapponese' },
  { codice: 'zh', nome: 'Cinese' },
  { codice: 'la', nome: 'Latino' },
  { codice: 'el', nome: 'Greco' },
]

const LINGUE_MAP = Object.fromEntries(LINGUE.map(l => [l.codice, l.nome]))

const VOCI_PRESET = [
  { id: 'cSrA50M4AMSOadSZxNB8', nome: 'IT — Maschile A (Faggin)', lingua: 'it' },
  { id: 'pNInz6obpgDQGcFmaJgB', nome: 'EN — Maschile A (Adam)', lingua: 'en' },
  { id: 'nPczCjzI2devNBz1zQrb', nome: 'EN — Maschile B (Brian)', lingua: 'en' },
  { id: 'VR6AewLTigWG4xSOukaG', nome: 'EN — Maschile C (Arnold)', lingua: 'en' },
  { id: 'onwK4e9ZLuTAKqWW03F9', nome: 'EN — Maschile D (Daniel)', lingua: 'en' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', nome: 'EN — Femminile A (Grace)', lingua: 'en' },
  { id: 'iP95p4xoKVk53GoZ742B', nome: 'EN — Maschile E (Chris)', lingua: 'en' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', nome: 'EN — Maschile F (Sam)', lingua: 'en' },
  { id: 'wViXBPUzp2ZZixB1xQuM', nome: 'EN — Maschile G (Michael)', lingua: 'en' },
  { id: 'g5CIjZEefAph4nQFvHAz', nome: 'FR — Maschile A (Ethan)', lingua: 'fr' },
]

// Limiti caratteri per campo
const LIMITI = {
  nome: 60,
  anni: 20,
  territorio: 80,
  nazionalita: 30,
  descrizione: 300,
  citazione: 300,
  profiloIntellettuale: 12000,
}

/** Contatore caratteri rimanenti sotto un campo. */
function Contatore({ valore, max }) {
  const rimanenti = max - (valore?.length || 0)
  const colore =
    rimanenti <= 0
      ? 'text-red-500/80'
      : rimanenti <= max * 0.1
      ? 'text-amber-600/80'
      : 'text-stone-700'
  return (
    <div className="flex justify-end mt-1">
      <span className={`${colore} text-xs font-sans tabular-nums`}>
        {rimanenti.toLocaleString('it-IT')} caratteri rimanenti
      </span>
    </div>
  )
}

function nuovoPensatore() {
  return {
    id: 'custom_' + Date.now(),
    custom: true,
    nome: '',
    anni: '',
    territorio: '',
    nazionalita: '',
    descrizione: '',
    citazione: '',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    linguaOriginale: 'it',
    linguaNome: 'Italiano',
    profiloIntellettuale: '',
  }
}

export default function FormPensatoreCustom({ pensatore, onSalva, onChiudi }) {
  const [form, setForm] = useState(() => pensatore ? { ...pensatore } : nuovoPensatore())
  const [hintsAperte, setHintsAperte] = useState(false)
  const [errore, setErrore] = useState('')

  function aggiorna(campo, valore) {
    // Tronca al limite del campo, se definito
    if (LIMITI[campo] && valore.length > LIMITI[campo]) {
      valore = valore.slice(0, LIMITI[campo])
    }
    setForm(prev => {
      const next = { ...prev, [campo]: valore }
      if (campo === 'linguaOriginale') {
        next.linguaNome = LINGUE_MAP[valore] || valore
      }
      return next
    })
  }

  function handleSalva() {
    if (!form.nome.trim()) {
      setErrore('Il nome del pensatore è obbligatorio.')
      return
    }
    setErrore('')
    onSalva({
      ...form,
      id: form.id || ('custom_' + Date.now()),
      custom: true,
      nome: form.nome.trim(),
    })
  }

  const input = 'w-full bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 text-stone-200 text-sm font-sans placeholder-stone-600 focus:outline-none focus:border-stone-400'
  const label = 'block text-stone-500 text-xs font-sans tracking-widest uppercase mb-1.5'

  const nomeSuggerito = form.nome.trim() || '[nome]'
  const promptsNLM = [
    'Scrivi una biografia intellettuale di ' + nomeSuggerito + ' in 600 parole',
    'Elenca i 5 concetti fondamentali del pensiero di ' + nomeSuggerito + ' con spiegazione',
    'Descrivi lo stile argomentativo di ' + nomeSuggerito + ': come ragiona, cosa lo irrita, come replica alle obiezioni',
    'Elenca le citazioni più rappresentative di ' + nomeSuggerito + ' con fonte',
    'Con quali altri pensatori è ' + nomeSuggerito + ' in tensione intellettuale e perché',
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-stone-950 border border-stone-700 rounded-sm max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h2
            className="text-stone-100 text-lg leading-snug"
            style={{ fontFamily: "'EB Garamond', serif" }}
          >
            {pensatore ? 'Modifica pensatore' : 'Crea pensatore'}
          </h2>
          <button
            onClick={onChiudi}
            className="text-stone-500 hover:text-stone-200 transition-colors text-xl leading-none px-1"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-5">

          {/* Nome + Anni */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Nome *</label>
              <input
                className={input}
                placeholder="es. Italo Calvino"
                maxLength={LIMITI.nome}
                value={form.nome}
                onChange={e => aggiorna('nome', e.target.value)}
              />
              <Contatore valore={form.nome} max={LIMITI.nome} />
            </div>
            <div>
              <label className={label}>Anni</label>
              <input
                className={input}
                placeholder="es. 1923-1985"
                maxLength={LIMITI.anni}
                value={form.anni}
                onChange={e => aggiorna('anni', e.target.value)}
              />
              <Contatore valore={form.anni} max={LIMITI.anni} />
            </div>
          </div>

          {/* Territorio + Nazionalità */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Territorio intellettuale</label>
              <input
                className={input}
                placeholder="es. Letteratura, narrazione, semiotica"
                maxLength={LIMITI.territorio}
                value={form.territorio}
                onChange={e => aggiorna('territorio', e.target.value)}
              />
              <Contatore valore={form.territorio} max={LIMITI.territorio} />
            </div>
            <div>
              <label className={label}>Nazionalit&agrave;</label>
              <input
                className={input}
                placeholder="es. IT"
                maxLength={LIMITI.nazionalita}
                value={form.nazionalita}
                onChange={e => aggiorna('nazionalita', e.target.value)}
              />
              <Contatore valore={form.nazionalita} max={LIMITI.nazionalita} />
            </div>
          </div>

          {/* Lingua + Voce */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Lingua originale</label>
              <select
                className={input + ' cursor-pointer'}
                value={form.linguaOriginale}
                onChange={e => aggiorna('linguaOriginale', e.target.value)}
              >
                {LINGUE.map(l => (
                  <option key={l.codice} value={l.codice}>{l.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Voce</label>
              <select
                className={input + ' cursor-pointer'}
                value={form.voiceId}
                onChange={e => aggiorna('voiceId', e.target.value)}
              >
                {VOCI_PRESET.map(v => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <label className={label}>Descrizione breve</label>
            <textarea
              className={input + ' resize-none'}
              rows={2}
              placeholder="1-2 frasi che descrivono il personaggio"
              maxLength={LIMITI.descrizione}
              value={form.descrizione}
              onChange={e => aggiorna('descrizione', e.target.value)}
            />
            <Contatore valore={form.descrizione} max={LIMITI.descrizione} />
          </div>

          {/* Citazione */}
          <div>
            <label className={label}>Citazione autentica</label>
            <input
              className={input}
              placeholder="Una frase significativa del personaggio"
              maxLength={LIMITI.citazione}
              value={form.citazione}
              onChange={e => aggiorna('citazione', e.target.value)}
            />
            <Contatore valore={form.citazione} max={LIMITI.citazione} />
          </div>

          {/* Profilo intellettuale */}
          <div>
            <label className={label}>
              Profilo intellettuale
              <span className="text-stone-600 normal-case tracking-normal ml-2 font-normal">
                — incolla qui l&apos;analisi da NotebookLM
              </span>
            </label>
            <textarea
              className={input + ' resize-y font-sans leading-relaxed'}
              rows={10}
              placeholder={'Incolla qui il profilo intellettuale generato da NotebookLM o scritto da te.\nMax 12.000 caratteri.'}
              maxLength={LIMITI.profiloIntellettuale}
              value={form.profiloIntellettuale}
              onChange={e => aggiorna('profiloIntellettuale', e.target.value)}
            />
            <div className="flex justify-between mt-1">
              <span className="text-stone-700 text-xs font-sans tabular-nums">
                {form.profiloIntellettuale.length.toLocaleString('it-IT')} / {LIMITI.profiloIntellettuale.toLocaleString('it-IT')}
              </span>
              <Contatore valore={form.profiloIntellettuale} max={LIMITI.profiloIntellettuale} />
            </div>
          </div>

          {/* NotebookLM hints */}
          <div className="border border-stone-800 rounded-sm overflow-hidden">
            <button
              onClick={() => setHintsAperte(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-stone-500 hover:text-stone-300 transition-colors text-left"
            >
              <span className="text-xs font-sans tracking-widest uppercase">
                Come usare NotebookLM
              </span>
              <span className="text-xs opacity-60">{hintsAperte ? '▲' : '▼'}</span>
            </button>
            {hintsAperte && (
              <div className="px-4 pb-5 border-t border-stone-800">
                <p className="text-stone-500 text-xs font-sans leading-relaxed mt-3 mb-3">
                  Vai su <span className="text-amber-200/50">notebooklm.google.com</span>, crea un nuovo notebook,
                  carica le fonti del personaggio (PDF, link YouTube, testi).
                  Poi usa questi prompt nella chat di NotebookLM:
                </p>
                <ol className="flex flex-col gap-2 list-decimal list-inside">
                  {promptsNLM.map((p, i) => (
                    <li key={i} className="text-stone-400 text-xs font-sans leading-snug">
                      &ldquo;{p}&rdquo;
                    </li>
                  ))}
                </ol>
                <p className="text-stone-600 text-xs font-sans mt-3 leading-relaxed">
                  Copia le risposte (anche parziali) nel campo &ldquo;Profilo intellettuale&rdquo; qui sopra.
                  Più materiale dai, meglio il personaggio risponde.
                </p>
              </div>
            )}
          </div>

          {/* Errore */}
          {errore && (
            <p className="text-red-500/80 text-xs font-sans">{errore}</p>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-stone-800">
          <button
            onClick={onChiudi}
            className="px-4 py-2 text-stone-500 text-sm font-sans tracking-widest uppercase hover:text-stone-200 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSalva}
            className="px-6 py-2 border border-stone-400 text-stone-200 text-sm font-sans tracking-widest uppercase hover:border-amber-200/60 hover:text-amber-200/80 transition-all duration-200"
          >
            Salva
          </button>
        </div>

      </div>
    </div>
  )
}
