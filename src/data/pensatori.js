// Voice IDs ElevenLabs (predefined voices — sostituire con voice cloning nella Fase 5)
// Modello TTS usato: eleven_multilingual_v2 (supporta IT, EN, FR, ES, PT, JA, DE, ecc.)
//
// Per aggiornare un voiceId: sostituire il valore con l'ID del clone ottenuto da ElevenLabs.
// Il badge "voce reale" compare automaticamente per qualsiasi ID non presente in VOCI_PRESET.
// Lista voci disponibili: https://api.elevenlabs.io/v1/voices

// ID delle voci predefinite ElevenLabs (non clonate)
export const VOCI_PRESET = new Set([
  'pNInz6obpgDQGcFmaJgB', // Adam
  'nPczCjzI2devNBz1zQrb', // Brian
  'VR6AewLTigWG4xSOukaG', // Arnold
  'onwK4e9ZLuTAKqWW03F9', // Daniel
  'g5CIjZEefAph4nQFvHAz', // Ethan
  'oWAxZDx7w5VEj9dCyTzz', // Grace
  'iP95p4xoKVk53GoZ742B', // Chris
  'yoZ06aMxZJJ28mfd3POQ', // Sam
  'wViXBPUzp2ZZixB1xQuM', // Michael
])

export const PENSATORI = [
  {
    id: 'faggin',
    nome: 'Federico Faggin',
    territorio: 'Coscienza, tecnologia, identità',
    anni: '1941 —',
    nazionalita: 'IT',
    descrizione: 'Inventore del microprocessore, teorico della coscienza come fenomeno irriducibile. La mente non è computazione.',
    citazione: '«La coscienza non può essere generata da un sistema puramente fisico.»',
    voiceId: 'cSrA50M4AMSOadSZxNB8',
    linguaOriginale: 'it',
    linguaNome: 'Italiano',
  },
  {
    id: 'illich',
    nome: 'Ivan Illich',
    territorio: 'Critica istituzioni, autonomia, convivialità',
    anni: '1926 — 2002',
    nazionalita: 'AT/MX',
    descrizione: 'Critico radicale delle istituzioni moderne. La scuola, la medicina, i trasporti — ogni sistema oltre una soglia diventa controproducente.',
    citazione: '«Le istituzioni producono il contrario di ciò che promettono.»',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    linguaOriginale: 'en',
    linguaNome: 'Inglese',
  },
  {
    id: 'fukuoka',
    nome: 'Masanobu Fukuoka',
    territorio: 'Natura, non-fare, agricoltura come filosofia',
    anni: '1913 — 2008',
    nazionalita: 'JP',
    descrizione: 'Agricoltore e filosofo del non-fare. La natura è più intelligente di qualsiasi intervento umano. Il mu è la risposta.',
    citazione: '«Non fare nulla è la mia agricoltura.»',
    voiceId: 'nPczCjzI2devNBz1zQrb',
    linguaOriginale: 'ja',
    linguaNome: 'Giapponese',
  },
  {
    id: 'sen',
    nome: 'Amartya Sen',
    territorio: 'Libertà, giustizia, capacità umane',
    anni: '1933 —',
    nazionalita: 'IN',
    descrizione: "Premio Nobel per l'economia. La libertà come capacità reale di essere e fare. Il benessere non si misura con il PIL.",
    citazione: '«Lo sviluppo è libertà.»',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    linguaOriginale: 'en',
    linguaNome: 'Inglese',
  },
  {
    id: 'alexander',
    nome: 'Christopher Alexander',
    territorio: 'Bellezza, luoghi, pattern del vivere',
    anni: '1936 — 2022',
    nazionalita: 'AT/US',
    descrizione: 'Architetto e teorico dei pattern. I luoghi vivi nascono da forze profonde, non da progetti razionali. La qualità senza nome.',
    citazione: '«Ogni luogo vivo ha quella qualità che non si può dire.»',
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    linguaOriginale: 'en',
    linguaNome: 'Inglese',
  },
  {
    id: 'morin',
    nome: 'Edgar Morin',
    territorio: 'Complessità, educazione, pensiero connettivo',
    anni: '1921 —',
    nazionalita: 'FR',
    descrizione: 'Filosofo della complessità. Il pensiero che separa distrugge ciò che vuole comprendere. Occorre un metodo che connetta.',
    citazione: '«Il problema fondamentale è quello del pensiero che separa.»',
    voiceId: 'g5CIjZEefAph4nQFvHAz',
    linguaOriginale: 'fr',
    linguaNome: 'Francese',
  },
  {
    id: 'shiva',
    nome: 'Vandana Shiva',
    territorio: 'Biodiversità, semi, critica agricoltura industriale',
    anni: '1952 —',
    nazionalita: 'IN',
    descrizione: "Fisica e attivista. I semi sono libertà. L'agricoltura industriale è una forma di violenza contro la Terra e i popoli.",
    citazione: '«I semi sono il primo anello della catena alimentare.»',
    voiceId: 'oWAxZDx7w5VEj9dCyTzz',
    linguaOriginale: 'en',
    linguaNome: 'Inglese',
  },
  {
    id: 'berry',
    nome: 'Wendell Berry',
    territorio: 'Terra, comunità, modernità',
    anni: '1934 —',
    nazionalita: 'US',
    descrizione: 'Scrittore e agricoltore del Kentucky. La crisi ecologica è una crisi di carattere. Tornare alla terra, alla comunità, al locale.',
    citazione: '«Mangiare è un atto agricolo.»',
    voiceId: 'iP95p4xoKVk53GoZ742B',
    linguaOriginale: 'en',
    linguaNome: 'Inglese',
  },
  {
    id: 'freire',
    nome: 'Paulo Freire',
    territorio: 'Educazione degli oppressi, coscientizzazione',
    anni: '1921 — 1997',
    nazionalita: 'BR',
    descrizione: "Pedagogo della liberazione. L'educazione bancaria deposita nozioni negli oppressi. La coscientizzazione è il contrario.",
    citazione: '«Nessuno libera nessuno, nessuno si libera da solo. Gli uomini si liberano insieme.»',
    voiceId: 'yoZ06aMxZJJ28mfd3POQ',
    linguaOriginale: 'pt',
    linguaNome: 'Portoghese',
  },
  {
    id: 'schumacher',
    nome: 'Ernst F. Schumacher',
    territorio: 'Economia umana, locale, Small is Beautiful',
    anni: '1911 — 1977',
    nazionalita: 'DE/UK',
    descrizione: "Economista eretico. La grande scala è il problema, non la soluzione. L'economia deve servire l'uomo, non il contrario.",
    citazione: '«Small is beautiful.»',
    voiceId: 'wViXBPUzp2ZZixB1xQuM',
    linguaOriginale: 'en',
    linguaNome: 'Inglese',
  },
]

export const MAX_COMMENSALI = 5
export const MIN_COMMENSALI = 2
