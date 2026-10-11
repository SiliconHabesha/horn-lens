// Innere Verwaltungsgrenzen (Regionen) für Äthiopien und Eritrea, Natural Earth 1:10m.
import fs from "node:fs";
import { geoMercator, geoPath, geoCentroid } from "d3-geo";
import { topology } from "topojson-server";
import { mesh } from "topojson-client";

const BOX = { west: 34.5, east: 46.0, south: 10.0, north: 20.5 };
const map = JSON.parse(fs.readFileSync("map.json", "utf8"));
const proj = geoMercator().scale(map.scale).translate(map.translate).clipExtent([[0, 0], [map.width, map.height]]);
const path = geoPath(proj);
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => (Math.round(Number(n) * 10) / 10).toString());

const all = JSON.parse(fs.readFileSync("ne/admin1.geojson", "utf8")).features;
const out = {};
for (const admin of ["Ethiopia", "Eritrea"]) {
  const feats = all.filter((f) => f.properties.admin === admin).map((f) => ({ ...f, properties: { name: f.properties.name_en || f.properties.name } }));
  const topo = topology({ r: { type: "FeatureCollection", features: feats } }, 1e5);
  const inner = mesh(topo, topo.objects.r, (a, b) => a !== b);
  out[admin] = round(path(inner) || "");
  for (const f of feats) {
    const [lon, lat] = geoCentroid(f);
    if (lon > BOX.west && lon < BOX.east && lat > BOX.south && lat < BOX.north) console.log(admin, f.properties.name, lat.toFixed(2), lon.toFixed(2));
  }
}
fs.writeFileSync("regions.json", JSON.stringify(out));
console.log("Ethiopia path", out.Ethiopia.length, "Eritrea path", out.Eritrea.length);
