# KIMIA Voice — assistant domotique de table

## Version actuelle — V6 (9 novembre 2026)

**Référence mécanique à utiliser : [KIMIA Voice V6 — coque monobloc avec caisson acoustique cylindrique interne](./v6/README_V6.md).**

- Dimensions extérieures : **124,7 × 126,3 × 113 mm**, pieds inclus ; triangle-galet très arrondi, façade plane courte.
- **Coque extérieure continue** avec couronne XVF3800 intégrée ; dessus sous plexiglas Ø106 × 1,5 mm, sans vis apparente.
- **Caisson acoustique Ø88 × 72 mm entièrement intérieur**, haut-parleur orienté vers la table, pieds de 10 mm.
- Écran Waveshare rond visible Ø45,68 mm encastré à l'avant ; montage et fixations accessibles par-dessous.
- [Voir le modèle V6 assemblé](./v6/00_KIMIA_V6_MONOBLOC_ASSEMBLAGE.stl) · [Voir la vue éclatée](./v6/00_KIMIA_V6_MONOBLOC_VUE_ECLATEE.stl) · [Consulter le plan de montage](./v6/MONTAGE_MONOBLOC_V6.md).

**Statut : prototype CAO, dimensions de conception validées ; montage physique, clips et acoustique non encore validés.** Les sections V1–V5 ci-dessous sont conservées pour l'historique et ne représentent pas la version à utiliser.

Projet matériel de **KIMIA Smart by PROMAINT** : assistant vocal de qualité, basé sur **Seeed ReSpeaker XVF3800 + XIAO ESP32-S3**, avec écran circulaire en façade, capteurs environnementaux et haut-parleur dirigé vers le bas.

## Statut

**V1 = prototype mécanique paramétrique, non validé sur composants physiques.** Ne pas lancer une production avant vérification des fixations, dégagements et branchements.

## Architecture choisie

- **Haut horizontal** : ReSpeaker XVF3800 (PCB nu Ø100 mm), quatre microphones non obstrués, LEDs visibles à travers un plexiglas fumé translucide.
- **Façade** : écran rond Waveshare 1,85 pouce (mécanique envisagée, compatibilité ESPHome / GPIO à confirmer).
- **Capteurs** : SHT45 température/humidité et LD2410 présence (supports à concevoir selon les références exactes).
- **Bas** : haut-parleur Visaton FR7 4 Ω orienté vers la table, dans une chambre acoustique dédiée; sorties acoustiques périphériques, pieds de 12 mm.
- **Alimentation** : 5 V fixe; sortie amplifiée JST du XVF3800 pour le haut-parleur passif, et non sa sortie jack.

## Dimensions de départ (mm)

| Pièce | Dimension |
|---|---|
| Largeur totale envisagée | 130 |
| Hauteur totale pieds compris | ~158 |
| ReSpeaker XVF3800 nu | Ø100 |
| Visaton FR7 | Châssis ~66; découpe Ø61; trous Ø4,2 sur cercle Ø74 |
| Waveshare 1,85 pouce | PCB Ø55; diamètre affichage 45,68 |
| Plexiglas fumé | Ø106; épaisseur 1,5 |

## Sources 3D

- `generer_kimia.py` : générateur paramétrique des STL et STEP via **CadQuery**.
- `creer_visuels.py` : script des visuels.
- `LISEZ_MOI_AVANT_IMPRESSION.txt` : nomenclature, séquence de montage, avertissements.

### Générer les pièces

Installer Python et CadQuery (`cadquery>=2.4`), puis :

```bash
python generer_kimia.py
python creer_visuels.py
```

Les exports obtenus ne sont **pas encore testés par impression**. Tous les STL/STEP et gabarits de la V1 sont inclus dans l'archive **[KIMIA_Voice_Prototype_3D_V1.zip](./KIMIA_Voice_Prototype_3D_V1.zip)**, versionnée dans ce dépôt GitHub. Une copie de secours est également disponible dans la bibliothèque ChatGPT, dossier **KIMIA Voice**.

## Points à résoudre avant V2

1. Comparer la couronne avec le PCB XVF3800 réel (microphones, LED, connecteurs et fixation); ne jamais obturer les ports audio.
2. Vérifier matériellement le gabarit et la transmission optique du plexiglas fumé.
3. Valider **écran + XVF3800 + SHT45 + LD2410 + ESPHome** : brochage, conflits GPIO/I²C/SPI, mémoire et charge CPU.
4. Prévoir les supports imprimables des capteurs, surtout l'isolation thermique du SHT45.
5. Tester acoustique, volume utile, étanchéité, vibrations et qualité du wake-word lors d'une réponse vocale à volume élevé.
6. Vérifier réglages d'impression, inserts/vis et les tolérances réelles.

## Références constructeur

- [Seeed ReSpeaker XVF3800](https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/)
- [Plan mécanique XVF3800](https://files.seeedstudio.com/wiki/respeaker_xvf3800_usb/respeaker_xvf3800_2d_mechanical_drawing.pdf)
- [Visaton FR7 4 Ω](https://www.visaton.de/sites/default/files/dd_product/fr7_4.pdf)
- [Waveshare 1.85inch Touch LCD Module](https://www.waveshare.com/product/1.85inch-touch-lcd-module.htm)

*Dossier matériel séparé du code du dashboard KIMIA Smart; sauvegarde initiale du 20 octobre 2026.*

## Prévisualisation 3D interactive sur GitHub

**[Ouvrir le modèle assemblé V1 en 3D](./00_VISUALISATION_ENSEMBLE_V1.stl)** : GitHub affiche directement le STL avec rotation et zoom dans un navigateur compatible WebGL. Cette vue comprend les volumes principaux du boîtier, le cadre de l'écran et le plexiglas supérieur, sans les composants électroniques réels. **C'est un fichier de visualisation, pas une pièce à imprimer en un seul bloc.**

Pour imprimer, utiliser **les STL individuels** présents dans [l'archive complète V1](./KIMIA_Voice_Prototype_3D_V1.zip). Pour reconstruire la vue, exécuter `creer_visu_ensemble.py` après avoir généré les composants avec `generer_kimia.py`.

## Dernière évolution — V3 (façade plate élargie)

La V3 répond aux corrections esthétiques : face avant et flancs nettement plus plats, écran rond complètement encastré, grand rayon de raccordement et dessus XVF3800 horizontal. Le caisson de haut-parleur inférieur reste indépendant.

- **[Faire tourner le modèle V3 en 3D sur GitHub](./v3/00_KIMIA_VOICE_V3_GITHUB.stl)**
- [Paramètres, mesures et statut de fabrication V3](./v3/README_V3.md)
- [Source CadQuery paramétrique V3](./v3/generer_kimia_v3.py)

**À ne pas confondre :** le STL d'assemblage est réservé à l'aperçu et n'est pas une pièce à imprimer. Les pièces V3 STL/STEP sont régénérables avec le script; l'archive complète est aussi sauvegardée dans la bibliothèque ChatGPT, dossier `KIMIA Voice`. Les emplacements acoustiques du plexiglas et l'interface électronique restent à vérifier sur le matériel réel.

## V4 — silhouette finale validée (20 octobre 2026)

**Forme extérieure figée.** La silhouette approuvée par l'utilisateur est sauvegardée dans [l'image de référence V4](./v4/REFERENCE_FORME_VALIDEE.png). Reproduire uniquement la géométrie triangle-galet très arrondi à face avant droite; ne pas revenir au V3 ni changer de forme sans demande explicite.

- [Visualisation 3D V4 interactive](./v4/00_KIMIA_VOICE_V4_GITHUB.stl)
- [Fichiers CAO paramétriques V4](./v4/generer_kimia_v4.py)
- [Notes mécaniques et statut de validation V4](./v4/README_V4.md)

Les fichiers de fabrication STL/STEP V4 et l'image validée sont conservés dans l'archive `KIMIA_Voice_V4_Complet_STL_STEP.zip`, également sauvegardée dans la bibliothèque ChatGPT (`/KIMIA Voice`). **Non testé physiquement.**
