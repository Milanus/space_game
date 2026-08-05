# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Projekt je slovenský - komentáre, názvy hier a UI texty píš po slovensky (komentáre v kóde bez diakritiky, UI s diakritikou).

## Príkazy

```bash
npm start                      # statický server na http://localhost:8777
npm test                       # oba testy
node tests/logic.test.mjs      # len generátory (bludisko, rozdiely, kvízy)
node tests/smoke.test.mjs      # len preklikanie hier cez jsdom
```

Žiadny build ani lint - to, čo je v priečinku, beží v prehliadači. Node je iba na testy.
Jednotlivý test sa nedá spustiť samostatne (testy sú obyčajné skripty s `ok()` kontrolami,
nie test runner); ak treba zúžiť, uprav pole úrovní/hier priamo v teste.

## Architektúra

Vanilla JS, ES moduly, jedna stránka s dvoma obrazovkami (`#hub` menu / `#game`) a overlayom výhry.
`js/main.js` drží stav, `js/games/*.js` sú nezávislé minihry, `js/art.js` je jediný zdroj grafiky.

### Kontrakt minihry

Každá hra v `js/games/` exportuje default:

```js
{ id, name, color, levels, icon(), start(stage, api) }
```

`api = { level, setProgress(total, done), win(stars) }`, `start()` vracia `{ destroy() }`.
Pridanie do poľa `GAMES` v `js/main.js` stačí - menu, lišta s hviezdičkami, prepínanie
úrovní aj obrazovka výhry idú automaticky. Hviezdy (1-3 podľa počtu chýb) ukladá
`saveStars()` do localStorage, dosiahnutú úroveň `saveLevel()`. Celý stav je jeden kľúč
`vesmirne-hadanky`: `{ stars, levels, sound }` (starý plochý formát sa ešte načíta).
Zvuk sa vypína tlačidlom v menu - `setMuted()` v `js/audio.js`, stav prežije reštart.
Karta v menu je `.card-slot` (obal) = tlačidlo `.card` + bodky `.lvl` s úrovňami; bodka
spustí danú úroveň, takže `saveLevel()` ukladá poslednú hranú, nie najvyššiu dosiahnutú.

### Grafika (js/art.js)

Všetkých 10 postavičiek sú funkcie `SHAPES.raketa(color)` → markup do viewBoxu `0 0 100 100`.
Farba sa premieta do gradientu (`fill()`) aj obrysu (`ink()`). Samolepkový vzhľad (krémový
obrys + tieň) robí SVG filter `#sticker`, nie ručné obrysy.

- `shapeSvg(key, color)` - samostatné `<svg>`, použi v HTML kontexte (karty, tlačidlá).
- `shapeGroup(key, color, attrs)` - `<g>` do cudzieho `<svg>`; rodič **musí** obsahovať `ALL_DEFS`.

**Kritické:** každé `<svg>` musí mať vlastné id-čka gradientov a filtrov. `svg()` to rieši
cez `uniquify()` samo; ak hra skladá vlastné `<svg>` z `ALL_DEFS` + tvarov, prežeň celý
reťazec cez `svgDoc()`. Bez toho Chrome nevykreslí gradienty v 3D-otočenej karte
(Nájdi dvojice) a figúrky vyjdú čierne.

### Jazyky (js/i18n.js)

Slovenčina / čeština / angličtina, jazyk podľa `navigator.language(s)`, fallback `sk`.
Prekladá sa logo, `title`, aria-labely a názvy hier - nie obsah hier.

- Nový text v HTML označ `data-i18n="kluc"` (obsah) alebo `data-i18n-aria="kluc"` (aria-label),
  `applyStaticText()` ho preloží pri štarte. Ak má prvok `data-text` (logo), prepíše sa tiež.
- Názov hry v menu ide cez `t('game.' + id)` - **kľúč musí sedieť s `id` hry**, nie s názvom
  súboru (`diffs`, `count`, `seq`). Vlastnosť `name` v module je už len fallback pri vývoji.
- Nový kľúč pridaj do všetkých troch jazykov - test v `logic.test.mjs` kontroluje úplnosť.
- `letters.js` je zámerne len slovenský (prvé písmeno slovenských slov). Podrobnosti a dôsledky
  pre angličtinu sú v `HANDOFF.md`.

### Ďalšie moduly

`js/starfield.js` (canvas pozadie), `js/audio.js` (zvuky cez WebAudio, žiadne mp3),
`js/util.js` (shuffle/rand, localStorage), `css/fonts.css` + `fonts/` (Baloo 2, lokálne kvôli offline).

## PWA

`manifest.json` + `sw.js` + `icons/`. **Po každej zmene súborov zvýš `VERSION` v `sw.js`**,
inak dostane používateľ starú verziu z cache. Nový súbor treba pridať aj do poľa `ASSETS`.
Service worker beží len na HTTPS/localhost.

## Testovanie

`tests/smoke.test.mjs` beží hru v jsdom - stubuje canvas a `getBoundingClientRect`
(v jsdom sú nuly, takže hry s pointer-mapovaním by dostali NaN). Nové hry pridaj do smoke
testu; kvízové hry sa dajú preklikať generickým `playQuiz()` (skúša možnosti, kým jedna nesedí).

Vizuál sa overuje headless Chromiom cez Playwright - tie skripty nie sú v repe.
Ak treba znova: `npm i playwright && playwright install chromium`, potom screenshoty
proti `localhost:8777`. Pri klikaní používaj `mouse.click()` na súradnice, nie
`locator.click()` (na rotovaných kartách hlási false intercept).

## Známe obmedzenia

Hra nebola otestovaná reálnym dotykom na tablete - iba myšou a syntetickými eventmi.
Podozrivé miesta: `SNAP = 9` v `tangram.js` (tolerancia zapadnutia dielika), ťahanie
rakety v bludisku, veľkosť terčov v `differences.js`.

Ďalší kontext: `README.md` (spustenie, nasadenie), `HANDOFF.md` (stav projektu, opravené bugy, TODO).
`images/` sú fotky predlohovej knižky - hra ich nepoužíva a nenahrávajú sa na server.
