/**
 * TavolaVisual — tavola rotonda SVG con commensali + utente.
 *
 * Props:
 *   commensali   — array di oggetti pensatore
 *   maxPosti     — numero massimo di posti per i pensatori (default 5)
 *   parlante     — id del pensatore attualmente in streaming (null se nessuno)
 *   modalita     — 'aperta' | 'diretta' | 'confronto'
 *   activeIds    — array di id attivi (per dimming in modalità diretta/confronto)
 *   userName     — nome dell'utente (sempre presente alla tavola)
 *   showCounter  — mostrare il contatore "X / Y commensali" (default true)
 */

const RAGGIO_TAVOLA = 80
const RAGGIO_SEDIE = 150
const CX = 200
const CY = 200

// Colori per ogni pensatore predefinito
const COLORI_SEDIE = {
  faggin:     '#5DCAA5',
  illich:     '#AFA9EC',
  fukuoka:    '#EF9F27',
  sen:        '#F0997B',
  alexander:  '#85B7EB',
  morin:      '#9898C4',
  shiva:      '#6FAF7F',
  berry:      '#C4A472',
  freire:     '#C4986A',
  schumacher: '#72A0B0',
}
const COLORE_UTENTE  = '#FAC775'
const COLORE_DEFAULT = '#d6c49a'

function getColoreSedia(p) {
  if (!p) return COLORE_DEFAULT
  if (p.isUser) return COLORE_UTENTE
  return COLORI_SEDIE[p.id] || COLORE_DEFAULT
}

function getSediaPosition(index, total) {
  const angolo = (2 * Math.PI * index) / total - Math.PI / 2
  return {
    x: CX + RAGGIO_SEDIE * Math.cos(angolo),
    y: CY + RAGGIO_SEDIE * Math.sin(angolo),
  }
}

function abbreviaNome(nome) {
  const parti = nome.split(' ')
  if (parti.length === 1) return parti[0]
  return `${parti[0][0]}. ${parti[parti.length - 1]}`
}

export default function TavolaVisual({
  commensali,
  maxPosti = 5,
  parlante = null,
  modalita = 'aperta',
  activeIds = null,
  userName = null,
  showCounter = true,
}) {
  // Totale posti = pensatori + 1 utente
  const totalPosti = maxPosti + 1

  // Array di posti: pensatori nelle prime posizioni, utente all'ultima
  const postiPensatori = Array.from({ length: maxPosti }, (_, i) => commensali[i] || null)
  const postoUtente = { isUser: true, nome: userName || 'Tu', id: '__user__' }
  const posti = [...postiPensatori, postoUtente]

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 400 400"
        className="w-full"
        aria-label="Tavola dei pensatori"
      >

        {/* Ombra tavola */}
        <ellipse
          cx={CX + 4}
          cy={CY + 8}
          rx={RAGGIO_TAVOLA + 4}
          ry={RAGGIO_TAVOLA + 4}
          fill="rgba(0,0,0,0.4)"
        />

        {/* Tavola */}
        <circle
          cx={CX}
          cy={CY}
          r={RAGGIO_TAVOLA}
          fill="#1a1410"
          stroke="#57534e"
          strokeWidth="1.5"
        />

        {/* Trama legno */}
        {[...Array(5)].map((_, i) => (
          <line
            key={i}
            x1={CX - RAGGIO_TAVOLA + 8}
            y1={CY - 28 + i * 14}
            x2={CX + RAGGIO_TAVOLA - 8}
            y2={CY - 28 + i * 14}
            stroke="#2a2118"
            strokeWidth="0.8"
          />
        ))}

        {/* Label centrale */}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize="8" fill="#57534e"
          fontFamily="'EB Garamond', serif" letterSpacing="2">
          LA TAVOLA
        </text>
        <text x={CX} y={CY + 8} textAnchor="middle" fontSize="8" fill="#57534e"
          fontFamily="'EB Garamond', serif" letterSpacing="2">
          DEI PENSATORI
        </text>

        {/* Modalità label */}
        {modalita !== 'aperta' && (
          <text x={CX} y={CY + 22} textAnchor="middle" fontSize="6.5" fill="#78716c"
            fontFamily="'Inter', sans-serif" letterSpacing="1">
            {modalita === 'diretta' ? 'DIALOGO' : 'CONFRONTO'}
          </text>
        )}

        {/* Linee connessione */}
        {posti.map((p, i) => {
          const pos = getSediaPosition(i, totalPosti)
          const angolo = (2 * Math.PI * i) / totalPosti - Math.PI / 2
          const bx = CX + RAGGIO_TAVOLA * Math.cos(angolo)
          const by = CY + RAGGIO_TAVOLA * Math.sin(angolo)
          const occupata = !!p && (p.isUser || commensali.some(c => c.id === p.id))
          return (
            <line
              key={`linea-${i}`}
              x1={bx} y1={by}
              x2={pos.x} y2={pos.y}
              stroke={occupata ? '#57534e' : '#2a2118'}
              strokeWidth="0.8"
              strokeDasharray={occupata ? 'none' : '3,3'}
            />
          )
        })}

        {/* Sedie */}
        {posti.map((p, i) => {
          const pos = getSediaPosition(i, totalPosti)
          const isUtente = p?.isUser
          const isPensatoreOccupato = !isUtente && p && commensali.some(c => c.id === p.id)
          const occupata = isUtente || isPensatoreOccupato
          const colore = getColoreSedia(p)

          // Opacità in base a modalità
          let opacity = 1
          if (!isUtente && occupata && activeIds && modalita !== 'aperta') {
            opacity = activeIds.includes(p.id) ? 1 : 0.18
          }

          const isParlante = !isUtente && p && parlante === p.id

          return (
            <g key={`sedia-${i}`} style={{ opacity }}>

              {/* Alone pulsante per chi sta parlando */}
              {isParlante && (
                <circle
                  cx={pos.x} cy={pos.y} r={33}
                  fill="none"
                  stroke={colore}
                  strokeWidth="2"
                  className="seat-active"
                />
              )}

              {/* Cerchio sedia */}
              <circle
                cx={pos.x} cy={pos.y} r={28}
                fill={occupata ? (isUtente ? `${colore}12` : '#1a1410') : 'transparent'}
                stroke={occupata ? colore : '#3a3530'}
                strokeWidth={occupata ? (isParlante ? 2 : 1.5) : 1}
                strokeDasharray={occupata ? 'none' : '4,3'}
              />

              {occupata ? (
                <>
                  {isUtente ? (
                    /* Utente — iniziale */
                    <text
                      x={pos.x} y={pos.y + 4}
                      textAnchor="middle"
                      fontSize="13"
                      fill={COLORE_UTENTE}
                      fontFamily="'EB Garamond', serif"
                      fontWeight="500"
                    >
                      {(userName || 'T')[0].toUpperCase()}
                    </text>
                  ) : (
                    <>
                      {/* Nome abbreviato */}
                      <text
                        x={pos.x} y={pos.y - 2}
                        textAnchor="middle"
                        fontSize="7.5"
                        fill={colore}
                        fontFamily="'EB Garamond', serif"
                        fontWeight="500"
                      >
                        {abbreviaNome(p.nome)}
                      </text>
                      {/* Nazionalità */}
                      <text
                        x={pos.x} y={pos.y + 10}
                        textAnchor="middle"
                        fontSize="5.5"
                        fill="#57534e"
                        fontFamily="'Inter', sans-serif"
                        letterSpacing="0.5"
                      >
                        {p.nazionalita}
                      </text>
                    </>
                  )}
                </>
              ) : (
                <text
                  x={pos.x} y={pos.y + 5}
                  textAnchor="middle"
                  fontSize="16"
                  fill="#3a3530"
                >
                  +
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {showCounter && (
        <p className="text-stone-600 text-xs font-sans tracking-widest uppercase">
          {commensali.length} / {maxPosti} commensali
        </p>
      )}
    </div>
  )
}
