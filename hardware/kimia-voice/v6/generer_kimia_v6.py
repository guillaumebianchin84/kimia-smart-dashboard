"""KIMIA Voice V6 — silhouette V5 réduite, coque blanche continue.
Caisson cylindrique interne fermé en haut; HP ferme son ouverture basse et tire vers le sol.
Tolérances et cotes électroniques provisoires: validation mécanique réelle obligatoire.
"""
import math
from pathlib import Path
import cadquery as cq
from cadquery import Vector
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import nearest_points

OUT=Path(__file__).resolve().parent
# Références matérielles conservées de V5 (mm).
XVF_D=100.0
SCREEN_PCB_D=55.0
SCREEN_VISIBLE_D=45.68
SPEAKER_PCD=74.0
SPEAKER_CUT_D=61.0
FRONT_Y=-78.0*.82
BASE_Z=0.0
BASE_H=5.0
BODY_Z=5.0
BODY_TOP=94.0
TOP_H=9.0
FOOT_H=10.0
SCREEN_Z=51.0
WALL=4.0
TOP_CENTER_Y=-5.8
SCALE_X=.79
SCALE_Y=.82
CAISSON_R=44.0
CAISSON_WALL=3.5
CAISSON_H=72.0
CAISSON_CAP=4.0
# Rear power opening is x=-10..+10, z=34..44. The former rear
# cap pillar at (0,54) was sliced in half by that opening! Move only the
# HIDDEN rear screw to (18,50); the exterior profile and cable slot stay fixed.
JOIN_SCREWS=((18.0,50.0),(-52.0,-35.0),(52.0,-35.0))
TOP_SCREWS=JOIN_SCREWS
# Independent underside base screws: one rear boss also moves to keep
# safe material separation around the relocated top-cover pillar.
BASE_SCREWS=((-26.0,-52.0),(26.0,-52.0),(-15.0,50.0),(0.0,53.0))
BASE_BOSS_R=4.8
BASE_INSERT_R=2.25
FRONT_HALF_WIDTH=44.0*SCALE_X
REAR_POINT_Y=76.0*SCALE_Y
DESIGN_MAX_WIDTH=157.8*SCALE_X
# Hidden cap screws: underside access bores, upper screw seats, blind brass inserts.
# M3 x 12 from the shoulder at z=86; inserts must be verified before fabrication.
SCREW_ACCESS_R=3.35
SCREW_CLEARANCE_R=1.70
SCREW_SHOULDER_Z=86.0
CAP_INSERT_R=2.25
CAP_INSERT_DEPTH=4.8

def bezier4(p0,p1,p2,p3,n=18):
    result=[]
    for k in range(n+1):
        t=k/n;u=1-t
        result.append((u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0],
                       u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]))
    return result

# V6 refinement: slightly round the two front vertical corners while keeping
# the approved planar front, exterior bounds, XVF seat and internal layout.
# Only Bezier control handles change: curve endpoints remain those of V5.
RIGHT_CURVES=[
 ((44,-78),(55,-78),(72,-74),(76,-63)),
 ((76,-63),(81,-47),(79,-22),(74,3)),
 ((74,3),(67,28),(53,52),(30,70)),
 ((30,70),(19,74),(8,76),(0,76)),
]
RIGHT_CURVES=[tuple((x*SCALE_X,y*SCALE_Y) for x,y in curve) for curve in RIGHT_CURVES]
right=[]
for i,c in enumerate(RIGHT_CURVES):
    pts=bezier4(*c,n=22)
    right+=pts if i==0 else pts[1:]
pts=[(-FRONT_HALF_WIDTH,FRONT_Y),(FRONT_HALF_WIDTH,FRONT_Y)]+right[1:]+[(-x,y) for x,y in right[-2::-1]]
PROFILE=Polygon(pts)
assert PROFILE.is_valid and PROFILE.is_simple

def poly_wire(p):
    pts=list(p.exterior.coords)[:-1]
    return cq.Workplane('XY').polyline(pts).close()

def solid_from_profile(p,z,h):
    return poly_wire(p).extrude(h).translate((0,0,z))

def slab(z,h):
    return solid_from_profile(PROFILE,z,h)

def cylinder(r,h,x=0,y=0,z=0):
    return cq.Workplane('XY').center(x,y).circle(r).extrude(h).translate((0,0,z))

def axis_y_cylinder(r,length,x,y,z):
    return cq.Workplane('XY').newObject([cq.Solid.makeCylinder(r,length,Vector(x,y,z),Vector(0,1,0))])

def cut_xy_holes(s,locations,r,z,h):
    for x,y in locations:s=s.cut(cylinder(r,h,x,y,z))
    return s

def linked_post(s,x,y,z,h,r=5.5):
    center=Point(x,y)
    foot=nearest_points(center,PROFILE.boundary)[1]
    dx,dy=foot.x-x,foot.y-y
    dd=math.hypot(dx,dy)
    tip=(foot.x+dx/dd*2,foot.y+dy/dd*2)
    web=LineString([(x,y),tip]).buffer(3.25,cap_style=1,resolution=8)
    link=solid_from_profile(web.intersection(PROFILE),z,h)
    return s.union(link).union(cylinder(r,h,x,y,z))

def shell(z,h):
    inner=PROFILE.buffer(-WALL,resolution=16)
    return slab(z,h).cut(solid_from_profile(inner,z-.1,h+.2))

def base_hp():
    """Plaque de fond percée Ø61; HP monté dessous, pieds 10mm."""
    s=slab(BASE_Z,BASE_H).cut(cylinder(SPEAKER_CUT_D/2,BASE_H+.4,z=-.2))
    fix=[(SPEAKER_PCD/2*math.cos(math.radians(a)),SPEAKER_PCD/2*math.sin(math.radians(a))) for a in (45,135,225,315)]
    s=cut_xy_holes(s,fix,1.85,-.1,BASE_H+.3)
    # Four M3 captive nuts above the 5 mm base. The original underside
    # counterbores were removed: they overlapped a useful nut pocket depth.
    # Nut pockets are INSIDE the sealed speaker chamber (nothing visible outside).
    # M3 nut AF 5.5 mm; prototype hex cutout 6.6 mm vertex circle, depth 2.65.
    # Only ~0.2 mm nominal radial gap to the cylinder inner wall: verify real
    # nut corner clearance and print tolerances before assembling.
    for x,y in fix:
        pocket=(cq.Workplane('XY').center(x,y).polygon(6,6.6)
                .extrude(2.85).translate((0,0,BASE_H-2.65)))
        s=s.cut(pocket)
    # Service access to the hidden top-cover screws.
    s=cut_xy_holes(s,JOIN_SCREWS,SCREW_ACCESS_R,-.1,BASE_H+.3)
    # Four independent underside screws attach the base to the white shell.
    # Recess the M3 heads by 2 mm and provide full shank clearance.
    for x,y in BASE_SCREWS:
        s=s.cut(cylinder(1.7,BASE_H+.3,x,y,-.1))
        s=s.cut(cylinder(3.25,2.1,x,y,-.1))
    # Emboîtement caisson Ø88 + jeu radial 0,5mm. Joint à assurer.
    rim=cylinder(CAISSON_R+2.5,2.5,z=BASE_H)
    rim=rim.cut(cylinder(CAISSON_R+.5,2.8,z=BASE_H-.1))
    s=s.union(rim)
    for x,y in [(-40,-42),(40,-42),(-30,43),(30,43)]:
        s=s.union(cylinder(8,FOOT_H,x,y,-FOOT_H))
    return s

def caisson():
    """Cylindre creux en dessous et fermé en haut, sans bande bleue extérieure.
    Le haut-parleur ferme le fond du caisson au montage. Passe-fil AR à étancher.
    """
    s=cylinder(CAISSON_R,CAISSON_H,z=BASE_H)
    s=s.cut(cylinder(CAISSON_R-CAISSON_WALL,CAISSON_H-CAISSON_CAP+.2,z=BASE_H-.2))
    s=s.cut(axis_y_cylinder(2,12,0,CAISSON_R-7,BASE_H+CAISSON_H-12))
    return s

def corps():
    s=shell(BODY_Z,BODY_TOP-BODY_Z)
    # La vitre Ø55 rentre de l'exterieur dans la feuillure Ø60 x 1.45.
    # L'epaulement Ø47.4 retient sa peripherie; les 3 M2 sont a R=21,
    # donc les entretoises traversent l'ouverture Ø47.4.
    # L'etancheite et le jeu reel restent a verifier au montage.
    s=s.cut(axis_y_cylinder(23.7,15,0,FRONT_Y-1,SCREEN_Z))
    s=s.cut(axis_y_cylinder(30.0,1.45,0,FRONT_Y-.1,SCREEN_Z))
    s=s.cut(axis_y_cylinder(28.3,9.4,0,FRONT_Y+2.1,SCREEN_Z))
    for x in (-33.0,33.0):
        s=s.union(axis_y_cylinder(5.7,12.5,x,FRONT_Y+3.5,SCREEN_Z))
        s=s.cut(axis_y_cylinder(1.25,11.5,x,FRONT_Y+5,SCREEN_Z))
    # Short bosses for the independent bottom base-to-body attachment.
    # Blind insert holes from the bottom: provisional M3 inserts Ø4.5 x 4 mm.
    for x,y in BASE_SCREWS:
        s=linked_post(s,x,y,BODY_Z,12,BASE_BOSS_R)
        s=s.cut(cylinder(BASE_INSERT_R,4.8,x,y,BODY_Z-.1))
    # Three continuous structural pillars, each accessible from underneath.
    # Long access bores stop at a shoulder that seats an M3x12 screw head;
    # the last 8mm is a smaller shank clearance hole up into the top cover.
    for x,y in JOIN_SCREWS:
        s=linked_post(s,x,y,BODY_Z,BODY_TOP-BODY_Z,5.5)
        s=s.cut(cylinder(SCREW_ACCESS_R,SCREW_SHOULDER_Z-BODY_Z+.2,
                         x,y,BODY_Z-.1))
        s=s.cut(cylinder(SCREW_CLEARANCE_R,BODY_TOP-SCREW_SHOULDER_Z+.3,
                         x,y,SCREW_SHOULDER_Z-.1))
    for zz in (26,32,38):
        box=cq.Workplane('XY').box(15,15,1.6).translate((-64,2,zz))
        s=s.cut(box)
    s=s.cut(cq.Workplane('XY').box(20,22,10).translate((0,65,39)))
    return s

def dessus_xvf():
    """Disque XVF Ø100 presque au bord du contour (décalage Y -5,8 mm)."""
    s=slab(BODY_TOP,TOP_H)
    s=s.cut(cylinder(50.8,6.6,y=TOP_CENTER_Y,z=BODY_TOP-.2))
    s=s.cut(cylinder(48.9,TOP_H+.3,y=TOP_CENTER_Y,z=BODY_TOP-.15))
    s=s.cut(cylinder(53.2,1.85,y=TOP_CENTER_Y,z=BODY_TOP+TOP_H-1.8))
    # Blind insert pockets opened from underneath: NO screw holes on the top.
    # M3 heat-set brass inserts nominal Ø4.5 x 4mm (prototype dimensions).
    for x,y in TOP_SCREWS:
        s=s.cut(cylinder(CAP_INSERT_R,CAP_INSERT_DEPTH+.1,
                         x,y,BODY_TOP-.05))
    return s

def plexi():
    s=cylinder(53,1.5)
    # No screw holes in the top plexiglass: perimeter fixing with thin adhesive
    # gasket on the support ledge (must avoid blocking microphone openings).
    for a in (45,135,225,315):
        for dt in (-8,8):
            ang=math.radians(a+dt)
            s=s.cut(cylinder(1.6,1.9,44*math.cos(ang),44*math.sin(ang),-.2))
    return s.translate((0,TOP_CENTER_Y,0))

# Plan mecanique officiel Waveshare 1.85" (SKU 35079):
# Vue ARRIERE : une fixation M2 a +21 mm de hauteur, deux a
# x=+-14.85 mm / hauteur=-14.85 mm (entraxe inferieur 29.70 mm).
# Le support est modele a plat XY ; la rotation -90 deg autour de X
# transforme local_y en -Z. Ainsi y_local=-21 pour la vis haute.
SCREEN_M2_MOUNTS=((0.0,-21.0),(-14.85,14.85),(14.85,14.85))
SCREEN_BRACKET_OFFSET_Y=16.2  # depuis la face externe vers l'interieur
SCREEN_NOMINAL_INSET=0.65      # vitrage 0.70 mm sur feuillure de 1.35 mm
SCREEN_OVERALL_DEPTH=9.10     # cote du dessin officiel, a verifier au banc
SCREEN_SPACER_LENGTH=(SCREEN_BRACKET_OFFSET_Y-
                      SCREEN_NOMINAL_INSET-SCREEN_OVERALL_DEPTH)  # 6.45 mm

def retainer_ecran():
    """Anneau ARRIERE 3 x M2 pour Waveshare; insertion de l'ecran par l'avant.

    L'anneau est fixe aux DEUX bossages internes existants x=+-33 mm.
    Trois entretoises cylindriques integralement imprimees touchent les
    trois inserts M2 Waveshare; trois vis M2 sont introduites de l'interieur.
    Les entretoises et leur longueur sont a verifier sur le module reel.
    Aucun changement de la silhouette ni de la feuillure de facade.
    """
    # Anneau decoupe pour laisser circuler la nappe centrale vers le bas.
    s=cylinder(35.5,3.0).cut(cylinder(15.0,3.4,z=-.2))
    s=s.cut(cq.Workplane('XY').box(14.0,28.0,3.6)
            .translate((0,28.0,1.5)))
    # Les deux appuis M2 d'origine servent uniquement a fixer l'anneau
    # a la coque, et plus a serrer directement la dalle.
    for x in (-33.0,33.0):
        s=s.cut(cylinder(1.30,3.4,x,0,-.2))
    # Entretoises avant vers les 3 inserts arriere M2 du module.
    assert SCREEN_SPACER_LENGTH>0
    for x,y in SCREEN_M2_MOUNTS:
        s=s.union(cylinder(3.7,SCREEN_SPACER_LENGTH,x,y,
                           -SCREEN_SPACER_LENGTH))
        # Passage vis M2, puis lamage discret de la tete cote interieur.
        s=s.cut(cylinder(1.20,SCREEN_SPACER_LENGTH+3.4,x,y,
                         -SCREEN_SPACER_LENGTH-.2))
        s=s.cut(cylinder(2.20,1.2,x,y,1.9))
    return s

def front_trim():
    s=cylinder(29.7,1.1).cut(cylinder(23.7,1.4,z=-.1))
    return s

def assembled():
    parts=[base_hp(),caisson(),corps(),dessus_xvf(),
           plexi().translate((0,0,BODY_TOP+TOP_H-1.55)),
           front_trim().rotate((0,0,0),(1,0,0),-90).translate((0,FRONT_Y-.04,SCREEN_Z))]
    return cq.Compound.makeCompound([s.val() for s in parts])

PARTS={
 '01_socle_HP_vers_le_bas':base_hp,
 '02_caisson_cylindrique_interne_ferme_haut':caisson,
 '03_coque_blanche_continue_ecran':corps,
 '04_couronne_superieure_XVF':dessus_xvf,
 '05_support_arriere_ecran':retainer_ecran,
 '06_bague_facade_optionnelle':front_trim,
 '07_gabarit_plexiglas_NON_VALIDE':plexi,
}

def validate_layout():
    assert PROFILE.contains(Point(0,TOP_CENTER_Y).buffer(53.2,resolution=96)), 'XVF outside shell'
    assert PROFILE.buffer(-WALL,resolution=16).contains(Point(0,0).buffer(CAISSON_R,resolution=96)), 'Caisson hits shell'
    for xy in JOIN_SCREWS:
        assert PROFILE.contains(Point(*xy).buffer(5.5,resolution=24)), f'Screw outside {xy}'
        assert Point(*xy).distance(Point(0,0))>=CAISSON_R+6.5, f'Screw hits caisson {xy}'
    assert FRONT_Y+2.1+9.4 < -CAISSON_R-2, 'screen PCB hits caisson'
    assert BODY_TOP>SCREEN_Z+32, 'screen bezel too high'
    assert FRONT_HALF_WIDTH>=34.0, 'too little flat face for screen trim'
    for xy in BASE_SCREWS:
        q=Point(*xy)
        assert PROFILE.contains(q.buffer(BASE_BOSS_R,resolution=24)), f'Base boss outside {xy}'
        assert q.distance(Point(0,0))>=CAISSON_R+BASE_BOSS_R+2, f'Base boss hits caisson {xy}'
        assert min(q.distance(Point(*p)) for p in JOIN_SCREWS)>BASE_BOSS_R+5.5+2, f'Base boss conflicts cap post {xy}'
        assert min(q.distance(Point(*p)) for p in ((-40,-42),(40,-42),(-30,43),(30,43)))>=BASE_BOSS_R+8+2, f'Base boss conflicts foot {xy}'
    assert TOP_H-CAP_INSERT_DEPTH>=4.0, 'blind inserts risk piercing top cover'
    assert SCREW_SHOULDER_Z+12.0<=BODY_TOP+CAP_INSERT_DEPTH, 'cap screw too long'
    assert SCREW_SHOULDER_Z+12.0>=BODY_TOP+3.5, 'cap screw insert engagement too short'
    print('V6 dimensions',tuple(round(n,2) for n in PROFILE.bounds),
          'total height',BODY_TOP+TOP_H+FOOT_H,flush=True)

if __name__=='__main__':
    validate_layout()
    for name,fn in PARTS.items():
        print('EXPORT',name,flush=True)
        s=fn()
        print('  solids',len(s.solids().vals()),'valid',s.val().isValid(),'volume',round(s.val().Volume()),flush=True)
        if not s.val().isValid(): raise ValueError('Invalid '+name)
        cq.exporters.export(s,str(OUT/(name+'.stl')),tolerance=.14,angularTolerance=.20)
        cq.exporters.export(s,str(OUT/(name+'.step')))
    a=assembled();cq.exporters.export(a,str(OUT/'00_ENSEMBLE_V6_VISUALISATION.stl'),tolerance=.15,angularTolerance=.22)
    cq.exporters.export(a,str(OUT/'00_ENSEMBLE_V6_VISUALISATION.step'))
    cq.exporters.export(a,str(OUT/'00_KIMIA_VOICE_V6_GITHUB.stl'),tolerance=.15,angularTolerance=.22)
    print('TERMINE V6 — validation physique en attente')