import { useState, useCallback, useEffect } from 'react'
import ConfigScreen from './components/ConfigScreen.jsx'
import SessionScreen from './components/SessionScreen.jsx'
import { STATI_PENSATORE } from './services/orchestratore.js'
import { salvaSessione, nuovaSessione } from './services/sessions.js'

/**
 * App.jsx — stato globale e routing tra schermate.
 *
 * Stato:
 *   schermata:      'config' | 'sessione'
 *   commensali:     pensatori selezionati (array)
 *   statiPensatori: { [id]: STATI_PENSATORE.* }
 *   storia:         messaggi della conversazione
 *   coda:           segnali ordinati in attesa di esecuzione
 *   isRunning:      c'e' un pensatore che sta parlando?
 *   sessioneMeta:   { id, nome, data } della sessione corrente (per il salvataggio)
 *
 * Persistenza: ogni cambiamento della storia salva la sessione in localStorage
 * (sessions.js). Nei messaggi salvati il pensatore viene ridotto ai soli campi
 * necessari alla visualizzazione, per non gonfiare lo storage con i profili custom.
 */
export default function App() {
  const [schermata, setSchermata] = useState('config')
  const [commensali, setCommensali] = useState([])
  const [statiPensatori, setStatiPensatori] = useState({})
  const [storia, setStoria] = useState([])
  const [coda, setCoda] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [sessioneMeta, setSessioneMeta] = useState(null)

  const iniziaSessione = useCallback((selezionati) => {
    const stati = {}
    selezionati.forEach(p => { stati[p.id] = STATI_PENSATORE.ATTIVO })
    const s = nuovaSessione(selezionati)
    setSessioneMeta({ id: s.id, nome: s.nome, data: s.data })
    setCommensali(selezionati)
    setStatiPensatori(stati)
    setStoria([])
    setCoda([])
    setIsRunning(false)
    setSchermata('sessione')
  }, [])

  const riprendiSessione = useCallback((sessi