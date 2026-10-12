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
<meta name="description" content="Lagebild zum Horn von Afrika mit Eritrea zuerst. Jede Angabe mit Herkunft. Powered by BELES.">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#EDF0EE">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0E1A1F">
<meta property="og:title" content="Horn Lens">
<meta property="og:description" content="Lagebild Horn von Afrika. Jede Angabe mit Herkunft.">
<meta property="og:image" content="https://horn-lens.vercel.app/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
`;
if (!h.includes('rel="manifest"')) h = h.replace("</head>", add + "</head>");
h = h.replace('<meta httpEquiv="X-UA-Compatible"', '<meta http-equiv="X-UA-Compatible"').replace("shrink-to-fit=no", "viewport-fit=cover");
fs.writeFileSync(f, h);
fs.copyFileSync(new URL("../vercel.json", import.meta.url), new URL("../dist/vercel.json", import.meta.url));
console.log("postexport ok");
