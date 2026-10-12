# Rendert SVG-Dateien zu PNG (Chromium über Playwright). Aufruf: python3 src/render.py in.svg out.png breite [höhe]
import sys, pathlib
from playwright.sync_api import sync_playwright
def render(jobs):
    with sync_playwright() as p:
        b = p.chromium.launch()
        for svg, out, w, h in jobs:
            pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            src = pathlib.Path(svg).read_text()
            pg.set_content(f'<html><body style="margin:0;background:transparent">{src.replace("<svg", f"<svg width=\'{w}\' height=\'{h}\'", 1)}</body></html>')
            pg.screenshot(path=out, omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
            pg.close()
        b.close()
if __name__ == "__main__":
    w = int(sys.argv[3]); h = int(sys.argv[4]) if len(sys.argv) > 4 else w
    render([(sys.argv[1], sys.argv[2], w, h)])
