// Übernimmt gemeinsame Daten aus der Web-Fassung: deutsche Texte, Kartenumrisse, Regionsgrenzen.
// Aufruf: npm run sync
import fs from "node:fs";
const root = new URL("../../", import.meta.url);
const out = new URL("../src/data/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const de = JSON.parse(fs.readFileSync(new URL("web/src/de_data.json", root)));
fs.writeFileSync(new URL("de_public.json", out), JSON.stringify(de.public));
// Die privaten Texte kommen NICHT in die App (deren Code ist öffentlich), sondern als Datenbank-Funktion, die nur der Besitzer abrufen kann.
const tag = "$de$";
fs.writeFileSync(new URL("supabase/app_de_texts.sql", root), `-- erzeugt von app/scripts/sync.mjs aus web/src/de_data.json ("private")\ncreate or replace function private.de_texts() returns jsonb language sql immutable set search_path = '' as ${tag}select ${tag}${tag}${JSON.stringify(de.private)}${tag}${tag}::jsonb${tag};\n`.replace("select $de$$de$", "select $j$").replace("$de$$de$::jsonb", "$j$::jsonb"));
const m = JSON.parse(fs.readFileSync(new URL("build/map.json", root)));
fs.writeFileSync(new URL("map.json", out), JSON.stringify({ width: m.width, height: m.height, scale: m.scale, translate: m.translate,
  countries: m.countries.map((c) => ({ n: c.name, d: c.d })) }));
fs.copyFileSync(new URL("build/regions.json", root), new URL("regions.json", out));
console.log("synced");
