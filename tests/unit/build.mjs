// Bündelt die Einheitentests mit der App-Logik für Node. Bildschirm-Module (React Native) werden nicht gebraucht;
// stories.ts holt sich useData aus data.tsx, das hier durch einen leeren Platzhalter ersetzt wird.
import { build } from "esbuild";
await build({
  entryPoints: ["lib.test.ts"], bundle: true, platform: "node", format: "esm", outfile: "out/lib.test.js", logLevel: "warning",
  plugins: [{ name: "stubs", setup(b) {
    b.onResolve({ filter: /^\.\/data$/ }, (a) => (a.importer.endsWith("stories.ts") ? { path: "data", namespace: "stub" } : undefined));
    b.onResolve({ filter: /^@expo\/vector-icons/ }, () => ({ path: "icons", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const useData = () => ({}); export default {};", loader: "js" }));
  } }],
});
