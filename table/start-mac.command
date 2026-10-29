#!/bin/bash
# Заказ со стола — запуск прототипа на Mac: двойной щелчок (в первый раз — правой кнопкой → «Открыть»). Нужен Node.js (nodejs.org).
cd "$(dirname "$0")/.." || exit 1
if ! command -v node >/dev/null 2>&1; then echo "Сначала установите Node.js: https://nodejs.org (кнопка LTS), потом запустите этот файл ещё раз."; read -r; exit 1; fi
node table/server.mjs
