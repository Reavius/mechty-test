@echo off
chcp 65001 >nul
rem Заказ со стола — запуск прототипа на Windows: двойной щелчок. Нужен Node.js (nodejs.org, версия LTS).
cd /d "%~dp0\.."
where node >nul 2>nul || (echo Сначала установите Node.js: https://nodejs.org ^(кнопка LTS^), потом запустите этот файл ещё раз. & pause & exit /b 1)
echo Если Windows спросит про доступ к сети — разрешите для частной сети, иначе телефоны не откроют меню.
node table\server.mjs
pause
