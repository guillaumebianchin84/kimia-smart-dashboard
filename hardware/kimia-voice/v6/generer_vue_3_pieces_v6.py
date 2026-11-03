"""KIMIA Voice V6: three principal real CAD parts for GitHub 3D viewing.

Does not alter or regenerate the geometry; reads STEP exported by
`generer_fixations_v6.py` to assemble a vertically exploded STL.
Coordinates: +Z up, X left-right, -Y front.
"""
from pathlib import Path
import cadquery as cq

OUT=Path(__file__).resolve().parent
FILES=(
    ('01_socle_HP_vers_le_bas', 0.0),
    ('02_caisson_cylindrique_avec_ancrages', 40.0),
    ('03_coque_blanche_continue_ecran', 140.0),
)

def export():
    shapes=[]
    prev_top=None
    for stem,z_offset in FILES:
        path=OUT / (stem+'.step')
        assert path.exists(),f'Missing required STEP: {path}'
        model=cq.importers.importStep(str(path))
        assert len(model.solids().vals())==1,f'Expected one independent solid: {stem}'
        moved=model.translate((0,0,z_offset)).val()
        assert moved.isValid(),f'Invalid STEP: {stem}'
        if prev_top is not None:
            assert moved.BoundingBox().zmin>prev_top+10.0,'Exploded views overlap'
        prev_top=moved.BoundingBox().zmax
        shapes.append(moved)
    compound=cq.Compound.makeCompound(shapes)
    assert compound.isValid() and len(compound.Solids())==3
    target=OUT/'00_KIMIA_V6_3_PIECES_VUE_ECLATEE.stl'
    cq.exporters.export(compound,str(target),tolerance=.14,angularTolerance=.20)
    print('Exported 3 distinct, vertically exploded components:', target)

if __name__=='__main__':
    export()
