// Findet t("…")- und plural(…)-Schlüssel im Code, die in src/i18n/parts/*.json keine englische oder Tigrinya-Übersetzung haben.
import fs from "node:fs";
import path from "node:path";
const root = new URL("../src/", import.meta.url).pathname;
const parts = fs.readdirSync(path.join(root, "i18n/parts")).map((f) => JSON.parse(fs.readFileSync(path.join(root, "i18n/parts", f), "utf8")));
const en = Object.assign({}, ...parts.map((p) => p.en || {})), ti = Object.assign({}, ...parts.map((p) => p.ti || {}));
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!/i18n|data/.test(f)) walk(p); } else if (/\.tsx?$/.test(f)) files.push(p); } };
walk(root);
const keys = new Map();
const unq = (s) => s.replace(/\\"/g, '"');
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/\b(?:t|tr)\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.set(unq(m[1]), path.relative(root, f));
  for (const m of src.matchAll(/\bplural\([^,]+,\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"/g)) { keys.set(unq(m[1]), path.relative(root, f)); keys.set(unq(m[2]), path.relative(root, f)); }
}
const missEn = [...keys].filter(([k]) => !(k in en)), missTi = [...keys].filter(([k]) => !(k in ti));
// Platzhalter müssen in allen Sprachen gleich sein
const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const badPh = [...keys.keys()].filter((k) => (k in en && ph(en[k]) !== ph(k)) || (k in ti && ph(ti[k]) !== ph(k)));
console.log(`${keys.size} Schlüssel · ohne Englisch: ${missEn.length} · ohne Tigrinya: ${missTi.length} · Platzhalter falsch: ${badPh.length}`);
const show = process.argv.includes("-v");
if (show) { for (const [k, f] of missEn) console.log("EN", f, JSON.stringify(k)); for (const [k, f] of missTi) console.log("TI", f, JSON.stringify(k)); for (const k of badPh) console.log("PH", JSON.stringify(k)); }
process.exitCode = missEn.length || missTi.length || badPh.length ? 1 : 0;
