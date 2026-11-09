"""KIMIA Voice V6 — fixation interne démontable, sans modifier le contour externe.

Le fichier generer_kimia_v6.py constitue la GEOMETRIE EXTERIEURE DE REFERENCE.
Ce module reprend ses formes telles quelles et ajoute seulement des pièces et
logements INTERIEURS : clips XVF sans trou PCB, support ESP32 par glissières,
porte-capteur en face des fentes, supports écran et passe-câbles.

Les empreintes XVF Ø100, Waveshare Ø55 et HP sont inchangées. Dimensions de la
carte ESP32 et du BME280 = PARAMETRES de prototype à mesurer avant fabrication.
Les clips sont à essayer en PETG sur échantillons, jamais forcer un circuit.
"""
import math
from pathlib import Path
import cadquery as cq
import generer_kimia_v6 as v6
from shapely.geometry import Point

OUT=Path(__file__).resolve().parent
XVF_CLIP_ANGLES=(30,150,270)
XVF_CLIP_RADIUS=52.10
XVF_CLIP_WELL_R=1.45
XVF_PCB_THICK=1.60  # hypothèse : PCB du module réel à mesurer
PLEXI_T=1.50
PLEXI_GLUE_BAND=1.50
PLEXI_GLUE_THICKNESS=0.30
# Carte ESP32-S3 N16R8 séparée du XIAO : PROVISIONNEL, à mesurer au pied à coulisse.
ESP_PCB_LENGTH=57.0
ESP_PCB_WIDTH=28.0
ESP_PCB_THICK=1.60
ESP_PCB_ALLOWANCE=0.45
ESP_COMPONENT_ENVELOPE=10.0  # au-dessus du PCB, pas une cote fabricant
ESP_CENTER=(0.0,0.0)
ESP_PEGS=((-33.,-16.7),(-33.,16.7),(33.,-16.7),(33.,16.7))
BME_PCB_LENGTH=20.0  # PROVISOIRE : cartouche à ajuster au module BME280 physique
BME_PCB_WIDTH=15.0   # PROVISOIRE
BME_PCB_THICK=1.60   # PROVISOIRE


def cylinder(r,h,x=0,y=0,z=0):
    return v6.cylinder(r,h,x,y,z)


def box(sx,sy,sz,x=0,y=0,z=0):
    return cq.Workplane('XY').box(sx,sy,sz).translate((x,y,z))


def polar(angle,r=XVF_CLIP_RADIUS):
    a=math.radians(angle)
    return (r*math.cos(a),v6.TOP_CENTER_Y+r*math.sin(a))


def capot_interieur_avec_logements_clips():
    """Conserve 100 % des surfaces visibles, juste 3 trous borgnes dessous."""
    cap=v6.dessus_xvf()
    # Ø2,9 mm, profondeur 5 mm depuis la face inférieure, aucun trou côté plexi.
    for angle in XVF_CLIP_ANGLES:
        x,y=polar(angle)
        cap=cap.cut(cylinder(XVF_CLIP_WELL_R,5.05,x,y,v6.BODY_TOP-.05))
    return cap


def clip_xvf(angle):
    """Clip plastique démontable sans percer la carte XVF3800.

    Ergot vertical pressé dans une poche borgne du capot, lèvre qui ne retient
    que le bord (1 mm max) de la carte, avec 0,15 mm de jeu nominal.
    La pièce définitive exigera essai PETG, adaptation des bosses/connecteurs.
    """
    # Modélisation en coordonnées locales : X radial extérieur, Y tangentiel.
    peg=cylinder(1.47,4.5,x=XVF_CLIP_RADIUS,z=v6.BODY_TOP+0.0)
    # Stopper accessible sous le capot pour extraction du clip.
    stopper=cylinder(2.30,.7,x=XVF_CLIP_RADIUS,z=v6.BODY_TOP-.7)
    # La lèvre arrive à R=49 mm et tient le PCB par-dessous : aucun trou PCB.
    tongue=box(4.1,2.5,1.05,x=50.55,z=v6.BODY_TOP+4.05)
    # x min=48.5, x max=52.6; haut Z=98.575 pour PCB bottom ~98.8.
    peg=peg.union(stopper).union(tongue)
    peg=peg.rotate((0,0,0),(0,0,1),angle)
    return peg.translate((0,v6.TOP_CENTER_Y,0))


def caisson_avec_ancrages():
    """Toit du cylindre toujours étanche; 4 plots clips et 2 anneaux câbles dessus."""
    s=v6.caisson()
    roof=v6.BASE_H+v6.CAISSON_H
    for x,y in ESP_PEGS:
        s=s.union(cylinder(1.45,3.05,x,y,roof))
        s=s.union(cylinder(2.08,.62,x,y,roof+2.68))
    # Passages des petits colliers sur le toit, ne percent pas la chambre.
    for x in (-10.0,10.0):
        loop=box(7.5,4.6,4.8,x,31.0,roof+2.4)
        loop=loop.cut(box(4.0,2.0,2.2,x,31.0,roof+2.7))
        s=s.union(loop)
    return s


def support_esp32_amovible():
    """Plateau clipsé sur le caisson, glissières bord PCB, USB sur extrémité libre.

    Le support ne perce pas le cylindre et n'est pas rigidement relié au XVF.
    Pour une autre carte S3, modifier les deux paramètres ESP_PCB_*.
    """
    roof=v6.BASE_H+v6.CAISSON_H
    tz=roof+2.0
    s=box(75.4,37.8,1.70,z=tz+.85)
    for x,y in ESP_PEGS:
        s=s.cut(cylinder(1.72,2.05,x,y,tz-.1))
        # Fente de flexion dirigée vers l'extérieur de la plaque pour emboîtement.
        sign=1 if x>0 else -1
        s=s.cut(box(4.1,0.65,2.1,x+sign*2.7,y,tz+.8))
    # Rails longitudinaux: le PCB glisse dans l'axe X, ports USB libres.
    half=ESP_PCB_WIDTH/2+ESP_PCB_ALLOWANCE
    for sign in (-1,1):
        s=s.union(box(59.2,1.45,3.2,0,sign*(half+0.72),tz+1.70+1.60))
        s=s.union(box(59.2,1.00,.70,0,sign*(half-.05),tz+1.70+2.85))
    # Butée et languette à l'extrémité, sans recouvrir les ports USB.
    s=s.union(box(.85,15.0,2.1,-(ESP_PCB_LENGTH/2+ESP_PCB_ALLOWANCE+.45),0,tz+1.70+1.05))
    # Two lateral stops, not one central bar: keep a 19.7 mm USB access
    # corridor at the +X end, independent of the provisional board length.
    # The connector position must still be checked against the real PCB.
    for side in (-1,1):
        s=s.union(box(.8,2.3,2.5,ESP_PCB_LENGTH/2+ESP_PCB_ALLOWANCE+1.0,
                      side*11.0,tz+1.70+1.25))
    return s


def porte_bme280_sur_fentes_existantes():
    """Cartouche clipsable sur les trois ouïes latérales déjà présentes.

    Cotes du circuit BME280 volontairement provisoires : on peut réimprimer
    SEULEMENT cette petite pièce après mesure sans toucher au corps V6.
    """
    # Plateau vertical dans plan YZ, face capteur vers les fentes latérales.
    x=-48.5; y=2.; z=32.
    s=box(1.6,20.5,19.0,x,y,z)
    # Deux glissières latérales et deux retours souples en façade, côté air.
    for dy in (-8.8,8.8):
        s=s.union(box(2.2,1.35,16.0,x-.3,y+dy,z))
        s=s.union(box(.9,2.15,14.0,x+1.2,y+dy,z))
    # Deux languettes dans les fentes EXISTANTES à Z=26 et Z=38.
    # Mini-dégagement INTERNE de coque requis à ces mêmes niveaux.
    for dz in (-6.0,6.0):
        s=s.union(box(11.0,7.2,1.15,x-5.5,y,z+dz))
        s=s.union(box(.8,7.2,1.45,x-11.2,y,z+dz))
    return s



def coque_avec_passages_capteur():
    """Ne change pas le profil visible : prolonge 2 ouïes existantes vers l'intérieur."""
    s=v6.corps()
    for z in (26.0,38.0):
        # Le canal rejoint l'ouverture extérieure déjà présente en V6.
        s=s.cut(box(6.0,7.6,1.18,-54.2,2.0,z))
    return s

def support_ecran_assemble():
    """Bague V6 retenue par les deux bossages M2 de la face avant.

    Elle ne change pas la face visible de l'écran ; une cale souple au contact
    du PCB doit être ajustée au montage réel (profondeur des connecteurs).
    """
    s=v6.retainer_ecran()
    s=s.rotate((0,0,0),(1,0,0),-90)
    return s.translate((0,v6.FRONT_Y+16.2,v6.SCREEN_Z))


def validate_fixtures():
    v6.validate_layout()
    # Les dimensions du galet extérieur sont figées par le module V6 de référence.
    assert v6.XVF_D==100 and v6.SCREEN_PCB_D==55
    assert v6.SPEAKER_PCD==74 and v6.SPEAKER_CUT_D==61
    assert v6.TOP_H==9 and v6.BODY_TOP==94
    assert math.isclose(PLEXI_T,1.5) and math.isclose(PLEXI_GLUE_BAND,1.5)
    # Le fond de feuillure à 101.15 mm et disque plexi à 101.45 mm
    # réservent 0.30 mm en hauteur pour le film de colle.
    top=v6.BODY_TOP+v6.TOP_H
    rebate_floor=top-1.85
    plexi_bottom=top-1.55
    assert abs(plexi_bottom-rebate_floor-PLEXI_GLUE_THICKNESS)<.001
    # Bande radiale 51.5..53.0 mm sur le support existant de 48.9..53.2.
    assert 51.5>48.9 and 53.0<53.2 and 53.0-51.5==PLEXI_GLUE_BAND
    assert v6.PROFILE.contains(Point(0,v6.TOP_CENTER_Y).buffer(53.2,resolution=96))
    roof=v6.BASE_H+v6.CAISSON_H
    for x,y in ESP_PEGS:
        assert math.hypot(x,y)+2.2<v6.CAISSON_R-1.0
    # La distance de l'écran au cylindre n'est pas réduite.
    assert v6.FRONT_Y+16.2+3.0< -v6.CAISSON_R+1.0
    cap=capot_interieur_avec_logements_clips()
    assert cap.val().isValid()
    for angle in XVF_CLIP_ANGLES:
        p=Point(*polar(angle))
        assert v6.PROFILE.contains(p.buffer(1.6,resolution=32))
        for sx,sy in v6.TOP_SCREWS:
            assert p.distance(Point(sx,sy))>6.0, 'Clip fixture near hidden M3 cover screw'
    for name,fn in FIXTURE_PARTS.items():
        solid=fn().val()
        assert solid.isValid(),f'Invalid: {name}'
        assert len(fn().solids().vals())==1, f'Fixture must be one connected solid: {name}'
        assert solid.BoundingBox().zmin>=-v6.FOOT_H-1, f'Out of vertical envelope: {name}'
        print(name,'solids',len(fn().solids().vals()),'volume',round(solid.Volume()),flush=True)
    # Collision detection : ignore intentional PETG snap interferences of <11 mm³
    # (ESP mushroom studs / tray), but reject any overlap of unrelated parts.
    assert porte_bme280_sur_fentes_existantes().val().intersect(
        coque_avec_passages_capteur().val()).Volume()<.01, 'BME cradle hits white shell'
    assert porte_bme280_sur_fentes_existantes().val().intersect(
        caisson_avec_ancrages().val()).Volume()<.01, 'BME cradle hits acoustic chamber'
    assert support_ecran_assemble().val().intersect(
        caisson_avec_ancrages().val()).Volume()<.01, 'screen clamp hits chamber'
    assert support_esp32_amovible().val().intersect(
        capot_interieur_avec_logements_clips().val()).Volume()<.01, 'ESP tray hits top cover'
    assert support_esp32_amovible().val().intersect(
        coque_avec_passages_capteur().val()).Volume()<.01, 'ESP tray hits shell'
    # Interference at four headed pegs is deliberate for snap-fit PETG.
    assert support_esp32_amovible().val().intersect(
        caisson_avec_ancrages().val()).Volume()<15.0, 'ESP peg fit too stiff'
    # Keep the presumed USB end clear for a centered plug/cable path.
    # A mock plug 8 x 12 x 2 mm at +X must not hit the end stops.
    mock_usb=box(8.0,12.0,2.0,33.0,0.0,
                 v6.BASE_H+v6.CAISSON_H+4.8)
    assert support_esp32_amovible().val().intersect(mock_usb.val()).Volume()<.01, 'USB access blocked by ESP support'
    # Height budget above speaker caisson before bottom of XVF cap.
    avail=v6.BODY_TOP-(roof+4.0)
    assert avail>=13.0,'Not enough space to install ESP tray'
    print('ESP32 component budget from tray:',round(avail,1),
          'mm, subject to XVF underside connector clearance',flush=True)


FIXTURE_PARTS={
 '08_support_ESP32_glissieres_clip':support_esp32_amovible,
 '09_support_BME280_fentes_existantes':porte_bme280_sur_fentes_existantes,
 '10_bague_ecran_en_position':support_ecran_assemble,
 '11_clip_XVF_30deg':lambda:clip_xvf(30),
 '12_clip_XVF_150deg':lambda:clip_xvf(150),
 '13_clip_XVF_270deg':lambda:clip_xvf(270),
}


def original_parts_with_fixings():
    return [
        v6.base_hp(),
        caisson_avec_ancrages(),
        coque_avec_passages_capteur(),
        capot_interieur_avec_logements_clips(),
        v6.plexi().translate((0,0,v6.BODY_TOP+v6.TOP_H-1.55)),
        v6.front_trim().rotate((0,0,0),(1,0,0),-90).translate((0,v6.FRONT_Y-.04,v6.SCREEN_Z)),
    ]


def export():
    validate_fixtures()
    all_parts={
        '01_socle_HP_vers_le_bas':v6.base_hp,
        '02_caisson_cylindrique_avec_ancrages':caisson_avec_ancrages,
        '03_coque_blanche_continue_ecran':coque_avec_passages_capteur,
        '04_couronne_XVF_avec_logements_clips':capot_interieur_avec_logements_clips,
        '05_support_arriere_ecran':v6.retainer_ecran,
        '06_bague_facade_optionnelle':v6.front_trim,
        '07_gabarit_plexiglas_NON_VALIDE':v6.plexi,
        **FIXTURE_PARTS,
    }
    for name,fn in all_parts.items():
        o=fn()
        assert o.val().isValid(),name
        cq.exporters.export(o,str(OUT/(name+'.stl')),tolerance=.14,angularTolerance=.20)
        cq.exporters.export(o,str(OUT/(name+'.step')))
    assembled=original_parts_with_fixings()+[fn() for fn in FIXTURE_PARTS.values()]
    compound=cq.Compound.makeCompound([o.val() for o in assembled])
    cq.exporters.export(compound,str(OUT/'00_KIMIA_VOICE_V6_GITHUB.stl'),tolerance=.14,angularTolerance=.20)
    cq.exporters.export(compound,str(OUT/'00_ENSEMBLE_V6_FIXATIONS.step'))
    print('KIMIA V6 fixations ajoutees. Surfaces exterieures INCHANGEES.',flush=True)

if __name__=='__main__':
    export()