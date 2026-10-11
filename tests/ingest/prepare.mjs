// Holt die reinen Funktionen (ohne Datenbank) aus der Funktion ingest und übersetzt sie für Node.
// Aufruf aus dem Projektordner: cd tests/ingest && npm install && node prepare.mjs && node run.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
const src = readFileSync(new URL("../../supabase/functions/ingest/index.ts", import.meta.url), "utf8");
const body = src.slice(src.indexOf("type Source"), src.indexOf("const sleep"));
writeFileSync(new URL("./t.ts", import.meta.url), 'import { XMLParser } from "fast-xml-parser";\n' + body +
  "\nexport { tagRegions, tagItem, relevant, stripHtml, detectLanguage, cleanUrl, parseRss, toIso };\n");
execSync("npx tsc --target es2022 --module es2022 --moduleResolution bundler --skipLibCheck --outDir out t.ts", { cwd: new URL(".", import.meta.url), stdio: "inherit" });
writeFileSync(new URL("./t.mjs", import.meta.url), readFileSync(new URL("./out/t.js", import.meta.url), "utf8"));
console.log("ready: node run.mjs");
