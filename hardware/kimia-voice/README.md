# KIMIA Voice — assistant domotique de table

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

Les exports obtenus ne sont **pas encore testés par impression**. Les modèles STL/STEP du premier prototype sont également conservés dans l'archive **KIMIA_Voice_Prototype_3D_V1.zip**, sauvegardée dans la bibliothèque ChatGPT, dossier **KIMIA Voice**.

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
