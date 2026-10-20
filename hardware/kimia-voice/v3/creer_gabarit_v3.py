"""Draft cut patterns. Hole locations must be confirmed on XVF3800 real PCB."""
import math
from pathlib import Path
import ezdxf
P=Path(__file__).resolve().parent
holes=[(x,y,4.2) for x in (-33,33) for y in (-33,33)]
for a in (45,135,225,315):
 for da in (-8,8):
  t=math.radians(a+da)
  holes.append((44*math.cos(t),44*math.sin(t),1.6))
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="106mm" height="106mm" viewBox="-53 -53 106 106">','<!-- DRAFT ONLY: mic coordinates need verification against actual XVF3800 PCB -->','<circle cx="0" cy="0" r="53" fill="none" stroke="black" stroke-width="0.15"/>']
for x,y,r in holes:svg.append(f'<circle cx="{x:.4f}" cy="{y:.4f}" r="{r:.3f}" fill="none" stroke="black" stroke-width="0.15"/>')
svg.append('</svg>')
(P/'GABARIT_PLEXI_V3_NON_VALIDE.svg').write_text('\n'.join(svg),encoding='utf-8')
doc=ezdxf.new('R2010');m=doc.modelspace();m.add_circle((0,0),53)
for x,y,r in holes:m.add_circle((x,y),r)
doc.saveas(P/'GABARIT_PLEXI_V3_NON_VALIDE.dxf')