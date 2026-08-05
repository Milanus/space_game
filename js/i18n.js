// Jazyk berieme z nastavenia zariadenia (navigator.language) - ziadny server ani geo IP.
// Prepinac v menu zatial nie je; ak bude tablet nastaveny inak, jazyk sa neda zmenit rucne.
//
// POZOR: hra "Prve pismeno" ostava slovenska - pyta sa na prve pismeno slovenskych slov
// (hviezda -> H). V cestine to vychadza rovnako, v anglictine nie (star -> S). Viac v HANDOFF.md.

export const DICT = {
  sk: {
    'app.title': 'Vesmírne hádanky',
    'logo.top': 'Vesmírne',
    'logo.bottom': 'Hádanky',
    'btn.back': 'Späť',
    'btn.again': 'Znova',
    'btn.home': 'Domov',
    'btn.next': 'Ďalej',
    'btn.sound': 'Zvuk zapnutý',
    'btn.soundOff': 'Zvuk vypnutý',
    'btn.level': 'Úroveň',
    'game.pairs': 'Nájdi dvojice',
    'game.maze': 'Bludisko',
    'game.diffs': 'Nájdi rozdiely',
    'game.count': 'Koľko ich je?',
    'game.seq': 'Čo nasleduje?',
    'game.letters': 'Prvé písmeno',
    'game.tangram': 'Poskladaj tvar',
  },
  cs: {
    'app.title': 'Vesmírné hádanky',
    'logo.top': 'Vesmírné',
    'logo.bottom': 'Hádanky',
    'btn.back': 'Zpět',
    'btn.again': 'Znovu',
    'btn.home': 'Domů',
    'btn.next': 'Dál',
    'btn.sound': 'Zvuk zapnutý',
    'btn.soundOff': 'Zvuk vypnutý',
    'btn.level': 'Úroveň',
    'game.pairs': 'Najdi dvojice',
    'game.maze': 'Bludiště',
    'game.diffs': 'Najdi rozdíly',
    'game.count': 'Kolik jich je?',
    'game.seq': 'Co následuje?',
    'game.letters': 'První písmeno',
    'game.tangram': 'Poskládej tvar',
  },
  en: {
    'app.title': 'Space Puzzles',
    'logo.top': 'Space',
    'logo.bottom': 'Puzzles',
    'btn.back': 'Back',
    'btn.again': 'Again',
    'btn.home': 'Home',
    'btn.next': 'Next',
    'btn.sound': 'Sound on',
    'btn.soundOff': 'Sound off',
    'btn.level': 'Level',
    'game.pairs': 'Find the Pairs',
    'game.maze': 'Maze',
    'game.diffs': 'Spot the Differences',
    'game.count': 'How Many?',
    'game.seq': 'What Comes Next?',
    'game.letters': 'First Letter',
    'game.tangram': 'Build the Shape',
  },
};

export const DEFAULT_LANG = 'sk';
export const LANGS = Object.keys(DICT);

// z 'cs-CZ' spravime 'cs'; berieme prvy jazyk zo zoznamu, ktory pozname
export function detectLang(navigator = globalThis.navigator) {
  const list = navigator?.languages?.length ? navigator.languages : [navigator?.language];
  for (const tag of list) {
    const code = String(tag || '').toLowerCase().split('-')[0];
    if (DICT[code]) return code;
  }
  return DEFAULT_LANG;
}

export const lang = detectLang();

export const t = (key) => DICT[lang][key] ?? DICT[DEFAULT_LANG][key] ?? key;

// Prelozi staticke texty v HTML: data-i18n = obsah, data-i18n-aria = aria-label.
// Logo si obrys kresli cez ::before z data-text, takze ten treba prepisat tiez.
export function applyStaticText(doc = document) {
  doc.documentElement.lang = lang;
  doc.title = t('app.title');
  for (const node of doc.querySelectorAll('[data-i18n]')) {
    const text = t(node.dataset.i18n);
    node.textContent = text;
    if (node.hasAttribute('data-text')) node.setAttribute('data-text', text);
  }
  for (const node of doc.querySelectorAll('[data-i18n-aria]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nAria));
  }
}
