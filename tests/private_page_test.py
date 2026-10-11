# Prüft die private Seite (web/artifact.html) mit nachgebautem Supabase-Konnektor und Test-Daten.
# Aufruf aus dem Projektordner: python3 tests/private_page_test.py  (braucht Playwright mit Chromium und Pillow)
# Bilder landen in tests/out/. Es werden keine echten Daten gelesen oder geschrieben.
import json, pathlib, io, base64, time
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
def fake(shift):
    im = Image.new("RGB", (800, 800), (190, 168, 128)); d = ImageDraw.Draw(im)
    d.rectangle([0, 540, 800, 800], fill=(40, 86, 112))
    for k in range(6): d.rectangle([120 + k * 80 + shift, 200, 160 + k * 80 + shift, 470], fill=(232, 232, 226))
    b = io.BytesIO(); im.save(b, "WEBP"); return b.getvalue()
raw = {1: fake(0), 2: fake(30), 3: fake(60)}
b64 = {k: base64.b64encode(v).decode() for k, v in raw.items()}
now = time.time()
iso = lambda h: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now - h * 3600))
src = lambda i, n, t, k="rss", ok=0.5, newest=1: {"id": i, "name": n, "kind": k, "source_type": t, "homepage": "https://example.org", "stance_note": "Test note", "last_ok_at": iso(ok) if ok is not None else None, "last_fetch_at": iso(min(ok or 0.5, 0.5)), "last_error": None, "last_item_count": 3, "newest_item_at": iso(newest) if newest is not None else None}
sources = [src("shabait", "Test Gov ER (Ministry)", "government_er"), src("awate", "Test Exile", "exile"), src("fana", "Test ET state", "progov_et"),
           src("tghat", "Test Tigray", "tigray", newest=24 * 200), src("dw", "Test Intl", "international"), src("hrw", "Test NGO", "un_ngo"),
           {**src("erena", "Test Blocked", "exile", ok=None, newest=None), "last_error": "HTTP 403"},
           src("firms", "Test FIRMS", "measurement", "firms", newest=None), src("ukmto", "Test UKMTO", "maritime_authority", "ukmto", newest=None),
           src("usgs", "Test USGS", "measurement", "usgs", ok=10, newest=None), src("ioda", "Test IODA", "measurement", "ioda", newest=None)]
it = lambda i, t, regs, s, sid, st, h, lang="en": {"id": i, "title": t, "url": f"https://example.org/{i}", "language": lang, "regions": regs, "origin_domain": None, "published_at": iso(h), "fetched_at": iso(h), "source_id": sid, "source_name": s, "source_type": st}
items = [it(1, "Test headline about Eritrea one", ["eritrea"], "Test Intl", "dw", "international", 1),
         it(2, "ሓበሬታ ፈተነ ኣርእስቲ", ["eritrea"], "Test Gov ER (Ministry)", "shabait", "government_er", 2, "ti"),
         it(3, "Test exile report on Eritrea", ["eritrea", "tigray"], "Test Exile", "awate", "exile", 3),
         it(4, "Test Tigray report", ["tigray"], "Test Tigray", "tghat", "tigray", 4),
         it(5, "Test Red Sea shipping", ["red_sea"], "Test Intl", "dw", "international", 5),
         it(6, "عنوان تجريبي", ["eritrea"], "Test Intl", "dw", "international", 6, "ar"),
         {**it(7, "Test headline about Eritrea one", ["eritrea"], "Test Intl", "dw", "international", 7), "url": "https://example.org/7"}]
ev = lambda h, st, note, srcs, adm=False: {"at": iso(h), "status": st, "note": note, "source_title": srcs[0][0] if srcs else None, "source_url": srcs[0][1] if srcs else None, "extra": [{"title": a, "url": b} for a, b in srcs[1:]], "admission": adm}
claims = [{"id": 7, "statement": "Test claim likely.", "claimant": "Test monitor", "disputed_by": "Test side denies", "region": "eritrea", "status": "likely", "party_claim": False, "first_reported": "2026-10-07", "updated_at": iso(2),
           "events": [ev(2, "likely", "Test note two.", [("Test A", "https://example.org/a"), ("Test B", "https://example.com/b")]), ev(30, "unconfirmed", "Earlier note.", [("Test C", "https://example.org/c")])]},
          {"id": 2, "statement": "Test claim downgraded.", "claimant": "Both", "disputed_by": None, "region": "eritrea", "status": "unconfirmed", "party_claim": False, "first_reported": "2026-10-01", "updated_at": iso(3),
           "events": [ev(1, "unconfirmed", "Downgraded without new links.", []), ev(3, "confirmed", "Test.", [("Test D", "https://example.org/d")], True)]}]
alerts = [{"kind": "maritime", "t": iso(5), "title": "Test sea incident (UKMTO #1)", "note": "Test note.", "url": "https://example.org/u", "source": "UKMTO"}]
core = {"now": iso(0), "sources": sources, "reports": [{"report_date": "2026-10-09", "generated_at": iso(16), "has_summary": False}], "items": items,
        "signals": {"quakes": [], "maritime": [{"t": iso(5), "lat": 12.5, "lon": 43.4, "title": "Test sea incident (UKMTO #1)", "url": "https://example.org/u"}],
                    "outages": []}, "alerts": alerts, "claims": claims}
fires = {"total": 1700, "rows": [[14.1 + i * 0.01, 37.9 + i * 0.02, int(now - 3600 * (i % 20)), "N21", 3.5] for i in range(60)]}
sat = [{"id": "assab-airfield", "name": "Test Assab airfield", "country": "Eritrea", "why": "Test why.", "lat": 13.07, "lon": 42.645, "half_km": 4.5,
        "images": [[3, int(now - 86400 * 2), 0.1, "S2C_TEST_A", len(raw[3])], [2, int(now - 86400 * 360), 0.3, "S2B_TEST_B", len(raw[2])], [1, 1603190000, 0.0, "S2A_TEST_C", len(raw[1])]]}]
report = {"report_date": "2026-10-09", "generated_at": iso(16), "window_start": iso(40), "window_end": iso(16),
          "payload": {"regions": [{"region": "eritrea", "items": items[:2]}, {"region": "tigray", "items": [items[3]]}, {"region": "afar", "items": []}, {"region": "red_sea", "items": [items[4]]}, {"region": "ethiopia", "items": []}, {"region": "horn", "items": []}],
                      "changes": [], "signals": {"fires_24h": 300, "quakes_7d": 1, "maritime_30d": 2, "outages_48h": 1}, "alerts": []},
          "summary": None}
saved = {"sentences": [{"text": "Test saved summary sentence.", "cites": [{"n": 1, "title": "Test headline", "outlet": "Test Intl", "url": "https://example.org/1"}]}], "saved_at": iso(0)}
mock = """<script>
const B64 = %s, CORE = %s, FIRES = %s, SAT = %s, REPORT = %s, SAVED = %s; window.SQLS = []; window.STATE = { saved: false, noMcp: %s, reportDelay: 0 };
const wrap = (v) => ({ payload: { result: 'x <untrusted-data-1>\\n' + JSON.stringify([{ data: v }]) + '\\n</untrusted-data-1> y' } });
const smp = async () => ({ text: '' });
smp.json = async (p) => p.includes('Translate') ? [{ id: 2, en: "Test translated headline" }, { id: 6, en: "Test Arabic translated" }, { id: 999, en: "INJECTED" }]
  : { sentences: [{ text: "Test live summary.", cites: [1, 2, 99, 1.5] }, { text: "Uncited vanishes.", cites: [] }] };
const mcp = { callTool: async (s, t, { query }) => {
  window.SQLS.push(query);
  const m = query.match(/substr\\(.*?, (\\d+), (\\d+)\\) as data .* id = (\\d+)/s);
  if (m) return wrap(B64[m[3]].substr(Number(m[1]) - 1, Number(m[2])));
  if (query.includes("kind = 'fire'") && query.includes('json_build_array')) return wrap(FIRES);
  if (query.includes('from public.sat_places')) return wrap(SAT);
  if (query.includes('from public.reports where report_date')) {
    if (window.STATE.reportDelay) await new Promise((r) => setTimeout(r, window.STATE.reportDelay));
    return wrap({ ...REPORT, summary: window.STATE.saved ? SAVED : null });
  }
  if (query.includes('REJECTME')) throw { code: 'tool_error', message: 'Failed to run sql query: ERROR:  P0001: confirmed needs two independent sources on two different websites, or an admission by the side concerned\\nCONTEXT:  PL/pgSQL function' };
  if (query.includes('AMBIGUOUS')) throw { code: 'upstream_error', message: 'shell timeout', retryable: true };
  if (query.includes('report_save_summary')) { window.STATE.saved = true; return wrap(''); }
  if (query.includes('select public.claim')) return wrap('');
  return wrap(CORE);
} };
window.claude = { use: async (n) => n === 'sample' ? smp : n === 'mcp' ? (window.STATE.noMcp ? null : mcp) : null };
window.fetch = async (u) => { window.SQLS.push('FETCH ' + u); throw new TypeError('Failed to fetch'); };
</script>"""
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "tests" / "out"; OUT.mkdir(parents=True, exist_ok=True)
art = (ROOT / "web" / "artifact.html").read_text()
def page(no_mcp=False):
    m = mock % (json.dumps(b64), json.dumps(core), json.dumps(fires), json.dumps(sat), json.dumps(report), json.dumps(saved), "true" if no_mcp else "false")
    html = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + art + "</body></html>"
    out = html.replace("<script>\n\"use strict\";", m + "<script>\n\"use strict\";", 1)
    assert m in out
    return out
R = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    pg.set_content(page()); pg.wait_for_timeout(2000)
    txt = lambda sel: pg.evaluate(f"document.querySelector({json.dumps(sel)})?.textContent || ''")
    R["errors"] = errs[:3]
    import os
    if os.environ.get("SHOTS"): pg.screenshot(path=os.environ["SHOTS"] + "/ov.png", full_page=True); pg.click("#tab-news"); pg.wait_for_timeout(900); pg.screenshot(path=os.environ["SHOTS"] + "/news.png"); pg.click("#tab-overview"); pg.wait_for_timeout(900)
    R["hero has Berlin"] = "Berliner Zeit" in txt("#eritrea .when")
    R["signals"] = pg.evaluate("[...document.querySelectorAll('#signals > div')].map(d => d.textContent)")
    R["map key"] = pg.evaluate("[...document.querySelectorAll('.mapkey li')].map(d => d.textContent)")
    R["duplicate shown once"] = pg.evaluate("[...document.querySelectorAll('#eritrea ol.items a.title')].filter(a => a.textContent === 'Test headline about Eritrea one').length")
    R["who colour var"] = pg.evaluate("getComputedStyle(document.querySelector('#eritrea ol.items .who')).color")
    R["aside stale"] = [t for t in pg.evaluate("[...document.querySelectorAll('aside li .s')].map(d => d.textContent)") if "newest" in t]
    R["footer"] = pg.evaluate("[...document.querySelectorAll('footer p')].map(p => p.textContent)")[1:4]
    R["evidence (downgraded claim)"] = pg.evaluate("[...document.querySelectorAll('#claims .ev')].map(p => p.textContent)")
    pg.click("text=Die letzten 24 Stunden zusammenfassen"); pg.wait_for_timeout(300)
    R["ai"] = pg.evaluate("[...document.querySelectorAll('#eritrea .ai .out p')].map(p=>p.textContent)")
    pg.click("button:has-text('ins Deutsche übersetzen')"); pg.wait_for_timeout(300)
    R["translations"] = pg.evaluate("[...document.querySelectorAll('.tr')].map(p=>p.closest('li').dataset.id + ':' + p.textContent)")
    # Regel: zwei Links derselben Website reichen nicht
    pg.click("#tab-claims"); pg.wait_for_timeout(100)
    R["tab claims visible"] = pg.evaluate("!document.getElementById('view-claims').hidden && document.getElementById('view-overview').hidden")
    pg.click("#claims ol.claimlist > li:first-child button:has-text('Status ändern')"); pg.wait_for_timeout(200)
    f = "#claims ol.claimlist > li:first-child form"
    pg.select_option(f + " select", "confirmed"); pg.fill(f + " textarea", "Test note for rule")
    pg.fill(f + " input[type=url] >> nth=0", "https://example.org/x"); pg.fill(f + " input:not([type]) >> nth=0", "Test X")
    pg.fill(f + " input[type=url] >> nth=1", "https://www.example.org/y"); pg.fill(f + " input:not([type]) >> nth=1", "Test Y")
    pg.click(f + " button[type=submit]"); pg.wait_for_timeout(200)
    R["same-site rule"] = txt(f + " .err")
    pg.fill(f + " input[type=url] >> nth=1", "https://example.com/y"); pg.fill(f + " textarea", "REJECTME please")
    pg.click(f + " button[type=submit]"); pg.wait_for_timeout(300)
    R["server rule text"] = txt(f + " .err")
    pg.fill(f + " textarea", "AMBIGUOUS case")
    pg.click(f + " button[type=submit]"); pg.wait_for_timeout(300)
    R["ambiguous text"] = txt(f + " .err")
    pg.wait_for_timeout(2500)
    # Tagesbericht: schneller Wechsel zurück auf Live gewinnt
    pg.evaluate("window.STATE.reportDelay = 600")
    R["glance cards"] = pg.evaluate("[...document.querySelectorAll('#glance .gl b')].map(b => b.textContent)")
    pg.click("#tab-overview"); pg.wait_for_timeout(100)
    pg.click("#glance a[href='#news']"); pg.wait_for_timeout(100)
    R["glance -> news tab"] = pg.evaluate("!document.getElementById('view-news').hidden")
    pg.click(".chips a[href='#afar']"); pg.wait_for_timeout(1200)
    R["chip afar in view"] = pg.evaluate("[Math.round(document.getElementById('afar').getBoundingClientRect().top), scrollY, document.documentElement.scrollHeight - innerHeight]")
    pg.click("footer a[href='#method']"); pg.wait_for_timeout(100)
    R["footer -> about tab"] = pg.evaluate("!document.getElementById('view-about').hidden")
    pg.click("#tab-overview"); pg.wait_for_timeout(100)
    pg.click(".modebar button:has-text('Tagesbericht')"); pg.wait_for_timeout(50)
    pg.click(".modebar button:has-text('Live')"); pg.wait_for_timeout(1000)
    R["race ends live"] = "Live-Ansicht" in txt("#eritrea .when")
    pg.evaluate("window.STATE.reportDelay = 0")
    pg.click(".modebar button:has-text('Tagesbericht')"); pg.wait_for_timeout(500)
    pg.click("text=Diesen Bericht zusammenfassen"); pg.wait_for_timeout(300)
    pg.click("text=Im Tagesbericht speichern"); pg.wait_for_timeout(800)
    R["saved summary shown"] = pg.evaluate("[...document.querySelectorAll('#eritrea .ai h3')].map(h => h.textContent)")
    R["saved cite"] = pg.evaluate("[...document.querySelectorAll('#eritrea .ai .out a')].map(a => a.textContent)")
    pg.screenshot(path=str(OUT / "priv-report.png"), full_page=False)
    R["errors after"] = errs[:3]
    m2 = b.new_page(viewport={"width": 390, "height": 900}, color_scheme="dark")
    e2 = []; m2.on("pageerror", lambda e: e2.append(str(e)))
    m2.set_content(page()); m2.wait_for_timeout(2000)
    if os.environ.get("SHOTS"): m2.screenshot(path=os.environ["SHOTS"] + "/mob.png")
    R["mobile scrollWidth"] = m2.evaluate("document.documentElement.scrollWidth")
    R["mobile errors"] = e2[:3]
    m2.screenshot(path=str(OUT / "priv-mobile.png"), full_page=True)
    n = b.new_page(viewport={"width": 900, "height": 700})
    n.set_content(page(no_mcp=True)); n.wait_for_timeout(1500)
    R["no mcp message"] = n.evaluate("document.querySelector('#main').textContent")[:140]
    R["no mcp fetch attempts"] = [q for q in n.evaluate("window.SQLS") if q.startswith("FETCH")]
    b.close()
for k, v in R.items(): print(f"{k}: {v}")
