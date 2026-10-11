# Prüft die App (Web-Fassung aus app/dist) mit nachgebautem Supabase und Testdaten, ohne echte Daten.
# Vorher: cd app && npx expo export -p web --output-dir dist
# Aufruf: python3 tests/app_test.py [Ordner für Bildschirmfotos]
import base64, http.server, io, json, pathlib, socketserver, sys, threading, time
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIST = ROOT / "app" / "dist"
SHOTS = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tests" / "out" / "app"
SHOTS.mkdir(parents=True, exist_ok=True)
PORT = 8765

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(DIST), **k)
    def log_message(self, *a): pass
    def send_head(self):
        p = DIST / self.path.split("?")[0].lstrip("/")
        if not p.exists() or p.is_dir() and not (p / "index.html").exists(): self.path = "/index.html"  # wie Vercel: alles auf index.html
        return super().send_head()
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORT), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()

now = time.time()
iso = lambda h: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now - h * 3600))
def fake(shift):
    im = Image.new("RGB", (600, 600), (190, 168, 128)); d = ImageDraw.Draw(im)
    d.rectangle([0, 400, 600, 600], fill=(40, 86, 112))
    for k in range(5): d.rectangle([80 + k * 80 + shift, 150, 120 + k * 80 + shift, 360], fill=(232, 232, 226))
    b = io.BytesIO(); im.save(b, "WEBP"); return b.getvalue()
IMG = {1: fake(0), 2: fake(40), 3: fake(80)}

src = lambda i, n, t, k="rss", ok=0.5, err=None, newest=1: {"id": i, "name": n, "kind": k, "source_type": t, "homepage": "https://example.org", "stance_note": "Website of Eritrea's Ministry of Information. States the government's position; not independent confirmation." if i == "shabait" else "Shipping trade press.",
    "last_ok_at": iso(ok) if ok is not None else None, "last_fetch_at": iso(0.5), "last_error": err, "last_item_count": 3, "newest_item_at": iso(newest) if newest else None}
sources = [src("shabait", "Shabait (Eritrean Ministry of Information)", "government_er"), src("awate", "Awate.com", "exile"), src("fana", "Fana Broadcasting (English)", "progov_et"),
  src("tghat", "Tghat", "tigray", newest=24 * 30), src("dw", "DW – Africa", "international"), src("aljazeera", "Al Jazeera English", "international"), src("hrw", "Human Rights Watch", "un_ngo"),
  src("erena", "Radio Erena", "exile", ok=None, err="HTTP 403", newest=None),
  src("firms", "NASA FIRMS (VIIRS fire detections)", "measurement", "firms", newest=None), src("ukmto", "UKMTO maritime incidents", "maritime_authority", "ukmto", newest=None),
  src("usgs", "USGS earthquakes", "measurement", "usgs", newest=None), src("ioda", "IODA internet outage detection (Georgia Tech)", "measurement", "ioda", newest=None)]
it = lambda i, t, regs, s, sid, st, h, lang="en", dom=None: {"id": i, "title": t, "url": f"https://example.org/{i}", "language": lang, "regions": regs, "origin_domain": dom,
  "published_at": iso(h), "fetched_at": iso(h), "source_id": sid, "source_name": s, "source_type": st}
items = [it(1, "Eritrean troops reported near Adigrat as tensions rise", ["eritrea", "tigray"], "Al Jazeera English", "aljazeera", "international", 1),
  it(2, "ሓበሬታ ሚኒስትሪ ዜና ብዛዕባ ምዕባለ ከባቢ", ["eritrea"], "Shabait (Eritrean Ministry of Information)", "shabait", "government_er", 2, "ti"),
  it(3, "Exiles report new round-ups in Asmara", ["eritrea"], "Awate.com", "awate", "exile", 3),
  it(4, "Tigray interim administration calls for calm", ["tigray"], "Tghat", "tghat", "tigray", 5),
  it(5, "Houthi attack reported off Mokha, ship damaged", ["red_sea"], "DW – Africa", "dw", "international", 6),
  it(6, "عنوان تجريبي عن إريتريا", ["eritrea"], "Al Jazeera English", "aljazeera", "international", 8, "ar"),
  it(7, "Ethiopia says it will not accept Eritrean troop presence", ["ethiopia", "eritrea"], "Fana Broadcasting (English)", "fana", "progov_et", 10),
  it(8, "Afar region reports displacement after clashes", ["afar"], "Human Rights Watch", "hrw", "un_ngo", 30),
  it(9, "Red Sea shipping insurance rates climb again", ["red_sea"], "DW – Africa", "dw", "international", 40)]
# Echte Schlagzeilen (Oktober 2026) für Geschichten, zeitlich so verschoben, dass die neueste vor einer halben Stunde erschien
REAL = json.load(open(ROOT / "tests" / "fixtures" / "real_items.json"))
_newest = max(time.mktime(time.strptime(x["published_at"], "%Y-%m-%dT%H:%M:%SZ")) for x in REAL)
for x in REAL:
    h = (_newest - time.mktime(time.strptime(x["published_at"], "%Y-%m-%dT%H:%M:%SZ"))) / 3600 + 0.5
    x["published_at"] = x["fetched_at"] = iso(h); x["id"] += 100000
items = items + REAL
ev = lambda h, st, note, srcs: {"at": iso(h), "status": st, "note": note, "source_title": srcs[0][0] if srcs else None, "source_url": srcs[0][1] if srcs else None,
  "extra": [{"title": a, "url": b} for a, b in srcs[1:]], "admission": False}
claims = [
 {"id": 4, "statement": "Eritrean soldiers drove through Adigrat, about 25 km south of the border.", "claimant": "Two eyewitnesses speaking to Reuters",
  "disputed_by": "Eritrea's information minister calls such reports part of an Ethiopian plan to justify a war", "region": "tigray", "status": "likely", "party_claim": False,
  "first_reported": "2026-10-06", "updated_at": iso(5),
  "events": [ev(5, "likely", "Corrected: who denies it. Eritrea's position added; it was already recorded in the history on 9 October.", []),
             ev(20, "likely", "Reuters could not verify the accounts independently.", [("Reuters via 93.3 The Drive, 8 Oct 2026", "https://example.org/r"), ("AFP via Oman Observer, 7 Oct 2026", "https://example.com/a")]),
             ev(90, "unconfirmed", "Reuters could not verify the accounts independently.", [("Al Jazeera / Reuters, 7 Oct 2026", "https://example.net/z")])]},
 {"id": 6, "statement": "Eritrea is backing the armed alliance, and Sudan and Egypt are involved too.", "claimant": "Ethiopia's army chief, Field Marshal Birhanu Jula (named Eritrea directly; implied a role for Sudan and Egypt)",
  "disputed_by": "Eritrea, Egypt and Sudan all deny it", "region": "ethiopia", "status": "disputed", "party_claim": True, "first_reported": "2026-09-25", "updated_at": iso(60),
  "events": [ev(60, "disputed", "Claimed by the Ethiopian government and denied by all three.", [("AP via ABC News, 28 Sep 2026", "https://example.org/b")])]},
 {"id": 2, "statement": "Ethiopia closed its embassy in Asmara on 1 October; Eritrea then cut diplomatic ties with Ethiopia.", "claimant": "Both governments, officially",
  "disputed_by": None, "region": "eritrea", "status": "confirmed", "party_claim": False, "first_reported": "2026-10-01", "updated_at": iso(200),
  "events": [ev(200, "confirmed", "Both foreign ministries announced it; Reuters and AP report it as fact.", [("Reuters via TimesLIVE, 2 Oct 2026", "https://example.org/c"), ("AP via NY1, 4 Oct 2026", "https://example.com/d")])]}]
alerts = [{"kind": "maritime", "t": iso(5), "title": "Attack, Bab el Mandeb (UKMTO #117)", "note": "Reported by UKMTO, the UK navy's shipping desk. UKMTO does not say who was responsible.", "url": "https://example.org/u", "source": "UKMTO"},
          {"kind": "outage", "t": iso(3), "title": "Internet connectivity dip in Eritrea", "note": "IODA (ping-slash24) measured 1200 against a usual 3000 (−60%). A measured drop is not proof of a deliberate shutdown.", "url": "https://example.org/i", "source": "IODA"}]
fires = [[14.1 + (i % 15) * 0.05, 37.4 + (i // 15) * 0.25, int(now - 3600 * (i % 20)), "N21", 3.5 + i % 9] for i in range(80)]
sat = [{"id": "assab-airfield", "name": "Assab airfield", "country": "Eritrea", "why": "Airport and the former UAE military base next to it, with its own pier.", "lat": 13.07, "lon": 42.645, "half_km": 4.5,
        "images": [[3, int(now - 86400 * 2), 0.1, "S2C_TEST_A", len(IMG[3])], [2, int(now - 86400 * 360), 0.3, "S2B_TEST_B", len(IMG[2])], [1, 1603190000, 0.0, "S2A_TEST_C", len(IMG[1])]]},
       {"id": "zalambessa", "name": "Zalambessa–Serha crossing", "country": "Eritrea / Ethiopia", "why": "Main road crossing between Serha (Eritrea) and Zalambessa (Tigray).", "lat": 14.517, "lon": 39.383, "half_km": 3,
        "images": [[2, int(now - 86400 * 5), 1.0, "S2B_TEST_B", len(IMG[2])], [1, int(now - 86400 * 400), 0.0, "S2A_TEST_C", len(IMG[1])]]}]
owner_data = {"now": iso(0), "sources": sources, "reports": [{"report_date": "2026-10-11", "generated_at": iso(9), "has_summary": True}, {"report_date": "2026-10-10", "generated_at": iso(33), "has_summary": False}],
  "items": items, "signals": {"quakes": [{"t": iso(30), "lat": 13.2, "lon": 42.8, "title": "Earthquake M4.6, 20 km NNE of Assab, Eritrea", "mag": 4.6, "url": "https://example.org/q"}],
  "maritime": [{"t": iso(5), "lat": 12.6, "lon": 43.3, "title": "Attack, Bab el Mandeb (UKMTO #117)", "url": "https://example.org/u"},
               {"t": iso(200), "lat": 13.3, "lon": 43.1, "title": "Suspicious Activity, 25NM W of Mokha, Yemen (UKMTO #110)", "url": None}],
  "outages": [{"t": iso(3), "title": "Internet connectivity dip in Eritrea (PING-SLASH24 12% below usual)", "country": "ER", "level": "warning", "url": "https://example.org/i"}],
  "fires_total": 1712, "fires": fires}, "alerts": alerts, "claims": claims, "sat": sat}
report = {"report_date": "2026-10-11", "generated_at": iso(9), "window_start": iso(33), "window_end": iso(9),
  "payload": {"regions": [{"region": "eritrea", "items": items[:3]}, {"region": "tigray", "items": [items[3]]}, {"region": "red_sea", "items": [items[4]]}],
              "changes": [{"at": iso(20), "status": "likely", "statement": claims[0]["statement"], "note": "Reuters could not verify the accounts independently.", "source_title": "Reuters, 8 Oct 2026", "source_url": "https://example.org/r"}],
              "signals": {"fires_24h": 1, "quakes_7d": 1, "maritime_30d": 2, "outages_48h": 1}, "alerts": alerts[:1]},
  "summary": {"sentences": [{"text": "Laut Al Jazeera wurden eritreische Truppen nahe Adigrat gemeldet.", "cites": [{"n": 1, "outlet": "Al Jazeera", "url": "https://example.org/1", "title": "x"}]}], "saved_at": iso(8)}}

calls = []
def route(r):
    u = r.request.url; path = u.split(".supabase.co")[1]
    calls.append((r.request.method, path.split("?")[0]))
    body = None; headers = {"content-type": "application/json", "access-control-allow-origin": "*"}
    if path.startswith("/rest/v1/rpc/app_data"): body = owner_data
    elif path.startswith("/rest/v1/rpc/app_texts"): body = {}
    elif path.startswith("/rest/v1/rpc/app_report"): body = report
    elif path.startswith("/rest/v1/rpc/public_alerts"): body = alerts[:1]
    elif path.startswith("/rest/v1/rpc/app_claim"): body = None
    elif path.startswith("/rest/v1/sat_images?select=image"):
        i = int(path.split("id=eq.")[1].split("&")[0]); body = {"image": "\\x" + IMG[i].hex()}
    elif path.startswith("/rest/v1/sat_images"): body = [{"id": im[0], "place_id": p["id"], "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(im[1])), "cloud_pct": im[2], "item_id": im[3], "bytes": im[4]} for p in sat for im in p["images"]]
    elif path.startswith("/rest/v1/sat_places"): body = [{k: p[k] for k in ("id", "name", "country", "lat", "lon", "half_km")} | {"why": "Airport near Assab on Eritrea's southern Red Sea coast, with a large airfield and pier complex next to it.", "sort": 1} for p in sat]
    elif path.startswith("/rest/v1/sources"): body = [{k: v for k, v in s.items() if k != "newest_item_at"} for s in sources]
    elif path.startswith("/rest/v1/items"):
        body = [{**{k: v for k, v in i.items() if k not in ("source_id", "source_name", "source_type")}, "source": {"id": i["source_id"], "name": i["source_name"], "source_type": i["source_type"]}} for i in items if i["regions"] == ["red_sea"]]
    elif path.startswith("/rest/v1/signals") and "kind=eq.fire" in path: body = [{"occurred_at": iso(2), "lat": f[0], "lon": f[1], "detail": {"satellite": "N21", "frp_mw": f[4]}, "url": None} for f in fires[:30]]
    elif path.startswith("/rest/v1/signals") and "kind=eq.quake" in path: body = []
    elif path.startswith("/rest/v1/signals") and "kind=eq.maritime" in path: body = [{"occurred_at": m["t"], "lat": m["lat"], "lon": m["lon"], "title": m["title"], "url": m["url"]} for m in owner_data["signals"]["maritime"]]
    else: body = []
    if r.request.method == "OPTIONS":
        return r.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
    r.fulfill(status=200, headers=headers, body=json.dumps(body))

SESSION = {"access_token": "test.test.test", "refresh_token": "r", "expires_in": 3600, "expires_at": int(now) + 3600, "token_type": "bearer",
           "user": {"id": "00000000-0000-0000-0000-000000000001", "email": "betreiber@example.org", "aud": "authenticated", "role": "authenticated"}}
R = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for mode in ("owner", "public"):
        for (vw, vh, tag) in ((390, 844, "mob"), (1280, 900, "desk")):
            ctx = b.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=2 if tag == "mob" else 1, locale="de-DE", timezone_id="Europe/Berlin",
                                color_scheme="dark" if (mode == "owner" and tag == "desk") else "light")
            if mode == "owner":
                ctx.add_init_script(f"localStorage.setItem('sb-mkcaioabbzccawjmtndw-auth-token', {json.dumps(json.dumps(SESSION))}); localStorage.setItem('hl:seen:v1', String(Date.now() - 4*3600e3));" + ("" if tag == "mob" else "localStorage.setItem('hl:welcome:v1', '1');"))
            ctx.route("**/*.supabase.co/**", route)
            pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
            pre = f"{mode}-{tag}"
            def scrolls(name, n=3):
                # Innen scrollende Bildschirme Stück für Stück aufnehmen
                for k in range(1, n + 1):
                    pg.evaluate("(k) => { const els = [...document.querySelectorAll('div')].filter(e => e.scrollHeight > e.clientHeight + 20 && getComputedStyle(e).overflowY !== 'visible' && e.clientHeight > 300); const el = els[els.length - 1]; if (el) el.scrollTop = k * el.clientHeight * 0.85; }", k)
                    pg.wait_for_timeout(300)
                    pg.screenshot(path=str(SHOTS / f"{pre}-{name}-{k}.png"))
            def shot(name, path=None, wait=1200, full=False):
                if path is not None: pg.goto(f"http://127.0.0.1:{PORT}{path}")
                pg.wait_for_timeout(wait)
                pg.screenshot(path=str(SHOTS / f"{pre}-{name}.png"), full_page=full)
            if mode == "public":
                # Die Web-Fassung ist privat: ohne Anmeldung nur der Anmeldebildschirm
                shot("gate", "/news", 2500)
                R[f"{pre} gate"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:200]
                R[f"{pre} errors"] = errs[:5]
                ctx.close(); continue
            if mode == "owner" and tag == "mob":
                # Erster Start: Einführung erscheint, drei Seiten, dann zurück zur Lage
                pg.goto(f"http://127.0.0.1:{PORT}/"); pg.wait_for_timeout(2500)
                shot("welcome1", None, 300)
                R[f"{pre} welcome"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:160]
                pg.get_by_text("Weiter", exact=True).click(); pg.wait_for_timeout(700); shot("welcome2", None, 200)
                pg.get_by_text("Weiter", exact=True).click(); pg.wait_for_timeout(700); shot("welcome3", None, 200)
                pg.get_by_text("Los geht’s", exact=True).click(); pg.wait_for_timeout(900)
                R[f"{pre} after welcome"] = pg.evaluate("[location.pathname, localStorage.getItem('hl:welcome:v1')]")
            shot("lage", "/", 2500)
            if tag == "mob": scrolls("lage", 4)
            R[f"{pre} lage text"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:400]
            shot("news", "/news", 1500)
            R[f"{pre} news text"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:300]
            if mode == "owner":
                shot("news-items", None, 100)
                shot("story", f"/item/{6173 + 100000}", 1500)
                R[f"{pre} story text"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:700]
                if tag == "mob": scrolls("story", 2)
                pg.get_by_label("Merken", exact=True).first.click(); pg.wait_for_timeout(400)
                shot("saved", "/news?mode=saved", 1500)
                R[f"{pre} saved text"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:200]
                shot("place", "/place/assab", 1500)
                R[f"{pre} place text"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:500]
                if tag == "mob": scrolls("place", 2)
                for k in ("fires", "internet", "sea", "quakes"):
                    shot(f"signal-{k}", f"/signal/{k}", 1200)
                R[f"{pre} signal fires"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:300]
                shot("search0", "/search", 1200)
                pg.keyboard.type("Djibouti"); pg.wait_for_timeout(600)
                shot("search", None, 200)
                R[f"{pre} search text"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:300]
                shot("news-filter", "/news", 1500)
                pg.get_by_text("Filter", exact=True).click(); pg.wait_for_timeout(400)
                shot("news-filter-open", None, 200)
                shot("item-toast", f"/item/{6173 + 100000}", 1500)
                pg.get_by_label("Nicht mehr merken", exact=True).first.click(); pg.wait_for_timeout(350)
                shot("item-toast", None, 50)
                R[f"{pre} toast"] = pg.evaluate("document.body.innerText.includes('Nicht mehr gemerkt')")
                shot("places", "/places", 1200)
                R[f"{pre} places text"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:300]
            if mode == "owner":
                shot("claims", "/claims")
                shot("claim", "/claim/4")
                if tag == "mob": scrolls("claim", 2)
                R[f"{pre} claim text"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:500]
                shot("form", "/claim-form?mode=edit&id=4")
                shot("report", "/report/2026-10-11")
            shot("map", "/map", 1500)
            # Markierung antippen: Assab
            box = pg.evaluate("(() => { const s = [...document.querySelectorAll('svg')].find(x => x.getAttribute('viewBox') && x.getBoundingClientRect().width > 300); const r = s.getBoundingClientRect(); return [r.x, r.y, r.width, r.height, s.getAttribute('viewBox')]; })()")
            R[f"{pre} map box"] = box
            # Zoomen mit dem Mausrad über Asmara, dann eine Markierung antippen
            pg.mouse.move(box[0] + box[2] * 0.45, box[1] + box[3] * 0.35)
            for _ in range(3): pg.mouse.wheel(0, -200); pg.wait_for_timeout(250)
            pg.wait_for_timeout(600)
            R[f"{pre} map zoomed viewBox"] = pg.evaluate("(() => { const s = [...document.querySelectorAll('svg')].find(x => x.getAttribute('viewBox') && x.getBoundingClientRect().width > 300); return s.getAttribute('viewBox'); })()")
            shot("map-zoom", None, 200)
            # Ziehen verschiebt den Ausschnitt
            pg.mouse.move(box[0] + box[2] * 0.5, box[1] + box[3] * 0.5); pg.mouse.down(); pg.mouse.move(box[0] + box[2] * 0.3, box[1] + box[3] * 0.4, steps=8); pg.mouse.up()
            pg.wait_for_timeout(500)
            R[f"{pre} map dragged viewBox"] = pg.evaluate("(() => { const s = [...document.querySelectorAll('svg')].find(x => x.getAttribute('viewBox') && x.getBoundingClientRect().width > 300); return s.getAttribute('viewBox'); })()")
            pg.get_by_label("Ganze Karte").click(); pg.wait_for_timeout(500)
            shot("satellite", "/satellite", 2500)
            shot("more", "/more")
            if mode == "owner" and tag == "mob":
                # Abmelden: danach darf nichts Privates mehr im Speicher oder auf dem Bildschirm sein
                pg.get_by_text("Abmelden", exact=True).click(); pg.wait_for_timeout(1500)
                R[f"{pre} after logout keys"] = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('hl:cache') || k.includes('auth-token'))")
                R[f"{pre} after logout screen"] = pg.evaluate("document.body.innerText").replace("\n", " | ")[:120]
            if mode == "public": shot("login", "/login")
            R[f"{pre} errors"] = errs[:5]
            ctx.close()
    b.close()
srv.shutdown()
R["calls"] = sorted(set(c[1] for c in calls))
for k, v in R.items(): print(k, ":", v)
