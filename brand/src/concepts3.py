import math
INK="#102A33"; PAPER="#EEF2F0"; TEAL="#4FB3B5"
def earc(cx,cy,rx,ry,a0,a1):
    p=lambda a:(cx+rx*math.cos(math.radians(a)), cy+ry*math.sin(math.radians(a)))
    (x0,y0),(x1,y1)=p(a0),p(a1)
    return f'M{x0:.1f} {y0:.1f} A{rx} {ry} 0 0 1 {x1:.1f} {y1:.1f}'
def mark(gap=24, rx=300, ry=300, w=64, dot=64, cap="round", bg=INK, fg=PAPER, dc=TEAL):
    a=f'<path d="{earc(512,512,rx,ry,90+gap,270-gap)}" fill="none" stroke="{fg}" stroke-width="{w}" stroke-linecap="{cap}"/>'
    b=f'<path d="{earc(512,512,rx,ry,-90+gap,90-gap)}" fill="none" stroke="{fg}" stroke-width="{w}" stroke-linecap="{cap}"/>'
    bgr=f'<rect width="1024" height="1024" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">{bgr}{a}{b}<circle cx="512" cy="512" r="{dot}" fill="{dc}"/></svg>'
C={"J_rund":mark(),"K_gerade":mark(cap="butt",gap=26),"L_oval":mark(rx=270,ry=320,gap=22),"M_dick":mark(w=84,dot=76,gap=28,rx=290,ry=290),"N_hell":mark(bg="#EEF2F0",fg="#102A33",dc="#0E6F75",w=72,dot=70)}
for k,v in C.items(): open(f"out/{k}.svg","w").write(v)
