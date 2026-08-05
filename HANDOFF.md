# Handoff - Vesmírne hádanky

Stav k 4. 8. 2026. Hra je hotová a funkčná, nasadená nikde nie je.

## Čo to je

Detská webová hra (4-6 rokov, tablet/mobil, bez textu) podľa slovenskej samolepkovej knižky
"Báječné samolepkové hádanky" (Jiri Models), ktorej fotky sú v `images/`. Knižka slúžila
len ako predloha typov úloh - **všetka grafika je vlastná**, kreslená v SVG priamo v kóde.

- Čistý JavaScript v prehliadači (ES moduly), žiadny framework, žiadny build.
- Node.js je len na testy, na serveri ho netreba.
- PWA: inštaluje sa na plochu, funguje offline.

## Ako to spustiť

```bash
npm start          # http://localhost:8777
npm test           # logické testy + preklikanie všetkých hier cez jsdom
```

Na tablete: otvor IP notebooku v tej istej wifi (`http://192.168.x.x:8777`).
Nasadenie na server a PWA detaily sú v `README.md`.

## Architektúra

```
index.html         jedna stránka, 2 obrazovky (menu / hra) + overlay výhry
js/main.js         menu, prepínanie hier, úrovne, hviezdy, výherná obrazovka
js/art.js          VŠETKA grafika - 10 postavičiek ako SVG funkcie + paleta + filtre
js/starfield.js    animované pozadie (hmlovina, 3 vrstvy hviezd, padajúce hviezdy)
js/audio.js        zvuky generované cez WebAudio, žiadne mp3
js/util.js         shuffle/rand, localStorage s hviezdami
js/i18n.js         slovník sk/cs/en + detekcia jazyka podľa nastavenia zariadenia
js/games/*.js      7 minihier, každá samostatný modul
css/style.css      celý vzhľad; css/fonts.css + fonts/ = Baloo 2 (OFL), lokálne
sw.js              offline cache; manifest.json + icons/ = inštalácia na plochu
tests/             logické testy generátorov + smoke test celej hry
```

### Kontrakt minihry

Nový súbor v `js/games/` exportuje default objekt:

```js
{ id, name, color, levels, icon(), start(stage, api) }
```

`api = { level, setProgress(total, done), win(stars) }`, `start` vracia `{ destroy() }`.
Potom ho stačí pridať do `GAMES` v `js/main.js` - menu, lišta, úrovne a odmeny idú samé.

### Grafika - ako funguje

- `SHAPES.raketa(color)` vráti markup do viewBoxu `0 0 100 100`. Farba sa premieta do
  gradientu (`fill()`) aj do obrysovej farby (`ink()`), takže každý tvar drží svoj odtieň.
- `shapeSvg(key, color)` = samostatné `<svg>` s postavičkou; `shapeGroup(...)` = to isté
  na vloženie do cudzieho `<svg>` (vtedy musí rodič obsahovať `ALL_DEFS`).
- Samolepkový vzhľad (krémový obrys + tieň) robí SVG filter `#sticker`, nie ručné obrysy.
- **Pozor:** každé `<svg>` dostáva vlastné id-čka (`uniquify()`). Bez toho Chrome
  nevykreslí gradienty v 3D-otočenej karte v Nájdi dvojice - figúrky vyjdú čierne.
  Ak pridávaš hru, ktorá skladá vlastné `<svg>` z `ALL_DEFS` + tvarov, prežeň celý reťazec
  cez `svgDoc()`.

## Jazyky

Slovenčina, čeština, angličtina. Jazyk sa berie z nastavenia zariadenia
(`navigator.language`, resp. `navigator.languages`) - žiadny server, žiadne geo IP,
funguje aj offline. Neznámy jazyk padne na slovenčinu.

Prekladá sa len to málo textu, čo v hre je: logo, `title`, aria-labely tlačidiel a názvy
7 hier. V HTML sú označené `data-i18n` (obsah) a `data-i18n-aria` (aria-label), `applyStaticText()`
ich prejde pri štarte. Logo si obrys kreslí cez `::before { content: attr(data-text) }`,
takže preklad musí prepísať aj `data-text` - inak ostane pod novým textom starý obrys.

**Dve vedomé medzery:**
- **Prepínač jazyka nie je.** Ak má tablet nastavený iný jazyk, dieťa to nezmení.
  Ak to bude vadiť, treba vlajočky v menu + uloženie voľby do localStorage.
- **"Prvé písmeno" ostáva slovenské** - pýta sa na prvé písmeno slovenských slov.
  V češtine to vychádza rovnako (hviezda/hvězda → H), v angličtine **nie** (star → S),
  takže anglickému dieťaťu tá hra nedáva zmysel. Potrebuje vlastný zoznam slov
  a vlastnú abecedu (EN má navyše Q/W/X/Y) v `js/games/letters.js`.

`manifest.json` je tiež stále slovenský - názov appky na ploche sa neprekladá.

## Minihry a úrovne

| Hra | Súbor | Úrovne |
|-----|-------|--------|
| Nájdi dvojice | pairs.js | 3 → 4 → 6 → 8 dvojíc |
| Bludisko | maze.js | 4×4 → 7×7, vždy 3 hviezdy na ceste |
| Nájdi rozdiely | differences.js | 3 → 5 rozdielov |
| Koľko ich je? | counting.js | max 3 → 8, 5 kôl |
| Čo nasleduje? | sequence.js | AB → AAB → ABC → ABBC, 4 kolá |
| Prvé písmeno | letters.js | 2 → 4 možnosti, 5 kôl |
| Poskladaj tvar | tangram.js | raketa (3 dieliky) → hviezda (6) |

Hviezdy 1-3 podľa počtu chýb, najlepší výsledok na hru sa drží v `localStorage`.
Úroveň sa posúva tlačidlom "ďalej" po výhre a ukladá sa - pri ďalšom spustení hra
pokračuje tam, kde dieťa skončilo. Na karte v menu sú bodky s úrovňami: plné = už hrané,
krúžok = aktuálna, ťuk na bodku spustí presne tú úroveň (aj ľahšiu, keď je hra priťažká).

V `localStorage` je jeden kľúč `vesmirne-hadanky`:
`{ stars: {id: 1-3}, levels: {id: index}, sound: bool }`. Starý plochý formát
(`{pairs: 3}`) sa ešte načíta ako hviezdy, aby deti neprišli o postup.

## Testovanie

- `tests/logic.test.mjs` - generátory: 3600 bludísk (priechodné, hviezdy vždy na ceste),
  rozdiely (presný počet zmien, objekty sa neprekrývajú), počítanie/postupnosti/písmená.
- `tests/smoke.test.mjs` - jsdom, preklikanie všetkých 7 hier až do výhry. Predstiera
  český tablet (`navigator.languages`), takže overuje aj preklad menu.
- Vizuálne som to overoval headless Chromiom cez Playwright (screenshoty tablet + telefón,
  offline test PWA). Tie skripty sú mimo repa v scratchpade - ak ich treba znova, sú to
  ~30 riadkov Playwrightu; `npm i playwright && playwright install chromium`.

## Čo je overené a čo nie

Overené: všetkých 7 hier prejde do výhry, offline režim, service worker, cache s fontami,
vzhľad na 1180×820 a 430×900.

**Neoverené: reálny dotyk na reálnom tablete.** Všetko bolo klikané myšou/syntetickými
eventmi. Pri prvom hraní s dieťaťom sleduj hlavne:
- ťahanie dielikov v "Poskladaj tvar" - tolerancia zapadnutia je `SNAP = 9` (9 % šírky),
  malým prstom to môže chcieť viac,
- ťahanie rakety v bludisku pri rýchlom pohybe prsta,
- či nie sú terče na ťukanie v "Nájdi rozdiely" primalé.

## Nájdené a opravené bugy (nech sa nevrátia)

1. Na úzkej obrazovke boli prvé karty odrezané nad okrajom a nedalo sa k nim doscrollovať -
   `align-content: center` + `overflow` v CSS gride. Rieši `safe center`.
2. Chrome nevykreslil gradienty v otočenej karte (duplicitné SVG id v dokumente) - viď
   `uniquify()` vyššie.
3. Smoke test padal na `createRadialGradient is not a function` - do `starfield.js` pribudla
   hmlovina a padajúce hviezdy, ale canvas stub v teste ich metódy nemal. Keď pridáš do
   starfieldu novú kresliacu metódu, dopln ju aj do stubu v `tests/smoke.test.mjs`.

## Kam ďalej

- Prepínač jazyka a lokalizované "Prvé písmeno" - viď sekciu Jazyky.
- Z knižky ostali nevyužité typy úloh: domino, hľadanie predmetov v scéne, spájanie
  dvojíc čiarou (človek → vozidlo).
- Sekvencie a písmená sú pre 6-ročné dieťa ľahké - dali by sa pridať ťažšie úrovne.
- Ak pribudne veľa hier, menu bude chcieť kategórie.
