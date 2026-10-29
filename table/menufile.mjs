/* Меню из файлов сайта: MENU из js/menu.js и открытая карта из js/data.js — для сервера и для сборки демо. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { buildMenu } from "./core.mjs";

export function readMenu(root){
  const m = fs.readFileSync(path.join(root, "js", "menu.js"), "utf8").match(/^const MENU = (\[[\s\S]*?\n\]);$/m);
  const pub = fs.readFileSync(path.join(root, "js", "data.js"), "utf8").match(/\/\* PUB:BEGIN \*\/\nconst data = ([\s\S]*);\n\/\* PUB:END \*\//);
  if (!m || !pub) throw new Error("Не нашёл меню в js/menu.js или карту в js/data.js");
  return buildMenu(vm.runInNewContext("(" + m[1] + ")", {}, { timeout: 1000 }), JSON.parse(pub[1]),
    s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8));
}
