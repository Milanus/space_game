#!/bin/sh
# Poskladá dist/ - presne to, čo patrí na hosting (bez testov, node_modules a fotiek knižky).
# Použitie: npm run dist, potom obsah dist/ pretiahni na Netlify Drop / Cloudflare Pages.
set -e
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist
cp index.html manifest.json sw.js dist/
cp -R css js fonts icons dist/
find dist -name '.DS_Store' -delete

echo "dist/ hotovy ($(du -sh dist | cut -f1)), VERSION v sw.js = $(sed -n "s/^const VERSION = '\(.*\)';/\1/p" sw.js)"
