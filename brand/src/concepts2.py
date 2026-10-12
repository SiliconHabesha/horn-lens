import math
INK="#102A33"; PAPER="#EEF2F0"; TEAL="#4FB3B5"
def arc(cx,cy,r,a0,a1):
    p=lambda a:(cx+r*math.cos(math.radians(a)), cy+r*math.sin(math.radians(a)))
    (x0,y0),(x1,y1)=p(a0),p(a1); large=1 if (a1-a0)%360>180 else 0
    return f'M{x0:.1f} {y0:.1f} A{r} {r} 0 {large} 1 {x1:.1f} {y1:.1f}'
def svg(body,bg=INK): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="{bg}"/>{body}</svg>'
def brackets(gap=34, r=300, w=58, dot=58, dx=0, dy=0):
    a=f'<path d="{arc(512,512,r,90+gap,270-gap)}" fill="none" stroke="{PAPER}" stroke-width="{w}" stroke-linecap="round"/>'
    b=f'<path d="{arc(512,512,r,-90+gap,90-gap)}" fill="none" stroke="{PAPER}" stroke-width="{w}" stroke-linecap="round"/>'
    return svg(a+b+f'<circle cx="{512+dx}" cy="{512+dy}" r="{dot}" fill="{TEAL}"/>')
def ticks(r=300,w=46,tl=86,tw=34,angles=(200,320,80),fx=548,fy=540,dot=50):
    s=f'<circle cx="512" cy="512" r="{r}" fill="none" stroke="{PAPER}" stroke-width="{w}"/>'
    for a in angles:
        c,sn=math.cos(math.radians(a)),math.sin(math.radians(a))
        x0,y0=512+(r)*c,512+(r)*sn; x1,y1=512+(r-tl)*c,512+(r-tl)*sn
        s+=f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" stroke="{PAPER}" stroke-width="{tw}" stroke-linecap="round"/>'
    return svg(s+f'<circle cx="{fx}" cy="{fy}" r="{dot}" fill="{TEAL}"/>')
def lens2(r=300,w=58):
    # zwei Bögen ungleicher Länge (nicht spiegelgleich), Punkt leicht versetzt
    a=f'<path d="{arc(512,512,r,120,250)}" fill="none" stroke="{PAPER}" stroke-width="{w}" stroke-linecap="round"/>'
    b=f'<path d="{arc(512,512,r,-60,70)}" fill="none" stroke="{PAPER}" stroke-width="{w}" stroke-linecap="round"/>'
    return svg(a+b+f'<circle cx="512" cy="512" r="58" fill="{TEAL}"/>')
def focus(r=300,w=58):
    # Sucher: vier Ecken eines Kreises (Fokusrahmen) + Punkt
    s=''.join(f'<path d="{arc(512,512,r,a+18,a+72)}" fill="none" stroke="{PAPER}" stroke-width="{w}" stroke-linecap="round"/>' for a in (0,90,180,270))
    return svg(s+f'<circle cx="512" cy="512" r="58" fill="{TEAL}"/>')
C={"E_klammern":brackets(),"F_klammern_eng":brackets(gap=22,w=64,dot=64),"G_skala":ticks(),"H_boegen_versetzt":lens2(),"I_fokus":focus()}
for k,v in C.items(): open(f"out/{k}.svg","w").write(v)
