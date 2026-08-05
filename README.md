# Vesmírne hádanky

Detská hra do prehliadača (tablet/mobil, 4-6 rokov). Bez textu, všetko sa ovláda ťukaním a ťahaním prstom.
Inšpirované samolepkovou knižkou z `images/` - grafika je vlastná, kreslená v SVG priamo v kóde.

## Spustenie

```bash
npm start              # http://localhost:8777
```

Stačí statický server, žiadny build. Na tablete otvor adresu notebooku v tej istej wifi
(napr. `http://192.168.0.10:8777`) a pridaj si ju na plochu.

## Minihry

| Hra | Čo dieťa robí | Úrovne |
|-----|---------------|--------|
| Nájdi dvojice | otáča karty a hľadá rovnaké obrázky | 3 → 8 dvojíc |
| Bludisko | prstom vedie raketu k planéte a zbiera 3 hviezdy | 4×4 → 7×7 |
| Nájdi rozdiely | ťuká na to, čo je na druhom obrázku iné | 3 → 5 rozdielov |
| Koľko ich je? | zráta objekty a vyberie kocku so správnym počtom | do 3 → do 8 |
| Čo nasleduje? | doplní chýbajúci obrázok v postupnosti | ABAB → ABBC |
| Prvé písmeno | vyberie hlásku, na ktorú sa obrázok začína | 2 → 4 písmená |
| Poskladaj tvar | ťahá dieliky do obrysu (raketa, ufo, hviezda) | 3 → 6 dielikov |

Za každé kolo sú 1-3 hviezdy podľa počtu chýb, najlepší výsledok sa pamätá v prehliadači.

## Nasadenie na server

Je to statická stránka - stačí hocijaký hosting (Netlify, Vercel, Cloudflare Pages, GitHub Pages,
vlastný nginx/Apache). Nahraj:

```
index.html  manifest.json  sw.js  css/  js/  fonts/  icons/
```

Nenahrávaj `node_modules/`, `tests/`, `package*.json` ani `images/` (fotky knižky, hra ich nepoužíva).

Dve podmienky, inak to nepobeží:
- server musí posielať `.js` ako `text/javascript` (ES moduly),
- musí to byť HTTPS (alebo localhost) - inak sa nespustí service worker.

### Appka na ploche a offline

`manifest.json` + `sw.js` robia z hry PWA: na tablete cez "Pridať na plochu" sa nainštaluje
s vlastnou ikonou a beží na celú obrazovku aj bez internetu (všetko vrátane fontov je v cache).

**Po každej zmene súborov zvýš `VERSION` v `sw.js`** (`v1` → `v2`). Inak deťom ostane
v tablete stará verzia - service worker vracia súbory z cache. Pri novej verzii sa stará
cache zmaže a stránka sa sama obnoví.

Ikony sú v `icons/`, vyrenderované z tej istej SVG grafiky ako hra.

## Štruktúra

```
index.html
manifest.json      PWA - inštalácia na plochu
sw.js              offline cache (pri zmene zvýš VERSION!)
icons/             ikony appky
css/style.css
css/fonts.css      + fonts/ - Baloo 2 (OFL), lokálne, aby hra fungovala offline
js/art.js          všetky SVG postavičky (raketa, ufo, mimoň, planéta...)
                   - gradienty, krémový samolepkový obrys a tiene rieši filter v art.js,
                     každé SVG dostane vlastné id-čka (inak to Chrome v otočenej karte nevykreslí)
js/starfield.js    animované pozadie
js/audio.js        zvuky cez WebAudio (žiadne mp3)
js/main.js         menu, prepínanie hier, odmeny
js/games/*.js      jednotlivé minihry
tests/             logické testy + preklikanie hry cez jsdom
```

## Testy

```bash
npm test
```

`logic.test.mjs` overuje generovanie bludiska (vždy priechodné, hviezdy na ceste) a rozdielov.
`smoke.test.mjs` prejde všetkých sedem hier až do výhry ako reálny hráč.

## Pridanie ďalšej minihry

Nový súbor v `js/games/` s exportom `{ id, name, color, levels, icon(), start(stage, api) }`,
kde `api = { level, setProgress(total, done), win(stars) }`. Potom ho pridaj do `GAMES` v `js/main.js`.
