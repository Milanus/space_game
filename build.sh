#!/bin/sh
# Poskladá dist/ - presne to, čo patrí na hosting (bez testov, node_modules a fotiek knižky).
# Použitie: npm run dist, potom obsah dist/ pretiahni na Netlify Drop / Cloudflare Pages.
set -e
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist
cp index.html manifest.json sw.js .htaccess dist/
cp -R css js fonts icons dist/
find dist -name '.DS_Store' -delete

# zip pre Hostinger - File Manager ho vie nahrat a rozbalit v public_html;
# na CI (Vercel) zip byt nemusi, tam sa nasadzuje priamo obsah dist/
rm -f dist.zip
if command -v zip >/dev/null 2>&1; then
  (cd dist && zip -qr ../dist.zip .)
  echo "dist.zip hotovy ($(du -h dist.zip | cut -f1))"
fi
echo "dist/ hotovy ($(du -sh dist | cut -f1)), VERSION v sw.js = $(sed -n "s/^const VERSION = '\(.*\)';/\1/p" sw.js)"
