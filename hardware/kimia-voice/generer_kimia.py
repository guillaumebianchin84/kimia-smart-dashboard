# KIMIA Voice V1 - Boitier parametrique pour impression 3D
# Unite: millimetres. Prototype: verifier les interfaces sur composants reels.
# Dependances: cadquery>=2.4
import cadquery as cq
from pathlib import Path
from math import sin, cos, radians, sqrt

OUT=Path(__file__).resolve().parent
# Cotes des composants officiels
XVF_D=100.0                   # Seeed : circuit imprime nu, sans boitier
FR7_CHASSIS=66.0             # Visaton FR7 4 Ohm
FR7_CUTOUT=61.0              # trou acoustique recommande
FR7_BCD=74.0                 # cercle de percage vis 4x d4.2
SCREEN_OD=55.0               # Waveshare 1.85inch Touch LCD Module
SCREEN_ACTIVE=45.68          # affichage rond visible 360x360
# Geometrie boitier V1
R=65.0
FLAT_Y=-52.0
WALL=3.6
LOW_H=46.0
UP_H=73.0
DIV_H=3.5
SPK_PLATE_H=6.5
TOP_H=17.0
# boulonnerie et jeux
TOL=0.45
M3_CLEAR=3.3
M3_PILOT=2.65
M2_PILOT=1.85
NUT_AF=5.8


def cyl(r,h,x=0,y=0,z=0):
    return cq.Workplane('XY').center(x,y).circle(r).extrude(h).translate((0,0,z))
def clip_front(s, plane=FLAT_Y):
    # Seule la demi-section y >= plane est conservee
    mask=cq.Workplane('XY').box(400,400,400).translate((0,plane-200,-80))
    return s.cut(mask)
def prof(r, h, z=0, front=FLAT_Y):
    return clip_front(cyl(r,h,z=z),front)
def tube(h, rad=R, z=0, flat=FLAT_Y):
    shell=prof(rad,h,z,flat)
    bore=prof(rad-WALL,h+2,z-1,flat+WALL)
    return shell.cut(bore)
def screw_pts(rad=57, angles=(45,135,225,315)):
    return [(rad*cos(radians(a)),rad*sin(radians(a))) for a in angles]
def xy_bore(s,holes,r,h=200,z=-1):
    for x,y in holes: s=s.cut(cyl(r,h,x,y,z))
    return s

def base_baffle():
    b=prof(R,SPK_PLATE_H)
    # sortie acoustique cote table
    b=b.cut(cyl(FR7_CUTOUT/2,SPK_PLATE_H+2,z=-1))
    # Pieds non percants: hauteur 12mm, diffusion sous boitier
    for x,y in [(0,-44),(-46,24),(46,24)]:
        b=b.union(cyl(8.0,12,x,y,-12))
    # Haut-parleur: 4 trous M3 sur cercle de percage 74 mm
    spk_holes=screw_pts(FR7_BCD/2)
    b=xy_bore(b,spk_holes,1.65,h=SPK_PLATE_H+2)
    # Ecrous M3 hexagonaux par dessous (AF ~5.5, logement 5.8)
    for x,y in spk_holes:
        pocket=cq.Workplane('XY').center(x,y).polygon(6,6.75).extrude(2.8).translate((0,0,-0.03))
        b=b.cut(pocket)
    # vis d'assemblage de la partie acoustique, têtes accessibles dessous
    for x,y in screw_pts():
        b=b.cut(cyl(M3_CLEAR/2,SPK_PLATE_H+2,x,y,-1))
        b=b.cut(cyl(3.1,2.7,x,y,-0.01))
    return b

def lower_shell():
    s=tube(LOW_H)
    for x,y in screw_pts():
        s=s.union(cyl(5.4,12,x,y,0))
        s=s.union(cyl(5.4,12,x,y,LOW_H-12))
        s=s.cut(cyl(M3_PILOT/2,13,x,y,-0.01))
        s=s.cut(cyl(M3_PILOT/2,13,x,y,LOW_H-12))
    return s

def acoustic_divider():
    # Cloison etanche. Passage cable haut-parleur a obturer avec silicone
    s=prof(R, DIV_H)
    s=s.cut(cyl(2.3,DIV_H+2,0,33,-1))
    for x,y in screw_pts():
        s=s.cut(cyl(M3_CLEAR/2,DIV_H+2,x,y,-1))
        s=s.cut(cyl(3,1.4,x,y,DIV_H-1.4))
    # Quatre trous additionnels pour visser la partie electronique
    for x,y in screw_pts(56,angles=(18,162,198,342)):
        s=s.cut(cyl(M3_CLEAR/2,DIV_H+2,x,y,-1))
    return s

def upper_shell():
    s=tube(UP_H)
    # Zone enceinte acoustique distincte de l'electronique
    # Orifice avant Ø58 pour insérer l'ecran de 55 mm par l'avant
    front_hole=cq.Workplane('XZ').circle(29.0).extrude(26,both=True).translate((0,-52,36.5))
    s=s.cut(front_hole)
    # Percements des 4 vis du cadre ecran traversant la face avant
    for x in (-33,33):
      for zz in (9.5,63.5):
        bore=cq.Workplane('XZ').center(x,zz).circle(1.55).extrude(35,both=True).translate((0,-52,0))
        s=s.cut(bore)
        # douille intérieure renforcée autour du taraudage avant
        boss=cq.Workplane('XZ').center(x,zz).circle(4.4).extrude(-16).translate((0,-50,0))
        # Le boss depasse en interior; répercer après union
        s=s.union(boss)
        s=s.cut(bore)
    # Fixation vissée à la cloison par le dessous (pilotes M3)
    for x,y in screw_pts(56, angles=(18,162,198,342)):
        s=s.union(cyl(6.2,12,x,y,0))
        s=s.cut(cyl(M3_PILOT/2,13,x,y,-0.01))
    # Deux taraudages pour fixer la couronne supérieure (vis traversant dessus)
    for xx in (-59.3,59.3):
        s=s.union(cyl(4.4,11,xx,0,UP_H-11))
        s=s.cut(cyl(M3_PILOT/2,12,xx,0,UP_H-11))
    # Fente USB de service en haut à l'arrière, dim. provisoire
    usb=cq.Workplane('XY').box(23,20,17).translate((0,59,UP_H-4))
    s=s.cut(usb)
    # Ouverture capteur ambient: deux séries de petites fentes côté droit
    # perforation de l'enveloppe à travers la zone x positive
    for zz in [19,24,29,34]:
        vent=cq.Workplane('XY').box(22,2.0,1.9).translate((62.0,0,zz))
        s=s.cut(vent)
    # L'accroche du capteur SHT45 et du LD2410 reste libre selon modules choisis
    return s

def top_frame():
    # Plaque circulaire au-dessus de boitier / XVF3800. Finie à l'avant y=-56.
    s=prof(R, TOP_H, front=-56)
    # Insertion du PCB par dessous (diam. 100 + jeu)
    s=s.cut(cyl(51.15,11.3,z=-0.1))
    # Epaulement central de retenue du PCB
    s=s.cut(cyl(48.1,7.1,z=10.1))
    # Feuillure de plexiglas noir TRANSLUCIDE d=106, h=2
    s=s.cut(cyl(53.25,2.1,z=15.0))
    # Quatre degagements acoustiques: surtout ne pas recouvrir les micros!
    # Centre calculé d'apres les vues du constructeur: à confirmer sur la carte
    for x in (-33,33):
      for y in (-33,33):
        s=s.cut(cyl(6.0,TOP_H+2,x,y,-0.5))
    # Vis M2 de retenue du PCB avec petites rondelles diametre 7 (non incluses)
    for x,y in screw_pts(53.0,angles=(20,160,200,340)):
        s=s.cut(cyl(M2_PILOT/2,10.5,x,y,-0.2))
    # Deux fixations M3 de cadre sur zone laterale (trous vissage du haut)
    for x,y in [(59.3,0),(-59.3,0)]:
        s=s.cut(cyl(M3_CLEAR/2,TOP_H+2,x,y,-0.5))
    return s

def screen_bezel():
    # Export à plat: XY local = facade, Z = epaisseur vers l'arrière
    b=cq.Workplane('XY').rect(76,71).extrude(5)
    try: b=b.edges('|Z').fillet(6)
    except: pass
    # Fenêtre frontale d=46mm (affichage actif d45.68)
    b=b.cut(cyl(23.05,5.4,z=-0.1))
    # Feuillure arriere d55.7, profondeur 2.6mm
    b=b.cut(cyl(27.85,2.7,z=2.4))
    # 4 pilotes M2.5 via l'arriere, pas traversants face visible
    for x in (-33,33):
      for y in (-27,27):
        b=b.cut(cyl(1.12,4.2,x,y,1.0))
    return b

def screen_retainer():
    # Bague 76x71 de maintien par l'arrière, à visser avec le bezel.
    b=cq.Workplane('XY').rect(76,71).extrude(2.7)
    try:b=b.edges('|Z').fillet(6)
    except:pass
    b=b.cut(cyl(26.1,3.2,z=-0.2))
    # decoupe pour le connecteur FPC en partie basse
    b=b.cut(cq.Workplane('XY').box(23,17,5).translate((0,-29,1.3)))
    for x in (-33,33):
      for y in (-27,27):
        b=b.cut(cyl(1.5,3.5,x,y,-0.25))
    return b

def plexi_template():
    # Gabarit de decoupe pour feuille fumee, modele STL utile controle dimensionnel
    b=cyl(53.0,1.5)
    for x in (-33,33):
      for y in (-33,33):
        b=b.cut(cyl(6.0,3,x,y,-0.5))
        # notch ouverte vers l'exterieur, evite une languette de 0.3 mm
        angle=45 if x*y>0 else -45
        notch=cq.Workplane('XY').box(16,12,3).rotate((0,0,0),(0,0,1),angle).translate((x,y,0.75))
        b=b.cut(notch)
    return b

def simulate_cad_placement():
    # Représentation d'ensemble indicative; utile pour l'aperçu, pas pour imprimer
    parts=[]
    parts.append(base_baffle())
    parts.append(lower_shell().translate((0,0,SPK_PLATE_H)))
    parts.append(acoustic_divider().translate((0,0,SPK_PLATE_H+LOW_H)))
    parts.append(upper_shell().translate((0,0,SPK_PLATE_H+LOW_H+DIV_H)))
    parts.append(top_frame().translate((0,0,SPK_PLATE_H+LOW_H+DIV_H+UP_H)))
    # Uniquement pièces principales: le bezel se monte perpendiculaire en face.
    comp=cq.Compound.makeCompound([p.val() for p in parts]);return comp

PARTS={
    '01_base_haut_parleur_FR7':base_baffle,
    '02_caisson_acoustique':lower_shell,
    '03_cloison_etanche':acoustic_divider,
    '04_corps_electronique':upper_shell,
    '05_couronne_XVF3800_plexi':top_frame,
    '06_cadre_ecran_Waveshare185':screen_bezel,
    '07_maintien_arriere_ecran':screen_retainer,
    '08_gabarit_plexiglas_non_imprimer':plexi_template,
}
if __name__=='__main__':
    for name,fn in PARTS.items():
        print('Calcul',name,flush=True)
        obj=fn()
        cq.exporters.export(obj,str(OUT/(name+'.step')))
        cq.exporters.export(obj,str(OUT/(name+'.stl')),tolerance=0.09,angularTolerance=0.17)
        print('  solide',obj.val().isValid(),'volume mm3',round(obj.val().Volume()),flush=True)
    print('Calcul vue ensemble',flush=True)
    cq.exporters.export(simulate_cad_placement(),str(OUT/'ensemble_apercu.step'))
    print('TERMINE')