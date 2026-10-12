import math
INK="#102A33"; PAPER="#EEF2F0"; TEAL="#4FB3B5"
def pt(a, r, c=512): return (c + r*math.cos(math.radians(a)), c + r*math.sin(math.radians(a)))
def fix_mark(fx, fy, angles, ring_r=300, ring_w=52, line_w=30, gap=78, dot=46, ext=0, line_col=PAPER, dot_col=TEAL, bg=INK):
    s=[f'<rect width="1024" height="1024" fill="{bg}"/>', f'<circle cx="512" cy="512" r="{ring_r}" fill="none" stroke="{PAPER}" stroke-width="{ring_w}"/>']
    for a in angles:
        x0,y0=pt(a, ring_r+ext)
        dx,dy=fx-x0,fy-y0; L=math.hypot(dx,dy); ux,uy=dx/L,dy/L
        x1,y1=fx-ux*gap, fy-uy*gap
        s.append(f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" stroke="{line_col}" stroke-width="{line_w}" stroke-linecap="round"/>')
    s.append(f'<circle cx="{fx}" cy="{fy}" r="{dot}" fill="{dot_col}"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">{"".join(s)}</svg>'
C = {
 "A_drei_peilungen": fix_mark(566, 548, [205, 330, 95]),
 "B_zwei_peilungen": fix_mark(560, 556, [200, 300]),
 "C_drei_aussen": fix_mark(566, 548, [205, 330, 95], ext=60, ring_w=40, line_w=26),
 "D_fix_oben": fix_mark(548, 470, [160, 20, 250], dot=50),
}
for k,v in C.items(): open(f"out/{k}.svg","w").write(v)
print(list(C))
