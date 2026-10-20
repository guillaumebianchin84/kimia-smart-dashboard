"""Export de visualisation 3D pour GitHub (STL multi-pieces non imprimable comme un bloc).
Les STL individuels et les STEP sources figurent dans l'archive V1 et sont generes
par generer_kimia.py. La disposition des composants est indicative.
"""
import cadquery as cq
from pathlib import Path
from generer_kimia import screen_bezel, plexi_template, SPK_PLATE_H, LOW_H, DIV_H, UP_H, TOP_H

OUT = Path(__file__).resolve().parent
main = cq.importers.importStep(str(OUT / 'ensemble_apercu.step'))
# Cadre d'ecran face avant, perpendiculaire a la table.
screen_z = SPK_PLATE_H + LOW_H + DIV_H + 36.5
bezel = screen_bezel().rotate((0,0,0), (1,0,0), 90).translate((0,-55,screen_z))
# Plexiglas fume: representation geometrique (STL sans couleurs)
plexi_z = SPK_PLATE_H + LOW_H + DIV_H + UP_H + TOP_H - 2.05
plexi = plexi_template().translate((0,0,plexi_z))
parts=list(main.solids().vals())+[bezel.val(),plexi.val()]
assembled=cq.Compound.makeCompound(parts)
path=OUT/'00_VISUALISATION_ENSEMBLE_V1.stl'
cq.exporters.export(assembled,str(path),tolerance=0.22,angularTolerance=0.34)
print(path)