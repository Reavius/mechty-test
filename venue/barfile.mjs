/* Карта бара для сайта заведения: меню из барного гида (table/menufile.mjs) + крепость коктейля из открытой карты
   (js/data.js) — по ней работает «Подбери коктейль». Читается сервером и сборкой онлайн-примера. */
import fs from "node:fs";
import path from "node:path";
import { readMenu } from "../table/menufile.mjs";

export function readBar(root){
  const menu = readMenu(root).menu;
  const pub = fs.readFileSync(path.join(root, "js", "data.js"), "utf8").match(/\/\* PUB:BEGIN \*\/\nconst data = ([\s\S]*);\n\/\* PUB:END \*\//);
  const abv = {};
  if (pub) for (const g of JSON.parse(pub[1])) for (const it of g.items || []) if (it.abv) abv[it.id] = it.abv;
  for (const c of menu) for (const s of c.secs) for (const it of s.items) if (abv[it.id] != null) it.abv = abv[it.id];
  return menu;
}
