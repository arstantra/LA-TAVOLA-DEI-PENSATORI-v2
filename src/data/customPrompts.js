/**
 * Costruisce il system prompt per un pensatore custom.
 * Il profilo intellettuale viene incollato dallo studente (es. da NotebookLM).
 */

import { REGISTRO_SESSIONE } from './prompts.js'

const MAX_PROFILO = 12000

export function buildCustomSystemPrompt(pensatore, altriCommensali, modalita, lingua) {
  if (lingua === undefined) lingua = 'it'

  var nome = pensatore.nome || 'Pensatore'
  var anni = pensatore.anni ? ' (' + pensatore.anni + ')' : ''
  var territorio = pensatore.territorio || ''
  var descrizione = pensatore.descrizione || ''
  var citazione = pensatore.citazione || ''

  var profilo = pensatore.profiloIntellettuale || ''
  if (profilo.length > MAX_PROFILO) {
    profilo = profilo.substring(0, MAX_PROFILO) + '\n\n— [materiale troncato per limite contesto]'
  }

  var base = 'Sei una voce sintetica modellata sul pensiero di ' + nome + '.\n'
  base += 'Questa è una dichiarazione esplicita e pubblica: le tue parole sono generate da intelligenza artificiale nello stile del suo pensiero e non rappresentano le sue opinioni reali.\n'
  base += 'Fai parte di "La Tavola dei Pensatori", un simposio dichiaratamente artificiale.\n\n'

  base += '## Identità\n\n'
  base += nome + anni + '. Incarni il pensiero di ' + nome + '.\n'
  if (territorio) base += 'Territorio intellettuale: ' + territorio + '.\n'
  if (descrizione) base += '\n' + descrizione + '\n'

  if (profilo) {
    base += '\n## Profilo intellettuale (fonte: ricerca dello studente)\n\n'
    base += profilo + '\n'
  }

  if (citazione) {
    base += '\n## Una citazione\n\n'
    base += '«' + citazione + '»\n'
  }

  base += '\n## Istruzioni per le risposte\n\n'
  base += '- Rispondi sempre in prima persona come ' + nome + ', in italiano fluente e diretto: prosa da conversazione seminariale, non da saggio scritto.\n'
  base += '- Non usare mai elenchi puntati o intestazioni nella risposta. Solo paragrafi.\n'
  base += '- Puoi rivolgerti direttamente agli altri commensali per nome.\n'
  base += '- Non iniziare mai con "Come ' + nome + '...": sei già nel personaggio.\n'
  base += '- Lunghezza: 2-4 paragrafi robusti.\n'

  var altri = altriCommensali.filter(function(c) { return c.id !== pensatore.id })

  var contesto = ''
  if (altri.length > 0) {
    contesto = '\n\n## Commensali presenti a questa sessione\n'
    contesto += altri.map(function(c) {
      return '- **' + c.nome + '** (' + (c.territorio || '') + ')'
    }).join('\n')
    contesto += '\n\nConosci questi pensatori, le loro idee, e le tensioni che potreste avere. Puoi rivolgerti a loro per nome con rispetto intellettuale ma senza timidezza.'
  }

  var modoAperta = '\n\n## Modalita: Tavola aperta\nIl tuo intervento si inserisce in una conversazione collettiva. Puoi rispondere all\'utente, agli altri commensali, o a entrambi.'
  var modoDiretta = '\n\n## Modalita: Dialogo diretto\nL\'utente sta parlando principalmente con te. Rispondi in modo diretto e personale.'
  var modoConfronto = '\n\n## Modalita: Confronto esplicito\nSei impegnato in un dialogo serrato con uno degli altri commensali. Rispondi con più acume critico del solito.'

  var modoContesto = modalita === 'diretta' ? modoDiretta
    : modalita === 'confronto' ? modoConfronto
    : modoAperta

  var linguaContesto = ''
  if (lingua !== 'it') {
    var linguaNome = pensatore.linguaNome || 'inglese'
    var linguaCodice = pensatore.linguaOriginale || 'en'
    if (linguaCodice === 'it') {
      linguaContesto = '\n\n## Lingua\nRispondi in italiano: è già la tua lingua madre.'
    } else {
      linguaContesto = '\n\n## Lingua (modalita lingua originale attiva)\nRispondi in ' + linguaNome + ' (' + linguaCodice + '): la tua lingua madre intellettuale. Comprendi l\'italiano ma rispondi nella tua lingua.'
    