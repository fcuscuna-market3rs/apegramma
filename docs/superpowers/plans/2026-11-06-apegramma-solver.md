# Solver Apegramma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pagina installabile su Android che, date 7 lettere, mostra offline tutte le parole valide e gli apegrammi, con parole barrabili e correzioni personali.

**Architecture:** Uno script Node filtra una volta sola il lessico Morph-it! e produce `site/words.txt`. La pagina statica in `site/` carica il file, calcola una maschera di bit per parola e filtra in memoria. Lo stato resta in `localStorage`, un service worker rende tutto disponibile offline.

**Tech Stack:** JavaScript vanilla (moduli ES), Node 24 con `node --test`, nessuna dipendenza, GitHub Pages con GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-06-apegramma-solver-design.md`

## Global Constraints

- Lunghezza minima fissa: 4 lettere. Griglia: 7 lettere distinte `a-z`, di cui una centrale.
- Le ripetizioni sono ammesse: nessun conteggio di occorrenze.
- Apegramma: usa ogni lettera della griglia almeno una volta.
- Nessuna richiesta automatica a `dizionari.corriere.it`: solo un link aperto dall'utente.
- Nessuna dipendenza runtime, nessun server, percorsi relativi (la pagina vive sotto `/<repo>/`).
- Testi dell'interfaccia in italiano.
- Attribuzione Morph-it! visibile nella pagina. `site/words.txt` resta sotto CC BY-SA 2.0.
- Il file sorgente è `morph-it_048.txt`, codifica Latin-1, tre colonne separate da tab: forma, lemma, tratti. Si passa allo script come argomento e non entra nel repository.

## Review Focus

- Tastiera Android in composizione, maiuscole o lettere accentate digitate in una casella: la casella mostra la lettera minuscola normalizzata e si passa alla successiva. Test nel Task 4.
- `localStorage` corrotto, pieno o non disponibile: l'app parte vuota e non si blocca. Test nel Task 3.
- Griglia temporaneamente incompleta mentre si corregge un refuso: le barrate non si perdono, si azzerano solo con una griglia completa diversa. Test nel Task 3.
- Scorrere la lista o tenere premuto non barra la parola, e la pressione prolungata apre solo il menu. Verifica nel Task 5.
- Importazione di un file non valido: messaggio di errore e correzioni esistenti intatte. Test nel Task 3.

---

### Task 1: Motore di ricerca

**Files:**
- Create: `site/solver.js`, `test/solver.test.mjs`, `package.json`, `.gitignore`

**Interfaces:**
- Produces, da `site/solver.js`:
  - `normalize(s: string): string`: minuscolo senza diacritici
  - `maskOf(norm: string): number`: maschera a 26 bit
  - `parseWords(text: string): Word[]`, dove `Word = {display, norm, mask, lemma}`. Ogni riga è `display` oppure `display\tlemma`, e `lemma` vale `display` se assente
  - `gridError(letters: string[], center: string): null | 'incompleta' | 'doppie' | 'centrale'`
  - `solve(words: Word[], letters: string[], center: string): {total, apegrammi: Word[], byLength: [number, Word[]][]}`: `byLength` in ordine crescente, parole alfabetiche con `localeCompare('it')`, apegrammi anche dentro `byLength`
  - `dictionaryUrl(word: Word): string`

- [ ] **Step 1: Inizializzare il progetto**

Eseguire `git init -b main`. In `.gitignore` mettere `.superpowers/` e `data/raw/`. In `package.json` mettere `"type": "module"` e `"scripts": {"test": "node --test test/"}`.

- [ ] **Step 2: Scrivere i test che falliscono**

Griglia `['a','c','e','i','n','r','t']`, centrale `i`, elenco di prova che include un caso per ciascuna riga. Asserzioni:

```js
assert.equal(normalize('Carità'), 'carita');
assert.equal(gridError(['a','c','e'], 'a'), 'incompleta');
assert.equal(gridError(['a','a','e','i','n','r','t'], 'a'), 'doppie');
assert.equal(gridError(['a','c','e','i','n','r','t'], 'z'), 'centrale');
const words = parseWords('tir\ncena\ncitra\ntiara\ntiare\ntinta\ncantiere\nzitta\ncarità\ncerti\tcerto');
const r = solve(words, letters, 'i');
const all = r.byLength.flatMap(([, w]) => w.map(x => x.norm));
assert.ok(!all.includes('tir'));        // 3 lettere
assert.ok(!all.includes('cena'));       // senza centrale
assert.ok(!all.includes('zitta'));      // lettera esterna
assert.ok(all.includes('tinta'));       // ripetizioni ammesse
assert.deepEqual(r.apegrammi.map(w => w.norm), ['cantiere']);
assert.equal(words.find(w => w.norm === 'carita').display, 'carità');
assert.equal(dictionaryUrl(words.find(w => w.norm === 'certi')),
  'https://dizionari.corriere.it/dizionario_italiano/C/certo.shtml');
assert.equal(r.total, all.length);
```

- [ ] **Step 3: Eseguire i test e verificare il fallimento**

Run: `npm test`
Expected: FAIL, modulo `site/solver.js` assente.

- [ ] **Step 4: Implementare `site/solver.js`**

Una parola passa se `mask & ~gridMask === 0`, `mask & centerBit !== 0` e `norm.length >= 4`. È apegramma se `mask === gridMask`. In `dictionaryUrl` la lettera è l'iniziale maiuscola del lemma normalizzato e il nome pagina è il lemma normalizzato.

- [ ] **Step 5: Eseguire i test e verificare il successo**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .gitignore package.json site/solver.js test/solver.test.mjs docs/superpowers
git commit -m "feat: add word solver"
```

### Task 2: Preparazione del lessico

**Files:**
- Create: `tools/lexicon-filter.mjs`, `tools/build-words.mjs`, `test/lexicon-filter.test.mjs`, `site/words.txt`

**Interfaces:**
- Consumes: `normalize`, `maskOf` da `site/solver.js`
- Produces:
  - `isAllowed(form: string, lemma: string, tag: string): boolean`
  - `buildLines(rows: [form, lemma, tag][], corrections?: {rejected: string[], added: string[]}): string[]`
  - CLI: `node tools/build-words.mjs <morph-it.txt> [corrections.json]` scrive `site/words.txt`

- [ ] **Step 1: Scrivere i test che falliscono**

```js
const yes = [
  ['tiara','tiara','NOUN-F:s'], ['case','casa','NOUN-F:p'], ['irta','irto','ADJ:pos+f+s'],
  ['amare','amare','VER:inf+pres'], ['amata','amare','VER:part+past+s+f'],
  ['essere','essere','AUX:inf+pres'], ['potere','potere','MOD:inf+pres'],
  ['fatto','fare','CAU:part+past+s+m'], ['cinque','cinque','DET-NUM-CARD'],
  ['lentamente','lentamente','ADV'], ['carità','carità','NOUN-F:s'],
];
const no = [
  ['amo','amare','VER:ind+pres+1+s'], ['amando','amare','VER:ger+pres'],
  ['amante','amare','VER:part+pres+s+m'], ['amarlo','amare','VER:inf+pres+lo'],
  ['abbacchiar','abbacchiare','VER:inf+pres'], ['bellissimo','bello','ADJ:sup+m+s'],
  ['fastidiosetto','fastidioso','ADJ:dim+m+s'], ['dalla','dalla','ARTPRE-F:s'],
  ['Roma','Roma','NPR'], ['tre','tre','DET-NUM-CARD'], ["citta'",'citta','NOUN-F:s'],
];
// ogni voce di yes: isAllowed true; ogni voce di no: false

const lines = buildLines([
  ['citta','citta','NOUN-F:s'], ['città','città','NOUN-F:s'],
  ['amati','amare','VER:part+past+p+m'], ['amati','amato','NOUN-M:p'],
  ['zzzz','zzzz','NOUN-M:s'], ['abcdefghi','abcdefghi','NOUN-M:s'],
], { rejected: ['zzzz'], added: ['nuova'] });
assert.ok(lines.includes('città'));
assert.ok(!lines.includes('citta'));
assert.ok(lines.includes('amati\tamato'));   // lemma nominale preferito a quello verbale
assert.ok(!lines.includes('zzzz'));
assert.ok(!lines.includes('abcdefghi'));     // più di 7 lettere diverse: mai possibile
assert.ok(lines.includes('nuova'));
```

- [ ] **Step 2: Eseguire i test e verificare il fallimento**

Run: `npm test`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Implementare `tools/lexicon-filter.mjs`**

```js
const KEEP = /^(NOUN-[MF]:[sp]|ADJ:(pos|comp)\+[mf]\+[sp]|ADV|INT|DET-NUM-CARD|(VER|AUX|MOD|ASP|CAU):part\+past\+[sp]\+[mf])$/;
const INFINITIVE = /^(VER|AUX|MOD|ASP|CAU):inf\+pres$/;
```

`isAllowed` richiede lunghezza normalizzata di almeno 4, forma solo lettere minuscole (accentate comprese) e una delle due regex. Per gli infiniti richiede anche `form === lemma`. `buildLines` raggruppa per forma normalizzata, sceglie la forma con accento come `display`, preferisce un lemma nominale o aggettivale a uno verbale, scarta le parole con più di 7 lettere diverse, applica le correzioni e ordina. Il lemma si omette dalla riga se uguale a `display`.

- [ ] **Step 4: Eseguire i test e verificare il successo**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implementare `tools/build-words.mjs` e generare il file**

Legge il sorgente con `latin1`, scarta le righe senza tre colonne, scrive `site/words.txt` in UTF-8 e stampa il numero di righe e i byte. Prima copia `morph-it_048.txt` dall'archivio già scaricato in `data/raw/` (cartella esclusa da git): `C:\Users\fcusc\AppData\Local\Temp\claude\0b2c09c01bc1e2ab\fe00a1fe-0670-4e8b-bb01-de9571fbe01d\scratchpad\morphit\x\current_version\morph-it_048.txt`.

Run: `node tools/build-words.mjs data/raw/morph-it_048.txt`
Expected: tra 30.000 e 70.000 righe, meno di 1 MB. Con `grep -xE 'amare|tiara|essere|fare' site/words.txt` compaiono tutte, con `grep -cxE 'amo|Roma|dalla'` il risultato è 0. *Amo* resta assente perché Morph-it! lo ha solo come verbo.

- [ ] **Step 6: Commit**

```bash
git add tools test/lexicon-filter.test.mjs site/words.txt
git commit -m "feat: build word list from Morph-it"
```

### Task 3: Stato salvato

**Files:**
- Create: `site/storage.js`, `test/storage.test.mjs`

**Interfaces:**
- Consumes: `normalize` da `site/solver.js`
- Produces: `createStore(backend)`, dove `backend` ha `getItem`/`setItem`, con metodi:
  - `getGrid(): string[]`, `setGrid(letters: string[]): void`: sette posizioni, `''` se vuote, centrale in indice 3
  - `isStruck(norm): boolean`, `toggleStruck(norm): void`
  - `getCorrections(): {rejected: string[], added: string[]}`
  - `reject(norm)`, `add(word: string): 'ok' | 'corta' | 'invalida'`, `removeCorrection(norm)`
  - `exportCorrections(): string`, `importCorrections(json: string): boolean`

  Inoltre, da `site/solver.js`, aggiungere `applyCorrections(words: Word[], corrections): Word[]`.

- [ ] **Step 1: Scrivere i test che falliscono**

Con un backend finto in memoria:
- `getItem` che lancia eccezione, oppure JSON non valido: griglia vuota e correzioni vuote, nessuna eccezione. `setItem` che lancia: nessuna eccezione.
- Griglia A completa, barrare `tiara`, svuotare una casella con `setGrid`, rimettere la stessa griglia: `isStruck('tiara')` è `true`.
- Griglia completa diversa: `isStruck('tiara')` è `false`.
- `reject('tiara')` poi `add('Tiara')`: la parola è solo in `added` come `tiara`, e viceversa.
- `add('tre')` restituisce `'corta'`, `add('ab1c')` restituisce `'invalida'`, `add('Carità')` conserva `carità`.
- `importCorrections('{"x":1}')` e `importCorrections('non json')` restituiscono `false` e lasciano le correzioni invariate. Un export reimportato restituisce `true` e unisce le voci senza doppioni.
- `applyCorrections`: toglie le rifiutate, aggiunge le aggiunte senza doppioni con `mask` corretta.

- [ ] **Step 2: Eseguire i test e verificare il fallimento**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implementare `site/storage.js` e `applyCorrections`**

Chiavi `apegramma.state.v1` e `apegramma.corrections.v1`. Le barrate si azzerano solo quando `setGrid` riceve sette lettere con chiave diversa da quella dell'ultima griglia completa salvata.

- [ ] **Step 4: Eseguire i test e verificare il successo**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/storage.js site/solver.js test
git commit -m "feat: persist grid, struck words and corrections"
```

### Task 4: Schermata principale

**Files:**
- Create: `site/index.html`, `site/style.css`, `site/app.js`, `site/input.js`, `test/input.test.mjs`

**Interfaces:**
- Consumes: `parseWords`, `applyCorrections`, `solve`, `gridError`, `normalize`, `createStore`
- Produces:
  - `cleanLetter(raw: string): string`, da `site/input.js`: ultima lettera digitata, normalizzata, oppure `''`
  - in `index.html`: `#grid`, `#status`, `#apegrammi`, `#words`, `#corrections`, `#word-menu`. `site/app.js` espone `render()` internamente, e il Task 5 lo estende nello stesso file

- [ ] **Step 1: Scrivere il test che fallisce**

```js
assert.equal(cleanLetter('A'), 'a');
assert.equal(cleanLetter('à'), 'a');
assert.equal(cleanLetter('ab'), 'b');   // composizione Android che accoda
assert.equal(cleanLetter('1'), '');
assert.equal(cleanLetter(''), '');
```

- [ ] **Step 2: Eseguire il test e verificare il fallimento**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implementare la schermata della bozza A**

Sette `<input>` di un carattere, centrale in quarta posizione con classe `.center`, attributi `autocapitalize="none" autocomplete="off" inputmode="text"`. Gestire solo l'evento `input`, mai `keydown`, perché la tastiera Android in composizione non fornisce il tasto. Dopo ogni lettera il fuoco passa alla casella vuota successiva; Backspace su casella vuota torna indietro tramite `beforeinput`. Riga `#status`: `N parole · M apegrammi · K barrate`, oppure un invito se `gridError` non è `null` (`Inserisci le 7 lettere`, `Ci sono lettere doppie`). Riquadro apegrammi nascosto se vuoto. Gruppi `4 lettere`, `5 lettere`, e così via. Parole come `<button class="word">`, un tocco chiama `toggleStruck`. Piè di pagina con attribuzione a Morph-it! (Marco Baroni, Eros Zanchetta), link alla licenza CC BY-SA 2.0 e nota che l'elenco non è quello ufficiale del Corriere. Larghezza piena da 320 px in su, nessuno scorrimento orizzontale. Se `words.txt` non si carica, mostrare un errore in `#status`.

- [ ] **Step 4: Eseguire il test e verificare il successo**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verificare nel browser**

Servire `site/` con `npx --yes serve site -l 5173` tramite `.claude/launch.json` e aprirlo a larghezza mobile. Con griglia `a c e i n r t`, centrale `i`: compaiono *cantiere* tra gli apegrammi e parole raggruppate per lunghezza in meno di un secondo. Un tocco barra, un secondo toglie la barra. Ricaricando, griglia e barrate restano.

- [ ] **Step 6: Commit**

```bash
git add site test/input.test.mjs .claude/launch.json
git commit -m "feat: add main solver screen"
```

### Task 5: Menu parola e correzioni

**Files:**
- Modify: `site/app.js`, `site/index.html`, `site/style.css`

**Interfaces:**
- Consumes: `dictionaryUrl`, i metodi di correzione di `createStore`, `#word-menu`, `#corrections`

- [ ] **Step 1: Implementare la pressione prolungata**

Pointer events con soglia di 500 ms, annullata se il dito si sposta oltre 10 px o su `pointercancel`. Dopo una pressione prolungata il `click` seguente viene ignorato, quindi non barra. `contextmenu` con `preventDefault` su `.word`; CSS `user-select: none; -webkit-touch-callout: none; touch-action: manipulation`. Il menu è un `<dialog>` con la parola e tre azioni: `Controlla sul dizionario` (link `target="_blank" rel="noopener"`), `Rifiutata dal gioco`, `Chiudi`. Anche il clic destro su computer apre il menu.

- [ ] **Step 2: Implementare il pannello correzioni**

`<details id="corrections">` in fondo alla pagina. Campo `Aggiungi parola che manca` con messaggio per `corta` e `invalida`, elenco di rifiutate e aggiunte con un pulsante per annullare ciascuna voce, `Esporta correzioni` (scarica `apegramma-correzioni.json` da un Blob) e `Importa correzioni` (`<input type="file">`, messaggio `File non valido` se `importCorrections` restituisce `false`). Ogni modifica richiama `render()`.

- [ ] **Step 3: Verificare nel browser**

A larghezza mobile:
- la pressione prolungata apre il menu senza barrare;
- scorrere la lista partendo da una parola non barra e non apre il menu;
- `Rifiutata dal gioco` toglie la parola anche ricaricando;
- annullando la voce la parola ricompare;
- una parola aggiunta compatibile compare nella griglia;
- un file JSON non valido mostra l'errore e non cambia nulla;
- un export reimportato non crea doppioni.

Il link del menu punta a `https://dizionari.corriere.it/dizionario_italiano/<LETTERA>/<lemma>.shtml`. Non aprirlo in modo automatico.

- [ ] **Step 4: Eseguire tutti i test**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site
git commit -m "feat: add word menu and corrections panel"
```

### Task 6: Installazione e offline

**Files:**
- Create: `site/manifest.webmanifest`, `site/sw.js`, `site/icon.svg`
- Modify: `site/index.html`, `site/app.js`

**Interfaces:**
- Consumes: i file di `site/`

- [ ] **Step 1: Aggiungere il manifest e l'icona**

`name` e `short_name`: `Apegramma`, `display: standalone`, `start_url: "."`, `scope: "."`, icona SVG con `sizes: "any"`. Collegarli da `index.html` insieme a `theme-color`.

- [ ] **Step 2: Implementare `site/sw.js`**

Costante `CACHE = 'apegramma-v1'`, da incrementare a ogni rilascio. In `install` mette in cache con percorsi relativi `./`, `index.html`, `style.css`, `app.js`, `solver.js`, `storage.js`, `input.js`, `words.txt`, `manifest.webmanifest`, `icon.svg`. In `activate` elimina le cache precedenti. In `fetch`, per le richieste GET della stessa origine, risponde dalla cache e altrimenti dalla rete; le altre richieste non passano dal worker. `app.js` registra `sw.js` con percorso relativo.

- [ ] **Step 3: Verificare offline**

Nel browser, dopo una visita, disattivare la rete e ricaricare: la pagina si apre e la ricerca funziona.

Se la disattivazione non è disponibile, fermare il server e ricaricare.

- [ ] **Step 4: Commit**

```bash
git add site
git commit -m "feat: make the app installable and offline"
```

### Task 7: Pubblicazione

**Files:**
- Create: `.github/workflows/pages.yml`, `README.md`, `site/LICENSE-words.txt`

**Interfaces:**
- Consumes: la cartella `site/`

- [ ] **Step 1: Aggiungere workflow e licenze**

Il workflow, su push a `main`, esegue `npm test` e pubblica `site/` con `actions/upload-pages-artifact` e `actions/deploy-pages`. `README.md` spiega come rigenerare `words.txt` dal file Morph-it! e dalle correzioni esportate. `site/LICENSE-words.txt` riporta attribuzione e licenza del lessico.

- [ ] **Step 2: Confermare nome del repository con l'utente**

Prima di creare qualcosa di pubblico, chiedere nome e conferma: `gh repo create <nome> --public --source . --push`.

- [ ] **Step 3: Verificare il sito pubblicato**

Abilitare Pages con sorgente GitHub Actions e attendere la fine del workflow. Aprire l'indirizzo pubblicato: griglia di prova funzionante e `words.txt` servito con risposta 200.

- [ ] **Step 4: Prova sul telefono**

L'utente apre l'indirizzo su Android, installa l'app, gioca una partita in modalità aereo dopo la prima apertura, e controlla pressione prolungata e barrate. Confronta inoltre qualche plurale, femminile e infinito con il gioco e segna gli scarti nelle correzioni.
