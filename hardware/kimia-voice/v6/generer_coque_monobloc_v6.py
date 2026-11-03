"""KIMIA Voice V6 — one-piece white body with integrated XVF crown.

Same approved exterior and acrylic rebate, no cap screws. XVF clips install
from below before inserting the sealed speaker chamber. Acrylic glued last.
Physical PCB measurements, snap stiffness and acoustic seals remain unverified.
"""
import math
from pathlib import Path
import cadquery as cq
import generer_kimia_v6 as v6
import generer_fixations_v6 as fx
from shapely.geometry import Point

OUT = Path(__file__).resolve().parent
# Previous front lower screw bosses partly obstructed the Ø100 XVF board
# when inserted from below. Move only two hidden BOTTOM bosses inward in Y.
# No change to outer surface, XVF, screen, acoustic cylinder, or acrylic.
UNDER_BASE_SCREWS = ((-28.0,-56.0), (28.0,-56.0),
                     (-15.0,50.0), (0.0,53.0))
XVF_CLIPS = (30,150,280)  # 280 avoids the inner front shell wall

def shell_mono():
    s=v6.shell(v6.BODY_Z,v6.BODY_TOP-v6.BODY_Z)
    # Preserve ALL front screen cutouts and mounts from the existing V6.
    for radius,length,y,z in (
        (23.7,15.0,v6.FRONT_Y-1,v6.SCREEN_Z),
        (30.0,1.45,v6.FRONT_Y-.1,v6.SCREEN_Z),
        (28.3,9.4,v6.FRONT_Y+2.1,v6.SCREEN_Z),
    ):
        s=s.cut(v6.axis_y_cylinder(radius,length,0,y,z))
    for x in (-33.0,33.0):
        s=s.union(v6.axis_y_cylinder(5.7,12.5,x,v6.FRONT_Y+3.5,v6.SCREEN_Z))
        s=s.cut(v6.axis_y_cylinder(1.25,11.5,x,v6.FRONT_Y+5,v6.SCREEN_Z))
    # Four SHORT blind-insert bosses, just for the bottom base.
    # The old full-height cap screw columns are no longer required.
    for x,y in UNDER_BASE_SCREWS:
        s=v6.linked_post(s,x,y,v6.BODY_Z,12,v6.BASE_BOSS_R)
        s=s.cut(v6.cylinder(v6.BASE_INSERT_R,4.8,x,y,v6.BODY_Z-.1))
    # Preserve existing ventilation and rear power opening.
    for z in (26,32,38):
        s=s.cut(cq.Workplane('XY').box(15,15,1.6).translate((-64,2,z)))
    s=s.cut(cq.Workplane('XY').box(20,22,10).translate((0,65,39)))
    for z in (26.0,38.0):
        s=s.cut(fx.box(6.0,7.6,1.18,-54.2,2.0,z))
    # Original XVF support and acrylic/glue rebate, directly fused to body.
    top=v6.slab(v6.BODY_TOP,v6.TOP_H)
    top=top.cut(v6.cylinder(50.8,6.6,y=v6.TOP_CENTER_Y,z=v6.BODY_TOP-.2))
    top=top.cut(v6.cylinder(48.9,v6.TOP_H+.3,y=v6.TOP_CENTER_Y,z=v6.BODY_TOP-.15))
    top=top.cut(v6.cylinder(53.2,1.85,y=v6.TOP_CENTER_Y,
                            z=v6.BODY_TOP+v6.TOP_H-1.8))
    # Blind pockets open from INSIDE to hold the module without PCB holes.
    for angle in XVF_CLIPS:
        x,y=fx.polar(angle)
        top=top.cut(v6.cylinder(fx.XVF_CLIP_WELL_R,5.05,
                                x,y,v6.BODY_TOP-.05))
    return s.union(top)

def base_mono():
    # Reuse original speaker base with four matching revised bottom screws,
    # but remove 3 superfluous long screwdriver holes from the old cap.
    old_base,old_top=v6.BASE_SCREWS,v6.JOIN_SCREWS
    try:
        v6.BASE_SCREWS=UNDER_BASE_SCREWS
        v6.JOIN_SCREWS=()
        return v6.base_hp()
    finally:
        v6.BASE_SCREWS,v6.JOIN_SCREWS=old_base,old_top

def test_and_export():
    s= shell_mono()
    base=base_mono()
    cyl=fx.caisson_avec_ancrages()
    assert len(s.solids().vals())==1 and s.val().isValid()
    assert len(base.solids().vals())==1 and base.val().isValid()
    assert s.val().BoundingBox().zmin==v6.BODY_Z
    assert s.val().BoundingBox().zmax==v6.BODY_TOP+v6.TOP_H
    assert 124.0<s.val().BoundingBox().xlen<125.0
    assert all(v6.PROFILE.contains(Point(x,y).buffer(v6.BASE_BOSS_R,
                    resolution=24)) for x,y in UNDER_BASE_SCREWS)
    for other,label in ((base,'base'),(cyl,'caisson')):
        overlap=s.val().intersect(other.val()).Volume()
        assert overlap<.01,(label,overlap)
    # Test movement of nominal XVF PCB THROUGH the entire inner shell
    # from underside to its top seat, with cylinder temporarily removed.
    for z in (5.,10.,14.,17.,25.,45.,80.,92.):
        moving=v6.cylinder(50.,1.6,y=v6.TOP_CENTER_Y,z=z)
        overlap=s.val().intersect(moving.val()).Volume()
        assert overlap<.02,('XVF insertion blocked',z,overlap)
    for angle in XVF_CLIPS:
        clip=fx.clip_xvf(angle)
        overlap=s.val().intersect(clip.val()).Volume()
        assert .15<overlap<2.5,('XVF clip socket inaccessible',angle,overlap)
    print('V6 MONOBLOC: CAD valid, upper-module insertion from below clear',flush=True)
    parts={
        '01_coque_blanche_monobloc_V6':s,
        '02_socle_bas_V6':base,
        '03_caisson_cylindrique_V6':cyl,
    }
    for name,part in parts.items():
        cq.exporters.export(part,str(OUT/(name+'.stl')),tolerance=.14,angularTolerance=.20)
        cq.exporters.export(part,str(OUT/(name+'.step')))
    stack=cq.Compound.makeCompound([s.val(),base.val(),cyl.val()])
    cq.exporters.export(stack,
        str(OUT/'00_KIMIA_V6_MONOBLOC_ASSEMBLAGE.stl'),tolerance=.14,angularTolerance=.20)
    exploded=cq.Compound.makeCompound([
        base.val(),cyl.translate((0,0,40)).val(),
        s.translate((0,0,140)).val()])
    cq.exporters.export(exploded,
        str(OUT/'00_KIMIA_V6_MONOBLOC_VUE_ECLATEE.stl'),tolerance=.14,angularTolerance=.20)
    print('Exterior unchanged; no separate crown, no long cap screws',flush=True)

if __name__=='__main__':
    test_and_export()
