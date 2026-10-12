# Semay (ሰማይ) – Markenzeichen und alle abgeleiteten Dateien aus einer Quelle erzeugen.
# Aufruf (aus brand/): python3 src/build.py
import math, pathlib, sys, io
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from render import render

ROOT = pathlib.Path(__file__).resolve().parents[2]
APP = ROOT / "app"
OUT = ROOT / "brand"
SVG = OUT / "svg"; PNG = OUT / "png"
SVG.mkdir(exist_ok=True); PNG.mkdir(exist_ok=True)

# Farben (Marke). Die App-Farben stehen in app/src/lib/theme.ts und stimmen damit überein.
TIEFSEE = "#13262E"   # Tinte, Hintergrund des App-Symbols
GISCHT = "#EDF0EE"    # Papier
LAGUNE = "#0F6E74"    # Akzent auf hellem Grund
LAGUNE_HELL = "#4FB3B5"  # Akzent auf dunklem Grund
NACHT = "#0E1A1F"     # Hintergrund dunkel

# ---- Zeichen: zwei Klammern um einen Punkt („in Klammern: wer sagt es“), Linsenform hochkant
def earc(cx, cy, rx, ry, a0, a1):
    p = lambda a: (cx + rx * math.cos(math.radians(a)), cy + ry * math.sin(math.radians(a)))
    (x0, y0), (x1, y1) = p(a0), p(a1)
    return f"M{x0:.2f} {y0:.2f} A{rx} {ry} 0 0 1 {x1:.2f} {y1:.2f}"

def mark_parts(cx=0, cy=0, s=1.0, small=False, fg=TIEFSEE, dot=LAGUNE):
    # Maße bezogen auf eine Linse mit Halbachsen 270 × 320; für kleine Größen dickere Striche
    rx, ry, gap = 270 * s, 320 * s, 22
    w = (96 if small else 72) * s
    r = (88 if small else 70) * s
    a = earc(cx, cy, rx, ry, 90 + gap, 270 - gap)
    b = earc(cx, cy, rx, ry, -90 + gap, 90 - gap)
    return (f'<path d="{a}" fill="none" stroke="{fg}" stroke-width="{w:.2f}" stroke-linecap="round"/>'
            f'<path d="{b}" fill="none" stroke="{fg}" stroke-width="{w:.2f}" stroke-linecap="round"/>'
            f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}" fill="{dot}"/>')

# Ausdehnung des Zeichens bei s=1 (mit Strichbreite): x ±306, y ±(320·sin(112°)+36)
HALF_W = 270 + 36
HALF_H = 320 * math.sin(math.radians(112)) + 36

def svg(w, h, body, bg=None, rx=0):
    b = f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{b}{body}</svg>'

def mark_svg(size=1024, fill=0.8, bg=None, fg=TIEFSEE, dot=LAGUNE, small=False, rx=0):
    s = (size * fill) / (2 * HALF_H)
    return svg(size, size, mark_parts(size / 2, size / 2, s, small, fg, dot), bg, rx)

# ---- Wortmarke aus Schibsted Grotesk ExtraBold als Pfade (keine Schrift nötig)
SG = APP / "node_modules/@expo-google-fonts/schibsted-grotesk"
NE = APP / "node_modules/@expo-google-fonts/noto-sans-ethiopic"
FONTS = {800: TTFont(SG / "800ExtraBold/SchibstedGrotesk_800ExtraBold.ttf"), 500: TTFont(SG / "500Medium/SchibstedGrotesk_500Medium.ttf"),
         "eth": TTFont(NE / "600SemiBold/NotoSansEthiopic_600SemiBold.ttf")}
FONT = FONTS[800]
UPM = FONT["head"].unitsPerEm
CAP = FONT["OS/2"].sCapHeight
def text_path(txt, size, x=0, baseline=0, tracking=-0.02, weight=800):
    F = FONTS[weight]; GS = F.getGlyphSet(); CMAP = F.getBestCmap()
    k = size / F["head"].unitsPerEm; UPMF = F["head"].unitsPerEm; pen = SVGPathPen(GS); cur = 0
    hmtx = F["hmtx"]
    for ch in txt:
        g = CMAP[ord(ch)]
        tp = TransformPen(pen, (k, 0, 0, -k, x + cur * k, baseline))
        GS[g].draw(tp)
        cur += hmtx[g][0] + tracking * UPMF
    return pen.getCommands(), (cur - tracking * UPMF) * k

def lockup(fg=TIEFSEE, dot=LAGUNE, sub=None, subcol=None, pad=0):
    # Zeichen so hoch wie Versalhöhe × 1,9, Abstand 0,55 Zeichenbreiten
    size = 200; cap = CAP * size / UPM
    mh = cap * 1.9; s = mh / (2 * HALF_H); mw = 2 * HALF_W * s
    gapx = mw * 0.34
    base = pad + mh / 2 + cap / 2
    d, tw = text_path("Semay", size, x=pad + mw + gapx, baseline=base)
    # Der Name in Ge'ez-Schrift, kleiner und leiser daneben
    gx = pad + mw + gapx + tw + size * 0.3
    d3, tw3 = text_path("ሰማይ", size * 0.68, x=gx, baseline=base, tracking=0, weight="eth")
    body = (mark_parts(pad + mw / 2, pad + mh / 2, s, False, fg, dot) + f'<path d="{d}" fill="{fg}"/>'
            + f'<path d="{d3}" fill="{fg}" fill-opacity="0.55"/>')
    w = pad * 2 + (gx - pad) + tw3; h = pad * 2 + mh
    if sub:
        ssz = 52; d2, tw2 = text_path(sub, ssz, x=pad + mw + gapx, baseline=pad + mh + ssz * 1.1, tracking=0, weight=500)
        body += f'<path d="{d2}" fill="{subcol or fg}" fill-opacity="0.72"/>'
        h += ssz * 1.5; w = max(w, pad * 2 + mw + gapx + tw2)
    return svg(round(w), round(h), body)

def write(name, content): (SVG / name).write_text(content); return SVG / name

files = {
    "zeichen.svg": mark_svg(1024, 0.86),
    "zeichen-dunkel.svg": mark_svg(1024, 0.86, fg=GISCHT, dot=LAGUNE_HELL),
    "zeichen-einfarbig.svg": mark_svg(1024, 0.86, fg="#000000", dot="#000000"),
    "app-symbol.svg": mark_svg(1024, 0.56, bg=TIEFSEE, fg=GISCHT, dot=LAGUNE_HELL),
    "logo.svg": lockup(),
    "logo-dunkel.svg": lockup(GISCHT, LAGUNE_HELL),
    "logo-mit-zusatz.svg": lockup(sub="Lagebild Horn von Afrika, powered by BELES"),
}
for k, v in files.items(): write(k, v)

# ---- Pixel-Dateien für App, Web und Läden
jobs = []
def job(svgtext, out, w, h=None):
    p = SVG / ("_tmp_" + pathlib.Path(out).stem + ".svg"); p.write_text(svgtext); jobs.append((p, str(out), w, h or w))

A = APP / "assets"; P = APP / "public"
job(mark_svg(1024, 0.56, bg=TIEFSEE, fg=GISCHT, dot=LAGUNE_HELL), A / "icon.png", 1024)
job(mark_svg(1024, 0.42, fg=GISCHT, dot=LAGUNE_HELL), A / "android-icon-foreground.png", 1024)
job(svg(1024, 1024, "", TIEFSEE), A / "android-icon-background.png", 1024)
job(mark_svg(1024, 0.42, fg="#FFFFFF", dot="#FFFFFF"), A / "android-icon-monochrome.png", 1024)
job(mark_svg(1024, 0.9), A / "splash-icon.png", 1024)
job(mark_svg(1024, 0.9, fg=GISCHT, dot=LAGUNE_HELL), A / "splash-icon-dark.png", 1024)
job(mark_svg(96, 0.86, fg="#FFFFFF", dot="#FFFFFF", small=True), A / "notification-icon.png", 96)
job(mark_svg(48, 0.7, bg=TIEFSEE, fg=GISCHT, dot=LAGUNE_HELL, small=True, rx=10), A / "favicon.png", 48)
job(mark_svg(180, 0.6, bg=TIEFSEE, fg=GISCHT, dot=LAGUNE_HELL), P / "apple-touch-icon.png", 180)
job(mark_svg(192, 0.56, bg=TIEFSEE, fg=GISCHT, dot=LAGUNE_HELL), P / "icon-192.png", 192)
job(mark_svg(512, 0.56, bg=TIEFSEE, fg=GISCHT, dot=LAGUNE_HELL), P / "icon-512.png", 512)
job(mark_svg(512, 0.44, bg=TIEFSEE, fg=GISCHT, dot=LAGUNE_HELL), P / "icon-maskable-512.png", 512)
for n, sz in (("ico16", 16), ("ico32", 32), ("ico48", 48)):
    job(mark_svg(sz, 0.74, bg=TIEFSEE, fg=GISCHT, dot=LAGUNE_HELL, small=True, rx=sz * 0.2), PNG / f"{n}.png", sz)
# Vorschaubild für geteilte Links (1200 × 630)
lk = lockup(GISCHT, LAGUNE_HELL)
import re
vw, vh = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', lk).groups())
inner = re.sub(r"^<svg[^>]*>|</svg>$", "", lk)
sc = min(760 / vw, 300 / vh)
og = svg(1200, 630, f'<g transform="translate({(1200 - vw * sc) / 2:.1f} {(630 - vh * sc) / 2 - 30:.1f}) scale({sc:.4f})">{inner}</g>'
, TIEFSEE)
sub_d, sub_w = text_path("Lagebild Horn von Afrika. Derselbe Himmel, alle Seiten.", 34, x=0, baseline=0, tracking=0, weight=500)
og = og.replace("</svg>", f'<path d="{sub_d}" transform="translate({(1200 - sub_w) / 2:.1f} {630 / 2 + vh * sc / 2 + 40:.1f})" fill="{GISCHT}" fill-opacity="0.7"/></svg>')
job(og, P / "og.png", 1200, 630)
job(og, PNG / "teilen-1200x630.png", 1200, 630)
for name in ("logo", "logo-dunkel", "logo-mit-zusatz"):
    t = files[name + ".svg"]; vw2, vh2 = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', t).groups())
    job(t, PNG / f"{name}.png", round(vw2), round(vh2))
job(files["zeichen.svg"], PNG / "zeichen-1024.png", 1024)
job(files["zeichen-dunkel.svg"], PNG / "zeichen-dunkel-1024.png", 1024)
job(files["app-symbol.svg"], PNG / "app-symbol-1024.png", 1024)
render(jobs)
for p, *_ in jobs: p.unlink()
# iOS-Symbol und Hintergründe ohne Transparenz
for f in (A / "icon.png", A / "android-icon-background.png", P / "apple-touch-icon.png", P / "icon-192.png", P / "icon-512.png", P / "icon-maskable-512.png", P / "og.png", PNG / "teilen-1200x630.png"):
    Image.open(f).convert("RGB").save(f)
Image.open(A / "favicon.png").save(A / "favicon.png")
ico = [Image.open(PNG / f"ico{n}.png").convert("RGBA") for n in (16, 32, 48)]
ico[2].save(P / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
print("fertig")
