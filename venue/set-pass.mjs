#!/usr/bin/env node
/* Сменить пароль редактора (админки) сайта заведения:
     node venue/set-pass.mjs слово слово слово слово слово
   В venue/admin-pass.json пишется только отпечаток пароля (PBKDF2-SHA256, 600 000 итераций, своя соль) — сам пароль
   нигде не хранится. Регистр, «ё» и дефисы при вводе не важны. Потом — пересобрать онлайн-пример (build-static.mjs). */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { normPass } from "./pass.mjs";

const pw = normPass(process.argv.slice(2).join(" "));
if (pw.split(" ").length < 4) { console.error("Нужно хотя бы 4 слова: node venue/set-pass.mjs слово слово слово слово слово"); process.exit(1); }
const salt = crypto.randomBytes(16), iter = 600000;
const hash = crypto.pbkdf2Sync(pw, salt, iter, 32, "sha256");
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "admin-pass.json");
fs.writeFileSync(out, JSON.stringify({ v: 1, kdf: "PBKDF2-SHA256", iter, salt: salt.toString("base64"), hash: hash.toString("base64") }, null, 1) + "\n");
console.log("Пароль редактора сменён: " + out);
