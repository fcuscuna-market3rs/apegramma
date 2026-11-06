# Apegramma

Solver personale per l'Apegramma: inserisci le 7 lettere e ottieni le parole valide e gli apegrammi.
L'elenco non è quello ufficiale del Corriere della Sera: deriva dal lessico libero Morph-it! e migliora con le
correzioni salvate sul telefono.

## Sviluppo

```bash
npm test
npx --yes serve site -l 5173
```

## Aggiornare l'elenco delle parole

Scarica `morph-it.tgz` dalla [pagina di Morph-it!](https://docs.sslmit.unibo.it/doku.php?id=resources:morph-it),
estrai `morph-it_048.txt` in `data/raw/`, poi esegui:

```bash
node tools/build-words.mjs data/raw/morph-it_048.txt tools/corrections.json
```

Le parole confermate sul gioco stanno in `tools/corrections.json`: riporta lì anche quelle esportate dall'app
(`apegramma-correzioni.json`), altrimenti si perdono a ogni rigenerazione.

Le regole di filtro stanno in `tools/lexicon-filter.mjs`. Dopo ogni modifica ai file di `site/`, incrementa
`CACHE` in `site/sw.js`, altrimenti i telefoni continuano a usare la versione precedente.

## Licenze

`site/words.txt` deriva da Morph-it! e resta sotto CC BY-SA 2.0: vedi `site/LICENSE-words.txt`.
