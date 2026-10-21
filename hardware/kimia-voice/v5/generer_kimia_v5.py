"""KIMIA Voice V5 / refined silhouette from approved V4 reference.
Smaller XY footprint, same height, softer/larger side radii around the front planar face.
"""
import math
from pathlib import Path
import cadquery as cq
from cadquery import Vector
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import nearest_points

OUT=Path(__file__).resolve().parent
XVF_D=100.0
SCREEN_PCB_D=55.0
SCREEN_VISIBLE_D=45.68
SPEAKER_PCD=74.0
SPEAKER_CUT_D=61.0
FRONT_Y=-78.0
BASE_Z=0.0
BASE_H=5.0
CAISSON_H=39.0
DIVIDER_Z=44.0
DIVIDER_H=4.0
BODY_Z=48.0
BODY_TOP=114.0
TOP_H=10.0
FOOT_H=12.0
SCREEN_Z=81.0
WALL=4.0
JOIN_SCREWS=((0.0,66.0),(-68.0,-20.0),(68.0,-20.0))
TOP_SCREWS=((0.0,66.0),(-68.0,-20.0),(68.0,-20.0))
FRONT_HALF_WIDTH=50.0
REAR_POINT_Y=76.0
DESIGN_MAX_WIDTH=160.0

def bezier4(p0,p1,p2,p3,n=18):
    result=[]
    for k in range(n+1):
        t=k/n;u=1-t
        result.append((u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0],
                       u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]))
    return result

# V5: soften the transition from the planar front to the flanks and slightly reduce XY footprint.
RIGHT_CURVES=[
 ((50,-78),(62,-78),(72,-74),(76,-63)),
 ((76,-63),(81,-47),(79,-22),(74,3)),
 ((74,3),(67,28),(53,52),(30,70)),
 ((30,70),(19,74),(8,76),(0,76)),
]
right=[]
for i,c in enumerate(RIGHT_CURVES):
    pts=bezier4(*c,n=22)
    right+=pts if i==0 else pts[1:]
pts=[(-50,-78),(50,-78)]+right[1:]+[(-x,y) for x,y in right[-2::-1]]
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
    s=slab(BASE_Z,BASE_H).cut(cylinder(SPEAKER_CUT_D/2,BASE_H+.4,z=-.2))
    fix=[(SPEAKER_PCD/2*math.cos(math.radians(a)),SPEAKER_PCD/2*math.sin(math.radians(a))) for a in (45,135,225,315)]
    s=cut_xy_holes(s,fix,1.85,-.1,BASE_H+.3)
    for x,y in fix:s=s.cut(cylinder(3.25,2.2,x,y,-.1))
    for x,y in JOIN_SCREWS:s=s.cut(cylinder(1.8,BASE_H+.3,x,y,-.1))
    for x,y in [(-49,-49),(49,-49),(-34,50),(34,50)]:
        s=s.union(cylinder(8,FOOT_H,x,y,-FOOT_H))
    return s

def caisson():
    s=shell(BASE_H,CAISSON_H)
    for x,y in JOIN_SCREWS:
        s=linked_post(s,x,y,BASE_H,13,5.8)
        s=linked_post(s,x,y,BASE_H+CAISSON_H-12,12,5.8)
        s=s.cut(cylinder(1.4,13.4,x,y,BASE_H-.15))
        s=s.cut(cylinder(1.4,12.4,x,y,BASE_H+CAISSON_H-12-.2))
    return s

def separation():
    s=slab(DIVIDER_Z,DIVIDER_H)
    s=cut_xy_holes(s,JOIN_SCREWS,1.75,DIVIDER_Z-.1,DIVIDER_H+.25)
    s=s.cut(cylinder(2.5,DIVIDER_H+.4,0,52,DIVIDER_Z-.2))
    return s

def corps():
    s=shell(BODY_Z,BODY_TOP-BODY_Z)
    s=s.cut(axis_y_cylinder(23.7,15,0,FRONT_Y-1,SCREEN_Z))
    s=s.cut(axis_y_cylinder(30.0,1.45,0,FRONT_Y-.1,SCREEN_Z))
    s=s.cut(axis_y_cylinder(28.3,9.4,0,FRONT_Y+2.1,SCREEN_Z))
    for x in (-33.0,33.0):
        s=s.union(axis_y_cylinder(5.7,12.5,x,FRONT_Y+3.5,SCREEN_Z))
        s=s.cut(axis_y_cylinder(1.25,11.5,x,FRONT_Y+5,SCREEN_Z))
    for x,y in JOIN_SCREWS:
        s=linked_post(s,x,y,BODY_Z,12,5.5)
        s=s.cut(cylinder(1.4,12.4,x,y,BODY_Z-.1))
        s=linked_post(s,x,y,BODY_TOP-10,10,5.5)
        s=s.cut(cylinder(1.4,10.4,x,y,BODY_TOP-10-.1))
    for zz in (58,64,70):
        box=cq.Workplane('XY').box(15,15,1.6).translate((-79,2,zz))
        s=s.cut(box)
    s=s.cut(cq.Workplane('XY').box(20,22,10).translate((0,77,61)))
    return s

def dessus_xvf():
    s=slab(BODY_TOP,TOP_H)
    s=s.cut(cylinder(50.8,6.6,z=BODY_TOP-.2))
    s=s.cut(cylinder(48.9,TOP_H+.3,z=BODY_TOP-.15))
    s=s.cut(cylinder(53.2,1.85,z=BODY_TOP+TOP_H-1.8))
    for x,y in TOP_SCREWS:
        s=s.cut(cylinder(1.75,TOP_H+.4,x,y,BODY_TOP-.2))
        s=s.cut(cylinder(3.2,2.2,x,y,BODY_TOP+TOP_H-2.1))
    return s

def plexi():
    s=cylinder(53,1.5)
    for x in (-33,33):
        for y in (-33,33):s=s.cut(cylinder(4.2,1.9,x,y,-.2))
    for a in (45,135,225,315):
        for dt in (-8,8):
            ang=math.radians(a+dt)
            s=s.cut(cylinder(1.6,1.9,44*math.cos(ang),44*math.sin(ang),-.2))
    return s

def retainer_ecran():
    s=cylinder(35.5,3.0)
    s=s.cut(cylinder(25,3.3,z=-.1))
    for x in (-33,33):s=s.cut(cylinder(1.6,3.3,x,0,-.1))
    s=s.cut(cq.Workplane('XY').box(16,13,4).translate((0,-30,1.5)))
    return s

def front_trim():
    s=cylinder(29.7,1.1).cut(cylinder(23.7,1.4,z=-.1))
    return s

def assembled():
    parts=[base_hp(),caisson(),separation(),corps(),dessus_xvf(),
           plexi().translate((0,0,BODY_TOP+TOP_H-1.55)),
           front_trim().rotate((0,0,0),(1,0,0),-90).translate((0,FRONT_Y-.04,SCREEN_Z))]
    return cq.Compound.makeCompound([s.val() for s in parts])

PARTS={
 '01_socle_HP_vers_le_bas':base_hp,
 '02_chambre_acoustique':caisson,
 '03_cloison_etanche':separation,
 '04_corps_facade_plate_ecran_encastre':corps,
 '05_couronne_superieure_XVF':dessus_xvf,
 '06_support_arriere_ecran':retainer_ecran,
 '07_bague_facade_optionnelle':front_trim,
 '08_gabarit_plexiglas_NE_PAS_IMPRIMER':plexi,
}
if __name__=='__main__':
    print('REFERENCE_SHAPE',list(map(lambda x:round(x,2),PROFILE.bounds)), 'front', FRONT_HALF_WIDTH*2, 'height',BODY_TOP+TOP_H+FOOT_H, flush=True)
    for name,fn in PARTS.items():
        print('EXPORT',name,flush=True)
        s=fn()
        print('  solids',len(s.solids().vals()),'valid',s.val().isValid(),'volume',round(s.val().Volume()),flush=True)
        if not s.val().isValid(): raise ValueError('Invalid '+name)
        cq.exporters.export(s,str(OUT/(name+'.stl')),tolerance=.14,angularTolerance=.20)
        cq.exporters.export(s,str(OUT/(name+'.step')))
    a=assembled();cq.exporters.export(a,str(OUT/'00_ENSEMBLE_V5_VISUALISATION.stl'),tolerance=.15,angularTolerance=.22)
    cq.exporters.export(a,str(OUT/'00_ENSEMBLE_V5_VISUALISATION.step'))
    cq.exporters.export(a,str(OUT/'00_KIMIA_VOICE_V5_GITHUB.stl'),tolerance=.15,angularTolerance=.22)
    print('TERMINE V5')