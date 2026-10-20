from pathlib import Path
import numpy as np, trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from shapely.geometry import Point, box
from shapely.affinity import rotate, translate
from ezdxf import new as dxf_new
from xml.sax.saxutils import escape

p=Path(__file__).parent
meshes=[]
# assembler les pieces dans la position cible (prototype, sans PCB ni haut-parleur)
assemblage=[
 ('01_base_haut_parleur_FR7.stl',0,'#555d68'),
 ('02_caisson_acoustique.stl',6.5,'#303840'),
 ('03_cloison_etanche.stl',52.5,'#7a6d5b'),
 ('04_corps_electronique.stl',56,'#3b434c'),
 ('05_couronne_XVF3800_plexi.stl',129,'#282f38')]
for fn,z,c in assemblage:
 mesh=trimesh.load(p/fn,force='mesh');mesh.apply_translation((0,0,z));meshes.append((mesh,c))
# ecran : STL externe imprimé à plat dans XY, pivoter en XZ
sc=trimesh.load(p/'06_cadre_ecran_Waveshare185.stl',force='mesh')
verts=sc.vertices.copy()
sc.vertices=np.stack([verts[:,0],-57+verts[:,2],56+36.5+verts[:,1]],axis=1)
meshes.append((sc,'#151c23'))
# plexi translucide, visible en aperçu
plex=trimesh.load(p/'08_gabarit_plexiglas_non_imprimer.stl',force='mesh');plex.apply_translation((0,0,144))
meshes.append((plex,'#253b49'))

fig=plt.figure(figsize=(11,9),dpi=140)
ax=fig.add_subplot(111,projection='3d',computed_zorder=False)
for mesh,color in meshes:
    faces=mesh.triangles
    if len(faces)>18000:
        faces=faces[::max(1,len(faces)//18000)]
    col=Poly3DCollection(faces,linewidths=0,alpha=.77 if color!='#253b49' else .42)
    col.set_facecolor(color)
    ax.add_collection3d(col)
# Simuler cercle actif de l'écran en noir avec joli anneau bleu
from math import pi,cos,sin
zcentre=92.5
for rad,width,c in [(23,3,'#76aeec'),(17,1,'#dbf2ff')]:
    th=np.linspace(0,2*pi,240)
    ax.plot(rad*np.cos(th),np.full_like(th,-58),zcentre+rad*np.sin(th),color=c,lw=width,alpha=.95)
# contour principal / repères
ax.set_xlim(-81,81);ax.set_ylim(-83,83);ax.set_zlim(-13,156)
ax.set_box_aspect((1.45,1.30,1.55))
ax.view_init(elev=21,azim=-67)
ax.set_axis_off()
ax.set_title('KIMIA Voice V1 — assemblage 3D indicatif',fontsize=17,pad=14)
fig.savefig(p/'apercu_assemblage.png',dpi=150,bbox_inches='tight',facecolor='#ffffff')
plt.close(fig)

# Gabarit de découpe du plexiglas fumé, à imprimer 100% / envoi laser
shape=Point(0,0).buffer(53.0,resolution=160)
for x in (-33,33):
 for y in (-33,33):
  cut=Point(x,y).buffer(6.0,resolution=50)
  a=45 if x*y>0 else -45
  rect=translate(rotate(box(-8,-6,8,6),a,origin=(0,0)),xoff=x,yoff=y)
  shape=shape.difference(cut.union(rect))
shape=shape.buffer(0)
print('plexi area',shape.area,'bounds',shape.bounds)
if shape.geom_type != 'Polygon':
 shape=max(shape.geoms,key=lambda g:g.area)
pts=list(shape.exterior.coords)
# SVG mm precise, avec trait fin (lignes de decoupe)
svgpoints=' '.join((f'{x+55:.3f},{55-y:.3f}' for x,y in pts))
svg=f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="110mm" height="110mm" viewBox="0 0 110 110">
<title>KIMIA - gabarit plexi noir translucide - diametre exterieur 106mm</title>
<desc>4 encoches acoustiques, cotes approximatives a verifier sur circuit XVF3800.</desc>
<polygon points="{svgpoints}" fill="none" stroke="black" stroke-width="0.12"/>
</svg>'''
(p/'gabarit_plexiglas_106mm.svg').write_text(svg,encoding='utf-8')

doc=dxf_new('R2010');msp=doc.modelspace()
points=[(float(x),float(y)) for x,y in pts]
msp.add_lwpolyline(points,close=True,dxfattribs={'layer':'DECOUPE'})
doc.saveas(p/'gabarit_plexiglas_106mm.dxf')

# petit aperçu du patron à découper
fig,ax=plt.subplots(figsize=(6.8,6.8),dpi=160)
arr=np.asarray(pts);ax.fill(arr[:,0],arr[:,1],color='#242a31',alpha=.80)
ax.plot(arr[:,0],arr[:,1],color='#4277a5',lw=1.5)
for x in (-33,33):
 for y in (-33,33):
  ax.scatter([x],[y],s=12,color='white')
ax.set_aspect('equal');ax.set_xlim(-60,60);ax.set_ylim(-60,60)
ax.grid(alpha=.15)
ax.set_title('Plexiglas fumé Ø106 mm — découpe provisoire',fontsize=12)
ax.set_xlabel('millimètres');ax.set_ylabel('millimètres')
fig.savefig(p/'apercu_gabarit_plexi.png',bbox_inches='tight')
plt.close(fig)