# Prüft die öffentliche Fassung (public/) mit nachgebauter Lese-Schnittstelle und Test-Daten.
# Aufruf aus dem Projektordner: python3 tests/public_page_test.py  (braucht Playwright mit Chromium und Pillow)
import json, pathlib, io, time, shutil
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
im = Image.new("RGB", (800, 800), (190, 168, 128)); ImageDraw.Draw(im).rectangle([0, 540, 800, 800], fill=(40, 86, 112))
b = io.BytesIO(); im.save(b, "WEBP"); hexed = "\\x" + b.getvalue().hex()
now = time.time(); iso = lambda h: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now - h * 3600))
srcrow = lambda i, n, t, k: {"id": i, "name": n, "kind": k, "source_type": t, "homepage": "https://example.org", "stance_note": "x", "last_ok_at": iso(0.5), "last_fetch_at": iso(0.5), "last_error": None, "last_item_count": 2}
R = {
 "sources": [srcrow("dw", "Test Intl", "international", "rss"), srcrow("firms", "FIRMS", "measurement", "firms"), srcrow("ukmto", "UKMTO", "maritime_authority", "ukmto"), srcrow("usgs", "USGS", "measurement", "usgs")],
 "items": [{"id": 5, "title": "Test Red Sea shipping", "url": "https://example.org/5", "language": "en", "regions": ["red_sea"], "origin_domain": None, "published_at": iso(3), "fetched_at": iso(3), "source": {"id": "dw", "name": "Test Intl", "source_type": "international"}},
           {"id": 6, "title": "Test Eritrea war report (must not show)", "url": "https://example.org/6", "language": "en", "regions": ["red_sea", "eritrea"], "origin_domain": None, "published_at": iso(3), "fetched_at": iso(3), "source": {"id": "dw", "name": "Test Intl", "source_type": "international"}}],
 "fire": [{"occurred_at": iso(2), "lat": 14.2, "lon": 38.1, "detail": {"frp_mw": 4, "satellite": "N21"}, "url": None}],
 "quake": [], "maritime": [{"occurred_at": iso(5), "lat": 12.5, "lon": 43.4, "title": "Test sea incident (UKMTO #1)", "url": "https://example.org/u"}],
 "sat_places": [{"id": "adigrat", "name": "Test Adigrat", "country": "Ethiopia (Tigray)", "why": "Test public why.", "lat": 14.27, "lon": 39.46, "half_km": 4.0, "sort": 1}],
 "sat_images": [{"id": 1, "place_id": "adigrat", "captured_at": iso(48), "cloud_pct": 0.1, "item_id": "S2C_TEST", "bytes": 1000}],
 "alerts": [{"kind": "maritime", "t": iso(5), "title": "Test sea incident (UKMTO #1)", "note": "n", "url": "https://example.org/u", "source": "UKMTO"},
            {"kind": "outage", "t": iso(2), "title": "Test outage (must not show)", "note": "n", "url": None, "source": "IODA"}],
 "img": [{"image": hexed}],
}
mock = """<script>window.REQS = []; const R = %s;
window.fetch = async (u) => { window.REQS.push(String(u)); const s = String(u);
  const body = s.includes('/sources?') ? R.sources : s.includes('/items?') ? (s.includes('offset=0') ? R.items : []) :
    s.includes('kind=eq.fire') ? (s.includes('offset=0') ? R.fire : []) : s.includes('kind=eq.quake') ? R.quake : s.includes('kind=eq.maritime') ? R.maritime :
    s.includes('/sat_places') ? R.sat_places : s.includes('sat_images?select=image') ? R.img : s.includes('/sat_images') ? (s.includes('offset=0') ? R.sat_images : []) :
    s.includes('rpc/public_alerts') ? R.alerts : [];
  return { ok: true, json: async () => body }; };</script>""" % json.dumps(R)
ROOT = pathlib.Path(__file__).resolve().parents[1]
pub = ROOT / "public"
OUT = ROOT / "tests" / "out"; OUT.mkdir(parents=True, exist_ok=True)
tmp = OUT / "pubtest"; shutil.rmtree(tmp, ignore_errors=True); shutil.copytree(pub, tmp)
html = (tmp / "index.html").read_text().replace("<script>\n\"use strict\";", mock + "<script>\n\"use strict\";", 1)
assert mock in html
(tmp / "index.html").write_text(html)
with sync_playwright() as p:
    br = p.chromium.launch()
    for name, w in [("pub-desktop", 1280), ("pub-mobile", 390)]:
        pg = br.new_page(viewport={"width": w, "height": 900})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto((tmp / "index.html").resolve().as_uri()); pg.wait_for_timeout(2500)
        txt = pg.evaluate("document.querySelector('main').textContent + document.getElementById('alerts').textContent")
        reqs = pg.evaluate("window.REQS")
        print(name, "scroll", pg.evaluate("document.documentElement.scrollWidth"), "errors", errs[:3])
        print("  no claims:", "#claims" not in pg.evaluate("[...document.querySelectorAll('section')].map(s=>'#'+s.id).join(' ')"),
              "| no war item:", "must not show" not in txt, "| red sea item:", "Test Red Sea shipping" in txt,
              "| public why:", "Test public why." in txt, "| Berlin:", "Berliner Zeit" in txt)
        print("  requests ok:", any("regions=eq.{red_sea}" in r for r in reqs), any("rpc/public_alerts" in r for r in reqs),
              "| forbidden:", [r for r in reqs if any(x in r for x in ("current_alerts", "/reports", "/claims", "kind=eq.outage", "google"))])
        print("  legal links:", pg.evaluate("[...document.querySelectorAll('footer a')].filter(a => /impressum|datenschutz/.test(a.getAttribute('href') || '')).map(a => a.getAttribute('href'))"))
        print("  signals:", pg.evaluate("[...document.querySelectorAll('#signals > div')].map(d => d.textContent.slice(0, 70))"))
        print("  fonts:", pg.evaluate("document.fonts.check('16px \"Public Sans\"')"))
        pg.screenshot(path=str(OUT / f"{name}.png"), full_page=(name == "pub-mobile"))
    br.close()
