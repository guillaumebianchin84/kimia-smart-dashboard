"""Export fused-independent view-only STL and render; mm; front negative Y."""
from pathlib import Path
import numpy as np
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from PIL import Image

P=Path(__file__).resolve().parent
parts=[
 ('01_socle_FR7_downfiring.stl','#56585e'),
 ('02_caisson_acoustique.stl','#30353d'),
 ('03_cloison_etanche.stl','#a58b61'),
 ('04_corps_galet_electronique.stl','#424a54'),
 ('05_couronne_XVF3800_plexiglas.stl','#272e35'),
 ('06_logement_ecran_rond_185.stl','#101a23'),
 ('07_retention_arriere_ecran.stl','#596372'),
 ('08_gabarit_plexi_fume_NON_IMPRIMER.stl','#172a40')]
meshes=[]
for i,(name,color) in enumerate(parts):
    mesh=trimesh.load(P/name,force='mesh')
    if i in (5,6):
        # local (x,y,z) -> global (x, -z, y), translate screen center
        mesh.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]))
        # rotation positive pi/2: local z -> -y, local y -> z
        # want local depth +z moves towards +Y, so use negative pi/2 instead
        mesh=trimesh.load(P/name,force='mesh')
        mesh.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))
        # negative: local +Z -> +Y, local +Y -> -Z; screen circle still round.
        mesh.apply_translation((0,-73+(11.0 if i==6 else 0),72.0))
    if i==7:mesh.apply_translation((0,0,109.0))
    meshes.append((mesh,color))
# Preview only: includes translucent printed geometry, not electronic models.
scene=trimesh.util.concatenate([mesh for mesh,_ in meshes])
scene.export(P/'00_KIMIA_VOICE_V2_VISUALISATION.stl')
print('assembled triangle count',len(scene.faces),'bounds',np.around(scene.bounds,2))

def plot_view(filename,elev,azim,hide_internal=True):
    fig=plt.figure(figsize=(11,8.3),dpi=125,facecolor='#f6f7f8')
    ax=fig.add_subplot(111,projection='3d',computed_zorder=False)
    for idx,(mesh,color) in enumerate(meshes):
        # Skip solid opaque internal bulkhead for exterior perspective
        if hide_internal and idx in (2,6):continue
        faces=mesh.triangles
        if len(faces)>7500:faces=faces[::int(np.ceil(len(faces)/7500))]
        coll=Poly3DCollection(faces,linewidths=0,zsort='average')
        coll.set_facecolor(color);coll.set_alpha(.54 if idx==7 else .96)
        ax.add_collection3d(coll)
    # Display concentric rings illustrate active circle, not physical PCB.
    th=np.linspace(0,2*np.pi,128)
    for r,clr,lw in [(22.6,'#52b4ff',2.3),(19.0,'#1a638e',.7)]:
        ax.plot(r*np.cos(th),np.full_like(th,-73.2),72+r*np.sin(th),c=clr,lw=lw)
    # Decorative LED ring under smoked plexiglass.
    ax.plot(13*np.cos(th),13*np.sin(th),np.full_like(th,110.7),c='#6fc8ff',lw=2.3,alpha=.75)
    ax.set(xlim=(-97,97),ylim=(-99,104),zlim=(-19,133))
    ax.set_box_aspect((1.28,1.33,1.06));ax.view_init(elev=elev,azim=azim)
    ax.set_axis_off()
    ax.set_title('KIMIA VOICE — V2 · galet triangulaire',fontsize=17,weight='semibold',pad=10)
    fig.savefig(P/filename,bbox_inches='tight',pad_inches=.05)
    plt.close(fig)

plot_view('apercu_3d_v2.png',24,-65)
plot_view('apercu_dessus_v2.png',79,-90)

fig,ax=plt.subplots(figsize=(8.6,5.7),dpi=160)
ax.set_xlim(-10,152);ax.set_ylim(-21,132);ax.set_aspect('equal')
# side conceptual cross-section, not literal curved panel cross section
from matplotlib.patches import FancyBboxPatch,Rectangle,Circle
outer=FancyBboxPatch((8,0),130,111,boxstyle='round,pad=0,rounding_size=19',lw=2,ec='#32383f',fc='#e8ebee')
ax.add_patch(outer)
ax.add_patch(Rectangle((12,5),122,34,fc='#c8d2df',alpha=.65))
ax.add_patch(Rectangle((12,39),122,4,fc='#d1a76d',alpha=.9))
ax.add_patch(Rectangle((12,43),122,59,fc='#d9dedf',alpha=.8))
ax.add_patch(Rectangle((12,102),122,9,fc='#60707b',alpha=.4))
ax.add_patch(Rectangle((20,-12),13,12,fc='#42474d'))
ax.add_patch(Rectangle((114,-12),13,12,fc='#42474d'))
ax.add_patch(Circle((75,8),20,fc='#476888',ec='#213d52',lw=1.4))
ax.add_patch(Rectangle((12,110),122,1.5,fc='#181b22'))
for y,txt in [(19,'Caisson HP 34 mm'),(41,'Cloison 4 mm'),(67,'Electronique + capteurs'),(107,'XVF3800 + plexi')]:
 ax.text(75,y,txt,ha='center',va='center',fontsize=10,color='#111827')
ax.annotate('123 mm avec pieds',xy=(142,-12),xytext=(142,111),arrowprops={'arrowstyle':'<->'},ha='left',va='center',fontsize=9,rotation=90)
ax.set_title('Cotes verticales théoriques V2 — coupe de principe')
ax.axis('off')
fig.savefig(P/'coupe_compartiments_v2.png',bbox_inches='tight',facecolor='#ffffff')
plt.close(fig)