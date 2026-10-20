# KIMIA Voice by PROMAINT — Prototype de table V2

**Statut : CAO expérimentale, non validée sur un assemblage réel.** Les STL sont séparés pour impression et toutes les cotes sont en millimètres. La vue STL assemblée sert uniquement à la visualisation GitHub : elle ne constitue **pas** une pièce imprimable d'un seul bloc.

## Évolution par rapport à la V1

- Galet à empreinte triangulaire très arrondie (au lieu de la découpe circulaire).
- Hauteur diminuée de ~158 à **123 mm pieds compris** ; un caisson acoustique de **34 mm** est conservé.
- Écran rond 1,85" descendu sur la façade, dans une coupelle dédiée : il ne perce pas le caisson acoustique.
- Dessus horizontal pour le XVF3800 nu, grande ouverture Ø106 de plexiglas noir *translucide*, feuillure et emplacements de passages d'air des microphones.
- HP Visaton FR7 4 Ω dirigé vers le bas, pieds de 12 mm, cloison acoustique de 4 mm et passage de fils à rendre étanche.

## Encombrement de la V2

| Dimension | Valeur du modèle de visualisation |
|---|---:|
| Largeur extérieure | 155,4 mm |
| Profondeur, écran inclus | 157,1 mm |
| Hauteur totale pieds compris | 123 mm |
| Corps imprimé sous couvercle | 102 mm (hors pieds) |
| Sommet horizontal | z=102 à 111 mm |
| Chambre acoustique | z=5 à 39 mm |
| Cloison étanche | z=39 à 43 mm |
| Zone électronique | z=43 à 102 mm |
| Centre de l'écran | z=72 mm |
| Plexiglas | Ø106 × épaisseur 1,5 mm |

## Composants ciblés

- **XVF3800 Seeed nu : PCB Ø100 mm** et XIAO ESP32-S3 associé ; garder les quatre microphones à l'air libre. Les trous de montage de la carte et la hauteur du connecteur sont à vérifier avant impression définitive.
- **Visaton FR7 4 Ω** : empreinte approximative 66 mm ; ouvert acoustique Ø61 mm ; 4 vis M3 sur cercle Ø74 mm. Joint mousse EPDM conseillé entre la fixation et le plateau.
- **Waveshare 1.85inch Touch LCD Module** : encombrement PCB 55 × 55 mm, afficheur visible Ø45,68 mm, interface QSPI + tactile I²C. *Les GPIO libres et la compatibilité ESPHome simultanée au firmware XVF3800 ne sont PAS validés.* Ne pas acheter l'écran avant cette vérification.
- **SHT45, LD2410** : emplacements ventilés / zone radar réservés, **supports spécifiques non dimensionnés** tant que les modules exacts ne sont pas arrêtés.

## Détails de construction

1. `01_socle_FR7_downfiring`: platine de HP, 4 perçages/écrous M3, pieds acoustiques 12 mm.
2. `02_caisson_acoustique`: anneau légèrement galbé, hauteur 34 mm.
3. `03_cloison_etanche`: séparation HP/électronique et petit passage pour câble à étancher.
4. `04_corps_galet_electronique`: galet supérieur, points de montage, passage câble écran uniquement en zone électronique et passages d'aération.
5. `05_couronne_XVF3800_plexiglas`: couvercle horizontal, Ø101,8 de siège de PCB, Ø106,7 de feuillure de lentille.
6. `06_logement_ecran_rond_185`: coupelle avant Ø67 mm, module inséré par l'arrière.
7. `07_retention_arriere_ecran`: bague de maintien, dégagement provisoire de nappe.
8. `08_gabarit_plexi_fume_NON_IMPRIMER`: modèle du plexiglas, **ne pas utiliser comme pièce opaque imprimée**.

## Attention à la prise de son et au plexi

Les trous du modèle SVG/DXF ont été pré-positionnés **provisoirement**, à partir de la symétrie mécanique (centres à ±33/±33). Les trous visibles sur la carte ne sont pas forcément les ports acoustiques des microphones. **Ne perce pas le plexiglas définitif avant d'avoir repéré les véritables orifices microphones sur ta carte XVF3800 nue.** Un mauvais placement peut étouffer la capture, même si les LED sont visibles.

Il faudra également tester la bonne visibilité des LED à travers le plexiglas noir fumé : préférer un matériau transmissif (et non opaque), environ 1 à 1,5 mm d'épaisseur.

## Préparation d'impression

PETG, couches 0,2 mm, 4 périmètres, remplissage 20-30 %. Prévoir un plateau d'impression ≥160 × 160 mm, idéalement plus pour orienter certaines pièces et les jupes de première couche. Déterminer supports/orientation dans le slicer, particulièrement pour la coupelle de l'écran et les pieds. M3/écrous hexagonaux et vis courtes M2.5 selon l'épaisseur réelle ; vérifier les pilotages de perçage.

**Il faut imprimer d'abord une jauge courte** pour valider la forme périphérique du XVF3800 et le diamètre d'insertion de l'écran avant d'imprimer le boîtier complet. Aucun vissage directement à travers les ports des micros.

## Générer de nouvelles variantes

Requis : Python + CadQuery>=2.4, trimesh et matplotlib. Puis :

```bash
python generer_kimia_v2.py
python creer_apercu_v2.py
```

La hauteur se modifie dans le code via `ACOUST_H`, `BODY_H`, `Z_TOP`, etc. Attention, ces paramètres de sections nécessitent d'ajuster conjointement les niveaux Z des pièces et l'assemblage : une édition partielle des valeurs peut créer un décalage. Les modifications de forme se font via `R_MAIN`, `R_LOBE` et `shape_r()`.

## À faire avant la V3

- Valider l'ajustement **PCB XVF3800 réel + connecteurs + quatre microphones + LEDs**.
- Relever la forme exacte de l'écran Waveshare et sa fixation, réaliser un support écran entièrement affleurant (la coupelle V2 déborde encore volontairement).
- Contrôler les passages de câbles du module ; ajouter une alimentation 5V adaptée et un interrupteur de confidentialité/mute.
- Effectuer une compilation ESPHome complète avec audio XVF3800, affichage, SHT45 et LD2410.
- Tester le rendu de voix à 3–5 m, l'AEC, les vibrations et la température réelle SHT45.
- Ajuster les emboîtements, les fixations M3, les joints et la chambre acoustique après premier montage physique.

Références :
- https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/
- https://files.seeedstudio.com/wiki/respeaker_xvf3800_usb/respeaker_xvf3800_2d_mechanical_drawing.pdf
- https://www.waveshare.com/product/1.85inch-touch-lcd-module.htm
- https://www.visaton.de/sites/default/files/dd_product/fr7_4.pdf