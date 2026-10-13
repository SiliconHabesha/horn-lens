// Ergänzt die Web-Fassung: Startbildschirm-Icon, Manifest, Angaben für Suchmaschinen und geteilte Links.
import fs from "node:fs";
const f = new URL("../dist/index.html", import.meta.url);
let h = fs.readFileSync(f, "utf8");
const add = `<link rel="canonical" href="https://semay-lagebild.vercel.app/">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Semay">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="description" content="Semay (ሰማይ): Lagebild zum Horn von Afrika, Eritrea zuerst. Was Medien aller Seiten berichten, automatisch eingeordnet, dazu Messwerte und Satellitenbilder. Jede Angabe mit Herkunft. Kostenlos, ohne Konto.">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#EDF0EE">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0E1A1F">
<meta property="og:title" content="Semay – Lagebild Horn von Afrika">
<meta property="og:url" content="https://semay-lagebild.vercel.app/">
<meta property="og:locale" content="de_DE">
<meta property="og:description" content="Derselbe Himmel, alle Seiten: was Medien zum Horn von Afrika berichten, eingeordnet, jede Angabe mit Herkunft.">
<meta property="og:image" content="https://semay-lagebild.vercel.app/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<script>/* Besucherzählung ohne Cookies (Vercel Web Analytics): zählt Seitenaufrufe und Länder, keine Personen. Nur auf der echten Website. */
if(/\.vercel\.app$/.test(location.hostname)){window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};var s=document.createElement("script");s.defer=true;s.src="/_vercel/insights/script.js";document.head.appendChild(s);}</script>
`;
if (!h.includes('rel="manifest"')) h = h.replace("</head>", add + "</head>");
h = h.replace('<meta httpEquiv="X-UA-Compatible"', '<meta http-equiv="X-UA-Compatible"').replace("shrink-to-fit=no", "viewport-fit=cover");
fs.writeFileSync(f, h);
fs.copyFileSync(new URL("../vercel.json", import.meta.url), new URL("../dist/vercel.json", import.meta.url));
console.log("postexport ok");
