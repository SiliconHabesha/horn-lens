# Erzeugt App-Icon, Android-Icons, Startbild und Favicon aus einem SVG-Zeichen (Linse mit Meer).
import pathlib
from playwright.sync_api import sync_playwright
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets"
def mark(ring, sea, sky, dot, scale=1.0, cx=512, cy=512):
    r = 300 * scale; sw = 54 * scale; ri = r - sw / 2
    return f'''
  <defs><clipPath id="c"><circle cx="{cx}" cy="{cy}" r="{ri}"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect x="{cx-r}" y="{cy-r}" width="{2*r}" height="{2*r}" fill="{sky}"/>
    <rect x="{cx-r}" y="{cy+28*scale}" width="{2*r}" height="{r}" fill="{sea}"/>
    <rect x="{cx-r}" y="{cy+92*scale}" width="{2*r}" height="{14*scale}" fill="{sky}" opacity="0.18"/>
  </g>
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{ring}" stroke-width="{sw}"/>
  <circle cx="{cx+92*scale}" cy="{cy-96*scale}" r="{38*scale}" fill="{dot}"/>'''
def svg(body, bg=None, size=1024):
    rect = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1024 1024">{rect}{body}</svg>'
INK, PAPER, TEAL, TEAL_D, SUN = "#13262E", "#EDF0EE", "#4FB3B5", "#0F6E74", "#F2B33D"
files = {
  "icon.png": (svg(mark(PAPER, TEAL, INK, SUN), bg=INK), 1024),
  "android-icon-foreground.png": (svg(mark(PAPER, TEAL, INK, SUN, scale=0.62)), 1024),
  "android-icon-background.png": (svg("", bg=INK), 1024),
  "android-icon-monochrome.png": (svg(mark("#FFFFFF", "#FFFFFF", "none", "#FFFFFF", scale=0.62)), 1024),
  "splash-icon.png": (svg(mark(INK, TEAL_D, PAPER, SUN)), 1024),
  "splash-icon-dark.png": (svg(mark(PAPER, TEAL, "#0E1A1F", SUN)), 1024),
  "favicon.png": (svg(mark(PAPER, TEAL, INK, SUN, scale=1.45), bg=INK), 48),
}
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (s, px) in files.items():
        pg = b.new_page(viewport={"width": px, "height": px}, device_scale_factor=1)
        s2 = s.replace('width="1024" height="1024" viewBox', f'width="{px}" height="{px}" viewBox')
        pg.set_content(f'<html><body style="margin:0;background:transparent">{s2}</body></html>')
        pg.screenshot(path=str(OUT / name), omit_background=True, clip={"x": 0, "y": 0, "width": px, "height": px})
        pg.close()
    b.close()
print("ok")
