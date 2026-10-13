# Prüft die Ergänzungen vom 13.10.2026 (Master-Prompt) in der Web-Fassung, mit denselben Testdaten wie app_test.py.
# Jede Prüfung ist ein Ja/Nein; bei einem Nein endet das Skript mit Fehlercode 1.
# Vorher: cd app && npm run web:build      Aufruf: python3 tests/features_test.py
import json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.argv = [sys.argv[0], str(ROOT / "tests" / "out" / "features")]
# Testdaten, nachgebautes Supabase und Webserver aus app_test.py übernehmen (alles vor der Anmeldung)
src = (ROOT / "tests" / "app_test.py").read_text(encoding="utf-8")
exec(compile(src[: src.index("SESSION = ")], "app_test.py", "exec"))

OK = {}
def check(name, cond, info=""):
    OK[name] = bool(cond)
    print(("ok   " if cond else "FAIL ") + name + (f"  ({info})" if info and not cond else ""))

text = lambda pg: pg.evaluate("document.body.innerText")
def page(b, w=390, h=844, data=None, lang="de", status=200):
    ctx = b.new_context(viewport={"width": w, "height": h}, locale="de-DE", timezone_id="Europe/Berlin")
    ctx.add_init_script(f"localStorage.setItem('hl:seen:v1', String(Date.now() - 4*3600e3)); localStorage.setItem('hl:welcome:v1', '1'); localStorage.setItem('hl:lang', '{lang}');")
    def r2(r):
        path = r.request.url.split(".supabase.co")[1]
        if path.startswith("/rest/v1/rpc/app_public") and (data is not None or status != 200):
            return r.fulfill(status=status, headers={"content-type": "application/json", "access-control-allow-origin": "*"},
                             body=json.dumps(data if status == 200 else {"message": "boom"}))
        return route(r)
    ctx.route("**/*.supabase.co/**", r2)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    return ctx, pg, errs
go = lambda pg, path, wait=1600: (pg.goto(f"http://127.0.0.1:{PORT}{path}"), pg.wait_for_timeout(wait))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs = page(b)
    # Lage: Zeitraum, Informationslücken, Behauptungen im Zeitraum
    go(pg, "/", 2500)
    t = text(pg)
    check("Lage: Zeitraum-Knöpfe 24 Std./72 Std./7 Tage", all(x in t for x in ("24 Std.", "72 Std.", "7 Tage")))
    check("Lage: Abschnitt „Was wir nicht sehen“", "Was wir nicht sehen" in t)
    check("Lage: gestörte Quelle als Lücke genannt", "Radio Erena" in t)
    pg.get_by_text("7 Tage", exact=True).first.click(); pg.wait_for_timeout(600)
    t = text(pg)
    check("Lage: 7 Tage wirkt auf die Sätze", "in 7 Tagen" in t, t[:300])
    pg.screenshot(path=str(SHOTS / "lage-7d.png"))
    # Meldungen: neue Filter
    go(pg, "/news")
    pg.get_by_label("Filter", exact=True).click(); pg.wait_for_timeout(400)
    t = text(pg)
    for label in ("Art des Ereignisses", "Quelle", "Sprache der Originalmeldung", "7 Tage", "Nur Geschichten, über die Medien verschiedener Art berichten"):
        check(f"Meldungen: Filter „{label}“", label in t)
    pg.screenshot(path=str(SHOTS / "news-filters.png"), full_page=True)
    # Art „Grenze“ wählen: nur passende Meldungen
    btn = pg.get_by_text("Gefechte und Angriffe", exact=True)
    if btn.count():
        btn.first.click(); pg.wait_for_timeout(500)
        check("Meldungen: Filter nach Art zeigt Zusammenfassung", "Gefechte und Angriffe" in text(pg))
    # Karte: erwähnte Orte, Abspielen, Genauigkeit
    go(pg, "/map", 2000)
    pg.get_by_label("Ebenen und Zeitraum").click(); pg.wait_for_timeout(400)  # am Handy eingeklappt
    t = text(pg)
    check("Karte: Ebene „Erwähnte Orte“", "Erwähnte Orte" in t)
    check("Karte: Genauigkeit erklärt", "Wie genau die Orte sind" in t and "erwähnt, nicht verortet" in t)
    check("Karte: Ansicht Somalia", "Somalia und Somaliland" in t)
    pg.get_by_label("Die letzten 7 Tage abspielen").click(); pg.wait_for_timeout(300)
    check("Karte: Abspielen zeigt Tag 1 von 7", "Tag 1 von 7" in text(pg))
    pg.wait_for_timeout(1800)
    check("Karte: Abspielen schreitet fort", "Tag 2 von 7" in text(pg) or "Tag 3 von 7" in text(pg))
    pg.get_by_label("Anhalten").click()
    pg.screenshot(path=str(SHOTS / "map-play.png"))
    # Satellit: nebeneinander, Zeiten, Copernicus-Link
    go(pg, "/satellite", 2500)
    pg.get_by_text("Nebeneinander", exact=True).click(); pg.wait_for_timeout(800)
    t = text(pg)
    check("Satellit: Nebeneinander zeigt Vorher und Nachher", "Vorher ·" in t and "Nachher ·" in t)
    check("Satellit: Aufnahmezeit und Copernicus-Link", "Aufnahme" in t and "Im Copernicus Browser" in t)
    imgs = pg.evaluate("[...document.querySelectorAll('img')].filter(i => i.getBoundingClientRect().width > 100).length")
    check("Satellit: zwei Bilder nebeneinander", imgs >= 2, imgs)
    pg.screenshot(path=str(SHOTS / "satellite-side.png"))
    # Quellen: Zustände, Register, nicht eingerichtete Quellen
    go(pg, "/sources")
    t = text(pg)
    check("Quellen: Zustand „Zugang verweigert“ für HTTP 403", "Zugang verweigert" in t)
    check("Quellen: ReliefWeb und ACLED als nicht eingerichtet", "ReliefWeb" in t and "ACLED" in t and "Nicht eingerichtet" in t)
    pg.get_by_text("Shabait (Eritreisches Informationsministerium)", exact=False).first.click(); pg.wait_for_timeout(300)
    check("Quellen: Register klappt auf", "Schwerpunkt" in text(pg))
    # Behauptung: Nummer, Prüfdatum; Bearbeiten nur für den Betreiber
    go(pg, "/claim/4")
    t = text(pg)
    check("Behauptung: Nummer und Prüfdatum", "Nr. 4" in t and "zuletzt geprüft" in t)
    check("Behauptung: alte Stufe umbenannt", "Teilweise gestützt" in t)
    check("Zugriff: ohne Anmeldung kein „Stufe ändern“", "Stufe ändern" not in t)
    go(pg, "/claim-form?mode=add")
    check("Zugriff: Formular ohne Anmeldung gesperrt", "Nur für den Betreiber von Semay." in text(pg))
    # Was kursiert: automatische Einordnung statt Prüfstufen (Entscheidung 13.10.2026)
    go(pg, "/claims", 1800)
    t = text(pg)
    check("Was kursiert: Reiter und ehrlicher Hinweis", "Was kursiert" in t and "nicht, was in sozialen Netzwerken kursiert" in t)
    check("Was kursiert: Einordnungen sichtbar", any(k in t for k in ("Nur eine Quelle", "Nur eine Seite", "Bestritten", "Verschiedene Seiten", "Nur von außen berichtet")))
    check("Was kursiert: Archiv der alten Prüfungen verlinkt", "Archiv" in t)
    go(pg, "/", 2000)
    check("Lage: Hinweis „Semay prüft nichts selbst“", "Semay prüft nichts selbst" in text(pg))
    go(pg, "/item/1")
    check("Meldung: automatische Einordnung mit Hinweis", "Automatische Einordnung. Semay prüft nicht, ob es stimmt." in text(pg))
    # Meldung: Veröffentlichungs- und Abrufzeit getrennt
    go(pg, "/item/1")
    t = text(pg)
    check("Meldung: Veröffentlicht und abgerufen getrennt", "Veröffentlicht" in t and "abgerufen" in t)
    # Tastatur: mit Tab erreichbare Bedienelemente
    go(pg, "/", 2000)
    roles = []
    for _ in range(6):
        pg.keyboard.press("Tab"); roles.append(pg.evaluate("document.activeElement && (document.activeElement.getAttribute('role') || document.activeElement.tagName)"))
    check("Tastatur: Tab erreicht Knöpfe und Links", sum(1 for r in roles if r in ("button", "link", "A", "BUTTON", "radio", "tab")) >= 3, roles)
    # Handy: keine waagerechte Scrollleiste auf den Hauptseiten
    for path in ("/", "/news", "/claims", "/map", "/sources", "/satellite"):
        go(pg, path, 1300)
        over = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check(f"Handy 390 px: {path} ohne Querscrollen", over <= 1, over)
    check("Keine Fehler im Browser (öffentlich)", not errs, errs[:3])
    ctx.close()

    # Dünne Datenlage: keine verlässliche Zusammenfassung
    thin = {**owner_data, "reports": [], "items": items[:1]}
    ctx, pg, errs = page(b, data=thin)
    go(pg, "/", 2500)
    check("Dünne Daten: „Keine verlässliche Zusammenfassung möglich“", "Keine verlässliche Zusammenfassung möglich" in text(pg))
    pg.screenshot(path=str(SHOTS / "lage-thin.png"))
    ctx.close()
    # Server-Fehler: klare Meldung statt leerer Seite
    ctx, pg, errs = page(b, status=500)
    go(pg, "/", 3000)
    check("Server-Fehler: Hinweis statt leerer Seite", "Keine Verbindung" in text(pg) or "Erneut versuchen" in text(pg), text(pg)[:200])
    ctx.close()
    # Breiter Bildschirm und Englisch
    ctx, pg, errs = page(b, w=1280, h=900, lang="en")
    go(pg, "/", 2500)
    check("Englisch: Zeitraum-Knöpfe übersetzt", "7 days" in text(pg))
    go(pg, "/map", 2000)
    check("Englisch: Karte „mentioned, not located“", "mentioned, not located" in text(pg))
    check("Keine Fehler im Browser (Englisch, breit)", not errs, errs[:3])
    ctx.close()
    # Tigrinya: Vorschau, Schlagzeilen im Original
    ctx, pg, errs = page(b, lang="ti")
    go(pg, "/more", 1800)
    check("Tigrinya: als Vorschau gekennzeichnet", "ቅድመ-ርእይቶ" in text(pg))
    go(pg, "/news", 1800)
    check("Tigrinya: Schlagzeilen im Original", "Eritrean troops reported near Adigrat" in text(pg) or "At least 139" in text(pg))
    check("Keine Fehler im Browser (Tigrinya)", not errs, errs[:3])
    ctx.close()
    b.close()
srv.shutdown()
bad = [k for k, v in OK.items() if not v]
print(f"\n{len(OK) - len(bad)} von {len(OK)} Prüfungen bestanden")
sys.exit(1 if bad else 0)
