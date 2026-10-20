from pathlib import Path
import math
try:import ezdxf
except ImportError:ezdxf=None
P=Path(__file__).resolve().parent
mic=[(x,y,4.2) for x in (-33,33) for y in (-33,33)]
vent=[]
for a in (45,135,225,315):
 for da in (-8,8):
  t=math.radians(a+da);vent.append((44*math.cos(t),44*math.sin(t),1.65))
S=['<?xml version="1.0" encoding="UTF-8"?>','<svg xmlns="http://www.w3.org/2000/svg" width="112mm" height="112mm" viewBox="0 0 112 112">',
'<title>KIMIA Voice V2 | Plexiglas fume 106mm | MICROPHONES A CONFIRMER</title>',
'<desc>Aligner les percages sur les vrais ports acoustiques du XVF3800 avant usinage</desc>',
'<circle cx="56" cy="56" r="53" fill="none" stroke="#000000" stroke-width="0.15"/>']
for x,y,r in mic+vent:
 S.append(f'<circle cx="{56+x:.3f}" cy="{56-y:.3f}" r="{r:.3f}" fill="none" stroke="#000000" stroke-width="0.15"/>')
S.append('</svg>')
(P/'gabarit_plexi_fume_V2.svg').write_text('\n'.join(S),encoding='utf-8')
if ezdxf:
 doc=ezdxf.new('R2010');msp=doc.modelspace();msp.add_circle((0,0),53)
 for x,y,r in mic+vent:msp.add_circle((x,y),r)
 doc.saveas(P/'gabarit_plexi_fume_V2.dxf')