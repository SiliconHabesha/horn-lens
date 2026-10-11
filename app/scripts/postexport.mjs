// Ergänzt die Web-Fassung: Startbildschirm-Icon, Manifest, keine Aufnahme in Suchmaschinen.
import fs from "node:fs";
const f = new URL("../dist/index.html", import.meta.url);
let h = fs.readFileSync(f, "utf8");
const add = `<meta name="robots" content="noindex, nofollow">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Horn Lens">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="description" content="Lagebild zum Horn von Afrika mit Eritrea zuerst. Powered by BELES.">
`;
if (!h.includes('rel="manifest"')) h = h.replace("</head>", add + "</head>");
h = h.replace('<meta httpEquiv="X-UA-Compatible"', '<meta http-equiv="X-UA-Compatible"').replace("shrink-to-fit=no", "viewport-fit=cover");
fs.writeFileSync(f, h);
fs.copyFileSync(new URL("../vercel.json", import.meta.url), new URL("../dist/vercel.json", import.meta.url));
console.log("postexport ok");
