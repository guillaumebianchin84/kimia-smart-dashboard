"""KIMIA Voice V2 - Pebble triangular chassis, parametric proof of concept.
A physical assembly validation is required, especially XVF microphone positions,
connectors, PCB mounts, Waveshare LCD clearance and acoustic output.
CadQuery>=2.4, mm. Axis: Z up, front = negative Y.
"""
import math
from pathlib import Path
import cadquery as cq

D=Path(__file__).resolve().parent
# Measured from producer drawings/catalogues
XVF_DIAM=100.0
XVF_MOUNT_R=math.sqrt(2)*33  # provisional: drawing shows holes (+/-33,+/-33)
SCREEN_PCB_DIAM=55.0
SCREEN_ACTIVE_DIAM=45.68
SPK_BOLT_R=37.0 # Visaton FR7 hole circle 74 mm
SPK_CUT_DIAM=61.0
# Production/prototype adjustable params
Z_BASE=0.0; BASE_H=5.0
ACOUST_H=34.0; Z_BULK=39.0; BULK_H=4.0
Z_BODY=43.0; BODY_H=59.0
Z_TOP=102.0; TOP_H=9.0
FOOT_H=12.0
SCREEN_CENTER_Z=72.0
# Smooth rounded triangular pebble in plan; inner radius must contain PCB 100 mm.
N=120
R_MAIN=70.0
R_LOBE=12.0
WALL=3.7
ASSEMBLY_ANGLES=(0,120,240)

def shape_r(angle,z):
    # Small broadening in middle of shell, flat PCB support on top.
    radius=R_MAIN+R_LOBE*math.cos(3*(angle-math.pi/2))
    # The upper radius minimum should remain >=~57.0 to seat the plexiglass.
    fullness={0:.965,5:.965,39:1.015,43:1.020,73:1.025,102:1.000,111:1.000}.get(round(z),1.0)
    return radius*fullness

def coords(z, inset=0.0):
    return [((shape_r(a,z)-inset)*math.cos(a),(shape_r(a,z)-inset)*math.sin(a)) for a in (2*math.pi*i/N for i in range(N))]

def loft(levels,inset=0.0):
    wp=cq.Workplane('XY')
    for k,z in enumerate(levels):
        if k==0:wp=wp.workplane(offset=z)
        else:wp=wp.workplane(offset=z-levels[k-1])
        wp=wp.polyline(coords(z,inset)).close()
    return wp.loft(combine=True,ruled=True)

def disk(radius,height,z=0,x=0,y=0):
    return cq.Workplane('XY').center(x,y).circle(radius).extrude(height).translate((0,0,z))

def screws(radius=64.0):
    return [(radius*math.cos(math.radians(a)),radius*math.sin(math.radians(a))) for a in ASSEMBLY_ANGLES]

def subtract_holes(body,centers,radius,z,height):
    for x,y in centers: body=body.cut(disk(radius,height,z,x,y))
    return body

def shell(levels):
    s=loft(levels)
    inner=loft([levels[0]-0.05]+levels+[levels[-1]+0.05],WALL) if False else loft(levels,WALL)
    return s.cut(inner)

def speaker_base():
    b=loft([0,BASE_H])
    b=b.cut(disk(SPK_CUT_DIAM/2,BASE_H+1,-.5))
    speaker_pts=[(SPK_BOLT_R*math.cos(math.radians(a)),SPK_BOLT_R*math.sin(math.radians(a))) for a in (45,135,225,315)]
    b=subtract_holes(b,speaker_pts,1.75,-0.1,BASE_H+.3)
    for x,y in speaker_pts:
        b=b.cut(cq.Workplane('XY').center(x,y).polygon(6,6.8).extrude(2.65).translate((0,0,-.05)))
    for x,y in screws():
        b=b.cut(disk(1.75,BASE_H+.2,-.1,x,y))
        b=b.cut(disk(3.15,2.9,-.02,x,y))
    # Three feet keep sound path to table, base intentionally contains no front grill.
    for x,y in [(0,52),(-44,-38),(44,-38)]:
        b=b.union(disk(8,FOOT_H,-FOOT_H,x,y))
    return b

def acoustic_wall():
    s=shell([5.0,23.0,39.0])
    for x,y in screws():
        # Slightly offset inward reinforced M3 pilot posts
        s=s.union(disk(5.25,13,5.0,x,y)).union(disk(5.25,12,27,x,y))
        s=s.cut(disk(1.35,13.4,4.8,x,y)).cut(disk(1.35,13,26.7,x,y))
    return s

def divider():
    s=loft([Z_BULK,Z_BULK+BULK_H])
    # Service wire feed-through to be SEALED after wiring speaker.
    s=s.cut(disk(2.4,BULK_H+.5,Z_BULK-.2,0,48))
    for x,y in screws():s=s.cut(disk(1.75,BULK_H+.5,Z_BULK-.2,x,y))
    # Upper shell fixations intentionally distinct positions from acoustic fasteners.
    for a in (60,180,300):
        r=63.5; x=r*math.cos(math.radians(a));y=r*math.sin(math.radians(a))
        s=s.cut(disk(1.7,BULK_H+.5,Z_BULK-.2,x,y))
    return s

def upper_wall():
    s=shell([43.0,73.0,102.0])
    # Three M3 supports from acoustic divider; keep outside central electronics.
    for a in (60,180,300):
        r=63.5;x=r*math.cos(math.radians(a));y=r*math.sin(math.radians(a))
        s=s.union(disk(5.25,12,43,x,y)).cut(disk(1.35,12.5,42.8,x,y))
    # Top frame support posts
    for x,y in screws(64.5):
        s=s.union(disk(5,9,93,x,y)).cut(disk(1.35,10,93,x,y))
    # Two horizontal anchor bosses for the detachable LCD pod. Their rear sides
    # fuse to the upper wall; no screw or hole enters the acoustic chamber.
    for x in (-30.6,30.6):
        boss=cq.Workplane('XZ').center(x,SCREEN_CENTER_Z).circle(5.0).extrude(10.0).translate((0,-56.0,0))
        s=s.union(boss)
        pilot=cq.Workplane('XZ').center(x,SCREEN_CENTER_Z).circle(1.2).extrude(11.0).translate((0,-55.0,0))
        s=s.cut(pilot)
    # Screen module stays INSIDE detachable external bezel/pod. Only cable entry
    # passes upper shell. Thus NO opening to the sealed lower acoustic chamber.
    # This cable hole is horizontal, on front face at screen center.
    passage=cq.Workplane('XZ').center(0,SCREEN_CENTER_Z).circle(8).extrude(100,both=True).translate((0,-65,0))
    # Restrict hole to front slice! Otherwise it would pierce back too.
    limit=cq.Workplane('XY').box(42,45,30).translate((0,-66,SCREEN_CENTER_Z))
    s=s.cut(passage.intersect(limit))
    # Side ventilation for SHT45 sensor: outside the acoustic chamber
    for z in (51,56,61):
        vent=cq.Workplane('XY').box(18,3,1.8).translate((69,0,z))
        s=s.cut(vent)
    # Rear I/O cable passage (provisional until actual connection choice)
    rear=cq.Workplane('XY').box(18,26,10).translate((0,77,58))
    s=s.cut(rear)
    return s

def top_ring():
    s=loft([Z_TOP,Z_TOP+TOP_H])
    # PCB insert from underneath Ø101.6, 100mm XVF PCB remains flat.
    s=s.cut(disk(50.9,6.7,Z_TOP-.2))
    # Above PCB, clear air window. Open mic path through plexi (later drilled).
    s=s.cut(disk(49.25,TOP_H+0.2,Z_TOP-.1))
    # Plexiglass outside diameter Ø106, rebate depth 1.8 mm.
    s=s.cut(disk(53.35,1.95,Z_TOP+TOP_H-1.9))
    # Assembly bolts on ring OUTSIDE plexiglass, three anchors
    for x,y in screws(64.5):
        s=s.cut(disk(1.75,TOP_H+.4,Z_TOP-.2,x,y))
        s=s.cut(disk(3.05,2.0,Z_TOP+TOP_H-2,x,y))
    return s

def glass_template():
    # CAD cut template only: smoked acrylic 1.5mm, no opaque printed lens.
    b=disk(53.0,1.5)
    # Mic center location PROVISIONAL, to align from REAL PCB first.
    for x in (-33,33):
        for y in (-33,33):
            b=b.cut(disk(4.2,1.8,-.1,x,y))
    # 4 small surrounding groups to improve air opening, *not* precise mic mapping
    for a in (45,135,225,315):
        for da in (-8,8):
            t=math.radians(a+da)
            b=b.cut(disk(1.65,1.8,-.1,44*math.cos(t),44*math.sin(t)))
    return b

def screen_bezel():
    # Printable front-mounted cup, local Z = depth toward rear (install rotated).
    # Outer Ø67, depth 12mm, with rear module loading pocket Ø55.8.
    b=disk(33.5,12.0)
    try: b=b.edges('>Z').fillet(1.6)
    except: pass
    b=b.cut(disk(23.20,2.2,-.1))
    b=b.cut(disk(28.0,10.1,2.0))
    # Opposing side screw pilot holes for backing bracket
    for x in (-30.6,30.6):
        b=b.cut(disk(1.55,12.4,-.2,x,0))
        b=b.cut(disk(2.7,2.0,-.1,x,0))
    return b

def screen_retainer():
    b=disk(33,3.0)
    b=b.cut(disk(24.9,3.4,-.2))
    for x in (-30.6,30.6):b=b.cut(disk(1.5,3.4,-.2,x,0))
    # Flat cable exit relief
    b=b.cut(cq.Workplane('XY').box(20,8,4).translate((0,-29,1.5)))
    return b

def screen_to_world(obj):
    # local XY screen front plane; local +Z goes backward (+Y).
    # Front at y=-73.0. The back extends toward shell; adhesives/bracket are
    # necessary because curved galet surface isn't a flat mounting plane.
    return obj.rotate((0,0,0),(1,0,0),-90).translate((0,-73,SCREEN_CENTER_Z))

def assembly():
    # Preview, with screen and plexi placed; no real electronics installed.
    parts=[speaker_base(),acoustic_wall(),divider(),upper_wall(),top_ring(),
           screen_to_world(screen_bezel()),screen_to_world(screen_retainer().translate((0,0,11))),
           glass_template().translate((0,0,109.0))]
    return cq.Compound.makeCompound([v.val() for v in parts])

PARTS={
 '01_socle_FR7_downfiring':speaker_base,
 '02_caisson_acoustique':acoustic_wall,
 '03_cloison_etanche':divider,
 '04_corps_galet_electronique':upper_wall,
 '05_couronne_XVF3800_plexiglas':top_ring,
 '06_logement_ecran_rond_185':screen_bezel,
 '07_retention_arriere_ecran':screen_retainer,
 '08_gabarit_plexi_fume_NON_IMPRIMER':glass_template,
}
if __name__=='__main__':
    for name,fn in PARTS.items():
        print('GENERER',name,flush=True)
        obj=fn()
        print('  solids',len(obj.solids().vals()),'valid',obj.val().isValid(), 'volume',round(obj.val().Volume()),flush=True)
        cq.exporters.export(obj,str(D/(name+'.stl')),tolerance=.12,angularTolerance=.19)
        cq.exporters.export(obj,str(D/(name+'.step')))
    print('FINI ; assembler la vue avec creer_apercu_v2.py',flush=True)