"""KIMIA V6 mechanical CAD assembly checks (mm).

Automated geometry checks are NOT a physical fit test. Connector keep-outs,
PCB thickness, flexing, real speaker mounting and acoustic seals remain
conditional on measuring the actual modules.
"""
from pathlib import Path
import cadquery as cq
import generer_kimia_v6 as v6
import generer_fixations_v6 as fx

HERE = Path(__file__).resolve().parent
PART = {
    "base": "01_socle_HP_vers_le_bas",
    "speaker_box": "02_caisson_cylindrique_avec_ancrages",
    "shell": "03_coque_blanche_continue_ecran",
    "top": "04_couronne_XVF_avec_logements_clips",
    "esp": "08_support_ESP32_glissieres_clip",
    "bme": "09_support_BME280_fentes_existantes",
    "screen": "10_bague_ecran_en_position",
    "clip30": "11_clip_XVF_30deg",
    "clip150": "12_clip_XVF_150deg",
    "clip270": "13_clip_XVF_270deg",
}

def part(name):
    return cq.importers.importStep(str(HERE / (PART[name] + ".step"))).val()

def clash(a, b):
    return a.intersect(b).Volume()

def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print("PASS", message, flush=True)

def run():
    s = {k: part(k) for k in PART}
    for k, shape in s.items():
        check(shape.isValid() and len(shape.Solids()) == 1, "watertight solid " + k)

    check(abs(s["shell"].BoundingBox().xlen - v6.PROFILE.bounds[2] +
              v6.PROFILE.bounds[0]) < 0.02, "exterior shell width unchanged")
    check(abs(s["shell"].BoundingBox().zmax - v6.BODY_TOP) < 0.01,
          "exterior shell height unchanged")
    check(abs(s["top"].BoundingBox().zmax - (v6.BODY_TOP+v6.TOP_H)) < .01,
          "upper cap height unchanged")

    unrelated = [
        ("base", "speaker_box"), ("base", "shell"), ("shell", "speaker_box"),
        ("shell", "top"), ("top", "speaker_box"), ("shell", "esp"),
        ("shell", "bme"), ("shell", "screen"), ("speaker_box", "screen"),
        ("top", "esp"), ("base", "bme"), ("speaker_box", "bme"),
    ]
    for a,b in unrelated:
        v = clash(s[a], s[b])
        check(v < .05, f"no collision {a}/{b}: {v:.3f} mm3")

    for k in ("clip30", "clip150", "clip270"):
        v = clash(s[k],s["top"])
        check(.1 < v < 2.5, f"nominal press fit {k}: {v:.3f} mm3")

    v = clash(s["esp"], s["speaker_box"])
    check(1 < v < 15, f"four intentional ESP snap pegs: {v:.3f} mm3")

    # The 3 cap screws are installed with a long driver inserted through
    # the bottom. Test a 5.8 mm tool shaft through the lower access region.
    for x,y in v6.JOIN_SCREWS:
        tool=v6.cylinder(2.9, v6.SCREW_SHOULDER_Z+.1,x,y,-.1).val()
        for target in ("base","shell","speaker_box","esp"):
            check(clash(tool,s[target]) < .05,
                  f"cap screwdriver shaft clear at {(x,y)} from {target}")

    # USB port may sit on +X end of the provisional ESP board.
    mock_usb = cq.Workplane("XY").box(8,12,2).translate((33,0,81.8)).val()
    check(clash(mock_usb,s["esp"]) < .05, "ESP +X centered USB plug access free")

    # Virtual XVF PCB in the clipped slot; PCB Ø100 x1.6 nominal. Unlike
    # successful clashing checks, this is only a hypothetical envelope.
    xvfp=v6.cylinder(v6.XVF_D/2,fx.XVF_PCB_THICK,
                      0,v6.TOP_CENTER_Y,98.7).val()
    check(clash(xvfp,s["top"]) < .05, "XVF nominal PCB clears upper cap")
    for k in ("clip30","clip150","clip270"):
        check(clash(xvfp,s[k]) < .05, "XVF nominal PCB clears "+k)

    # The screen back ring and white mounting bosses have ~0.2 mm clearance;
    # it MUST be compressed against measured pads/spacers after PCB receipt.
    gap=s["screen"].distance(s["shell"])
    check(gap < .4, f"screen back ring reaches its mounting bosses (gap {gap:.3f} mm)")
    print("WARN screen PCB axial depth and rear compression pad unmeasured",flush=True)
    print("WARN ESP / BME PCB and connector physical sizes provisional",flush=True)
    print("WARN acrylic mic ports and XVF clip positions require actual board",flush=True)
    print("WARN speaker nuts, feet 10 mm, adhesive seals and retention require dry fit",flush=True)
    print("KIMIA V6: CAD geometry checked; NOT certified physically assembled",flush=True)

if __name__ == "__main__":
    run()
