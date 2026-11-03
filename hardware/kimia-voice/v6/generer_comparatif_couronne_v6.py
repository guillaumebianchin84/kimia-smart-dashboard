"""KIMIA Voice V6 — comparison of removable crown and one-piece shell/crown.

Visualizations ONLY: never replace the validated reference CAD or export
the one-piece experimental version as ready-to-print. Every part comes from
the existing validated STEP geometry in generer_fixations_v6.py.
Coordinates: +Z up, front -Y, dimensions in mm.
"""
from pathlib import Path
import cadquery as cq

OUT=Path(__file__).resolve().parent
PARTS=(
    ("01_socle_HP_vers_le_bas", 0.0),
    ("02_caisson_cylindrique_avec_ancrages", 40.0),
    ("03_coque_blanche_continue_ecran", 140.0),
    ("04_couronne_XVF_avec_logements_clips", 160.0),
)

def read_step(name):
    file=OUT/(name+".step")
    if not file.exists():
        raise FileNotFoundError(file)
    item=cq.importers.importStep(str(file))
    solids=item.solids().vals()
    if len(solids)!=1 or not solids[0].isValid():
        raise AssertionError(f"Invalid mechanical source STEP: {name}")
    return item

def exploded_four():
    parts=[]
    previous=None
    for name, offset in PARTS:
        shifted=read_step(name).translate((0,0,offset)).val()
        bb=shifted.BoundingBox()
        if previous is not None and bb.zmin<=previous+10.0:
            raise AssertionError(f"Exploded components overlap vertically: {name}")
        previous=bb.zmax
        parts.append(shifted)
    assembled=cq.Compound.makeCompound(parts)
    assert assembled.isValid() and len(assembled.Solids())==4
    target=OUT/"00_KIMIA_V6_4_PIECES_VUE_ECLATEE.stl"
    cq.exporters.export(assembled,str(target),tolerance=.14,angularTolerance=.20)
    print("Four-piece exploded GitHub preview generated:",target,flush=True)

def shell_and_crown_one_piece_concept():
    """Study merging the existing shapes without editing original sources.

    This is an aesthetic/fabrication comparison only. Existing cap screw
    shafts, insert holes and clip accessibility would require redesign
    for a truly integrated, manufacturable housing.
    """
    shell=read_step("03_coque_blanche_continue_ecran")
    crown=read_step("04_couronne_XVF_avec_logements_clips")
    fused=shell.union(crown)
    solids=fused.solids().vals()
    assert len(solids)==1 and solids[0].isValid(), (
        f"Shell/crown did not form a single solid: {len(solids)}")
    target=OUT/"00_KIMIA_V6_ETUDE_COQUE_COURONNE_INTEGREES.stl"
    cq.exporters.export(fused,str(target),tolerance=.14,angularTolerance=.20)
    print("One-piece shell+crown concept ONLY (not fabrication-validated):",target,
          flush=True)

if __name__=="__main__":
    exploded_four()
    shell_and_crown_one_piece_concept()
