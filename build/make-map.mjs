// Erzeugt die Länderumrisse für die Horn-Lens-Karte als fertige SVG-Pfade.
// Daten: Natural Earth 1:10m (gemeinfrei) über das npm-Paket world-atlas.
import fs from "node:fs";
import { geoMercator, geoPath, geoBounds } from "d3-geo";
import { feature } from "topojson-client";

// Ganzes Horn von Afrika: Sudan (Khartum) bis zur Spitze Somalias. Breite so, dass der Maßstab gleich bleibt wie beim alten Eritrea-Ausschnitt (720 px für 34,5–46° O).
const BOX = { west: 31.0, east: 51.5, south: -2.0, north: 21.0 };
const W = Math.round(720 * (BOX.east - BOX.west) / (46.0 - 34.5));

const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-10m.json", "utf8"));
const countries = feature(topo, topo.objects.countries).features;

const frame = {
  type: "Polygon",
  // Im Uhrzeigersinn: d3 deutet gegen den Uhrzeigersinn als "alles außer diesem Kasten"
  coordinates: [[[BOX.west, BOX.south], [BOX.west, BOX.north], [BOX.east, BOX.north], [BOX.east, BOX.south], [BOX.west, BOX.south]]],
};
// Höhe aus dem Seitenverhältnis der Mercator-Projektion
const probe = geoMercator().fitWidth(W, frame);
const [[, y0], [, y1]] = geoPath(probe).bounds(frame);
const H = Math.round(y1 - y0);
const proj = geoMercator().fitSize([W, H], frame);
proj.clipExtent([[0, 0], [W, H]]);
const path = geoPath(proj);

const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => (Math.round(Number(n) * 10) / 10).toString());

const out = [];
for (const f of countries) {
  const [[w, s], [e, n]] = geoBounds(f);
  if (["France", "Maldives"].includes(f.properties.name)) continue; // Überseegebiete, liegen nicht im Ausschnitt
  if (e < BOX.west || w > BOX.east || n < BOX.south || s > BOX.north) continue;
  const d = path(f);
  if (!d) continue;
  out.push({ id: f.id ?? null, name: f.properties.name, d: round(d) });
}

const result = { width: W, height: H, scale: proj.scale(), translate: proj.translate(), box: BOX, countries: out };
fs.writeFileSync("map.json", JSON.stringify(result));
console.log(W, H, out.map((c) => `${c.name}(${c.d.length})`).join(" "));
