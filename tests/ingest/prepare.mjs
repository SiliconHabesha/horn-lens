// Holt die reinen Funktionen (ohne Netz und Datenbank) aus supabase/functions/ingest/parse.ts und übersetzt sie für Node.
// Aufruf: cd tests/ingest && npm install && node prepare.mjs && node run.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
const src = readFileSync(new URL("../../supabase/functions/ingest/parse.ts", import.meta.url), "utf8")
  .replace('from "npm:fast-xml-parser@4"', 'from "fast-xml-parser"');
writeFileSync(new URL("./t.ts", import.meta.url), src);
execSync("npx tsc --target es2022 --module es2022 --moduleResolution bundler --skipLibCheck --outDir out t.ts", { cwd: new URL(".", import.meta.url), stdio: "inherit" });
