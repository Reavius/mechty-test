@echo off
chcp 65001 >nul
rem Сайт заведения «Мечты» — пример. Запуск на Windows: двойной щелчок. Нужен Node.js (nodejs.org, версия LTS).
cd /d "%~dp0\.."
where node >nul 2>nul || (echo Сначала установите Node.js: https://nodejs.org ^(кнопка LTS^), потом запустите этот файл ещё раз. & pause & exit /b 1)
echo Если Windows спросит про доступ к сети — разрешите для частной сети, чтобы сайт открывался с телефона.
start "" http://localhost:8090/
node venue\server.mjs
pause
