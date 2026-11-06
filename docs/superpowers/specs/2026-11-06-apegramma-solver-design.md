# Solver Apegramma: design

Data: 2026-11-06. Parte dalla bozza di specifica ricevuta dall'utente e la ridimensiona.

## Intento

Uno strumento personale da tenere aperto sul telefono **durante** una partita all'Apegramma del Corriere
della Sera: inserisci le 7 lettere, vedi subito tutte le parole valide con gli apegrammi in evidenza, e
barri quelle già inserite nel gioco.

La bozza chiedeva "più performante ed efficiente". La velocità non è il problema: filtrare un elenco di
parole è istantaneo anche su un telefono. Il valore sta in un elenco il più possibile vicino a quello del
gioco, e in un'app che si usa con il pollice in pochi secondi.

## Obiettivi

- Lettere inserite, elenco completo visibile in meno di un secondo, anche offline.
- Apegrammi separati in evidenza in cima.
- Barrare una parola con un tocco, senza perdere lo stato chiudendo l'app.
- L'elenco migliora con l'uso grazie alle correzioni dell'utente.

## Non obiettivi

- Corrispondenza perfetta con la lista ufficiale: è irraggiungibile (vedi "Fonte delle parole").
- Statistiche e filtri della bozza (sezioni 6.C e 6.D, a parte barrare le trovate). Eventuale aggiunta futura.
- Account, server, database, sincronizzazione tra dispositivi.
- Lunghezza minima configurabile: resta fissa a 4.
- Modalità a indizi / anti-spoiler: l'utente ha scelto di vedere tutto subito.

## Anti-obiettivi

- Niente estrazione automatica da `dizionari.corriere.it` o dai servizi del Corriere. La
  [Data Mining Policy](https://www.corriere.it/data_mining_policy.shtml) la vieta senza consenso scritto di
  RCS, anche per uso personale, e il robots.txt blocca i bot AI.
- Niente uso dell'archivio di La Regione come fonte: i diritti sono riservati e la sua lista segue regole
  diverse (contiene verbi coniugati, forme con pronomi e forme troncate come *imporr*).
- Niente estrazione dei dati dall'app Sabatini Coletti o da copie del CD-ROM, e niente copie non autorizzate.

## Vincoli

- Uso personale, un solo utente.
- Telefono Android come dispositivo principale. La verifica di installazione, pressione prolungata e
  funzionamento offline si fa lì.
- Pubblicazione su GitHub Pages: pagina pubblica, quindi deve contenere solo materiale redistribuibile.
- Il lessico è sotto licenza CC BY-SA 2.0 / LGPL: l'app deve riportare l'attribuzione, e il file derivato
  resta sotto la stessa licenza.

## Regole del gioco

Dalla bozza, sezione 3:

1. Almeno 4 lettere.
2. Le lettere si possono ripetere senza limiti.
3. Ogni parola contiene la lettera centrale.
4. Nessun nome proprio.
5. Verbi solo all'infinito o al participio passato.
6. Solo lettere della griglia.
7. Un apegramma usa ogni lettera della griglia almeno una volta (non deve essere lungo 7 lettere).

Ogni griglia ha 7 lettere distinte, di cui una centrale.

L'utente ha confermato queste regole riportandone il testo completo.

**Forme flesse: scelta mia, da verificare giocando.** Le regole non parlano di plurali e femminili, quindi
come impostazione di partenza:

- **Tenute:** plurali e femminili di nomi e aggettivi, avverbi, interiezioni, numeri, infiniti, le quattro
  forme del participio passato. Vale anche per i verbi che Morph-it! etichetta a parte (*essere*, *avere*,
  *dovere*, *potere*, *volere*, *stare*, *fare*).
- **Tolte:** verbi coniugati, gerundi e participi presenti usati come verbi, infiniti con pronome
  (*lavarsi*, *amarlo*), infiniti troncati (*abbacchiar*), superlativi e diminutivi generati in automatico
  (*bellissimo*, *fastidiosetto*), parole grammaticali (articoli, preposizioni, pronomi, congiunzioni),
  abbreviazioni, nomi propri (etichetta `NPR`).

Se una forma è anche nome o aggettivo si tiene (*ricetta* resta come nome, anche se è coniugazione di
*ricettare*). Vale solo se Morph-it! registra quella lettura: *amo* c'è solo come verbo, quindi viene tolto e
l'eventuale nome va aggiunto con le correzioni.
Queste scelte stanno in un solo punto dello script di preparazione, così si cambiano senza toccare l'app. Lo
script conserva il lemma di ogni forma, che serve per il link al dizionario: *certi* non ha una pagina
propria, *certo* sì.

## Fonte delle parole

- **Riferimento del gioco, secondo la bozza:** Sabatini Coletti. Non è disponibile alcun elenco di lemmi
  scaricabile, licenza pubblica o API. Esistono solo il sito del Corriere, l'app Edigeo a 19,99 € e il volume
  Hoepli, tutti da consultare a mano.
- **Fonte dell'app:** Morph-it!, lessico morfologico dell'Università di Bologna (Zanchetta e Baroni), con
  forma, lemma e tratti grammaticali.
- **File:** `morph-it.tgz` dalla [pagina ufficiale](https://docs.sslmit.unibo.it/doku.php?id=resources:morph-it),
  raggiungibile dopo il controllo anti-bot superato dall'utente. Formato: forma, lemma, tratti, una riga per
  forma (versione 0.4.7 sulla pagina: 504.906 voci, 34.968 lemmi).
- **Limite noto:** Morph-it! è ricavato da un corpus di giornali e la sua stessa pagina avverte di lacune nel
  lessico quotidiano di base. Sarà anche datato: l'ultima versione individuata è del 2009. Mancheranno
  quindi parole, e ne avrà altre che il gioco rifiuta. La distanza dal gioco si misura solo su partite reali.

## Come funziona

Scelte architetturali mie, approvate dall'utente nella descrizione in chat.

**Preparazione (una tantum, sul computer).** Uno script legge il lessico, tiene solo le forme ammesse dalle
regole, le normalizza, toglie i duplicati e produce un file leggero per la pagina. Aggiornare il lessico
significa rilanciare lo script, senza toccare il codice dell'app.

**App (pagina statica installabile).** Una pagina che funziona offline dopo la prima apertura, senza server.
Il file delle parole viene caricato una volta e tenuto in memoria. Il filtro confronta l'insieme di lettere
di ogni parola con quello della griglia. Non conta le occorrenze, perché le ripetizioni sono ammesse.

**Accenti.** Le griglie contengono lettere senza accento. La parola accentata si confronta nella forma senza
accento (*carità* → `carita`) e si mostra nella forma originale. Due forme con la stessa normalizzazione
contano come una parola sola.

## La schermata

È la bozza A, scelta dall'utente.

- In alto una riga di sette caselle con la centrale evidenziata. Ogni lettera si digita in un tocco.
- Una riga con il numero di parole, di apegrammi e di barrate.
- Riquadro in evidenza con gli apegrammi.
- Sotto, tutte le parole raggruppate per lunghezza e in ordine alfabetico.
- Un tocco barra o ripristina una parola.
- Tenendo premuta una parola si apre un menu con due voci: controllarla sul dizionario del Corriere, tramite
  un semplice link alla pagina (`dizionari.corriere.it/dizionario_italiano/<LETTERA>/<parola>.shtml`) aperto
  dall'utente, e segnarla come "rifiutata dal gioco".
- Un'azione "aggiungi parola che manca" per le parole accettate dal gioco e assenti dall'elenco.

## Stato salvato sul telefono

- **Correzioni** (parole rifiutate e aggiunte): valgono per tutte le partite. Restano nella memoria del
  browser, che può essere svuotata, quindi l'app offre esportazione e importazione in un file. Lo script di
  preparazione può leggere quel file e incorporare le correzioni nell'elenco (scelta mia).
- **Barrate:** legate alla griglia corrente, si azzerano quando cambiano le lettere.
- **Griglia corrente:** ripristinata alla riapertura.

## Criteri di verifica

Dalla sezione 11 della bozza:

| Caso | Atteso |
|---|---|
| Parola di 3 lettere | Esclusa |
| Parola di 4 lettere valida | Ammessa |
| Parola senza lettera centrale | Esclusa |
| Parola con lettera fuori griglia | Esclusa |
| Parola con lettere ripetute | Ammessa |
| Nome proprio | Escluso |
| Verbo all'infinito | Ammesso |
| Verbo al participio passato | Ammesso |
| Verbo coniugato | Escluso |
| Parola con tutte le lettere | Apegramma |

In più: nessun duplicato, accenti gestiti, una parola rifiutata non ricompare, una parola aggiunta compare
in ogni griglia compatibile, e l'app si apre e filtra in modalità aereo dopo la prima visita.

## Lasciato a chi costruisce

Struttura dei file, formato del file delle parole, linguaggio dello script di preparazione, strumenti di
test, resa grafica (partendo dalla bozza A).
