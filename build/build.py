# Baut aus web/src die private Claude-Seite (web/artifact.html) und die öffentliche Fassung (public/).
#   python3 build.py
import json, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "web" / "src"
BUILD = ROOT / "build"

css = (SRC / "styles.css").read_text()
js = (SRC / "app.js").read_text()
de_data = json.loads((SRC / "de_data.json").read_text())
shell = (SRC / "shell.html").read_text()
m = json.loads((BUILD / "map.json").read_text())
regions = json.loads((BUILD / "regions.json").read_text())

def make_js(public: bool) -> str:
    out = js.replace("__CONFIG__", json.dumps({"public": public}))
    out = out.replace("__MAP__", json.dumps({k: m[k] for k in ("width", "height", "scale", "translate")}))
    out = out.replace("__MAP_COUNTRIES__", json.dumps([{"n": c["name"], "d": c["d"]} for c in m["countries"]]))
    out = out.replace("__MAP_REGIONS__", json.dumps(regions))
    # Die öffentliche Fassung bekommt nur Texte, die sie auch zeigen darf (keine Behauptungen, keine privaten Ortstexte)
    texts = dict(de_data["public"]) if public else {**de_data["public"], **de_data["private"]}
    out = out.replace("__DE_DATA__", json.dumps(texts, ensure_ascii=False))
    for marker in ("__CONFIG__", "__MAP__", "__MAP_COUNTRIES__", "__MAP_REGIONS__", "__DE_DATA__"):
        assert marker not in out, marker
    return out

def page(head: str, public: bool) -> str:
    return shell.replace("{{HEAD}}", head).replace("{{CSS}}", css).replace("{{JS}}", make_js(public))

# --- Private Seite (Claude-Artefakt): Titel zuerst, kein doctype; Schriften von Google Fonts erlaubt
private_head = """<title>Horn Lens</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;800&family=Noto+Sans+Ethiopic:wght@400;600&display=swap" rel="stylesheet">"""
(ROOT / "web" / "artifact.html").write_text(page(private_head, False))

# --- Öffentliche Fassung: eigenes HTML-Dokument, Schriften vom eigenen Server (keine Verbindung zu Google)
PUB = ROOT / "public"
(PUB / "fonts").mkdir(parents=True, exist_ok=True)
fs = BUILD / "node_modules" / "@fontsource"
LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
ETHIOPIC = "U+030E,U+1200-1399,U+2D80-2DDE,U+AB01-AB2E,U+1E7E0-1E7E6,U+1E7E8-1E7EB,U+1E7ED-1E7EE,U+1E7F0-1E7FE"
faces = []
for w in (400, 500, 600, 800):
    for sub, rng in (("latin", LATIN), ("latin-ext", LATIN_EXT)):
        name = f"public-sans-{sub}-{w}-normal.woff2"
        shutil.copy(fs / "public-sans" / "files" / name, PUB / "fonts" / name)
        faces.append(f'@font-face{{font-family:"Public Sans";font-style:normal;font-display:swap;font-weight:{w};src:url({name}) format("woff2");unicode-range:{rng}}}')
for w in (400, 600):
    name = f"noto-sans-ethiopic-ethiopic-{w}-normal.woff2"
    shutil.copy(fs / "noto-sans-ethiopic" / "files" / name, PUB / "fonts" / name)
    faces.append(f'@font-face{{font-family:"Noto Sans Ethiopic";font-style:normal;font-display:swap;font-weight:{w};src:url({name}) format("woff2");unicode-range:{ETHIOPIC}}}')
(PUB / "fonts" / "fonts.css").write_text("\n".join(faces) + "\n")

public_head = """<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Horn Lens – Eritrea und das Rote Meer, offene Daten</title>
<meta name="description" content="Messwerte, Satellitenbilder mit Aufnahmedatum und Schifffahrtsmeldungen vom Roten Meer rund um Eritrea. Powered by BELES.">
<link rel="stylesheet" href="fonts/fonts.css">
</head>
<body>"""
pub = page(public_head, True) + "\n</body>\n</html>\n"
(PUB / "index.html").write_text(pub)

legal = """<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>{title} – Horn Lens</title>
<link rel="stylesheet" href="fonts/fonts.css">
<style>body{{margin:0;background:#EDF0EE;color:#13262E;font:400 16px/1.6 "Public Sans",system-ui,sans-serif}}main{{max-width:720px;margin:0 auto;padding:40px 20px}}h1{{font-size:32px;letter-spacing:-.02em}}.todo{{background:#FFF4D6;border-left:4px solid #B26B00;padding:12px 16px}}</style>
</head><body><main><h1>{title}</h1>
<p class="todo"><b>Noch nicht ausgefüllt.</b> Diese Seite muss vor der Veröffentlichung mit den Angaben des Betreibers ersetzt werden.</p>
<p><a href="index.html">Zurück zu Horn Lens</a></p></main></body></html>
"""
# Platzhalter nur anlegen, solange niemand die Seiten ausgefüllt hat (ausgefüllte Fassungen bleiben unberührt)
for name, title in (("impressum.html", "Impressum"), ("datenschutz.html", "Datenschutz")):
    f = PUB / name
    if not f.exists() or "Noch nicht ausgefüllt" in f.read_text():
        f.write_text(legal.format(title=title))
(PUB / "robots.txt").write_text("User-agent: *\nAllow: /\n")
print("built", (ROOT / "web" / "artifact.html").stat().st_size, (PUB / "index.html").stat().st_size)
