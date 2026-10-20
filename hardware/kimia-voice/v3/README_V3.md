# KIMIA Voice — V3 : façade plate et galet triangulaire

**Statut : prototype de conception mécanique, PAS encore validé par montage des vrais composants.**

## Modifications par rapport à la V2

- Face avant **plus large et réellement plate** : l'écran de 1,85 pouce se loge dans un fraisage intégré à la coque, **sans boîtier circulaire rapporté**.
- Deux faces latérales allongées plutôt plates, raccordées à des coins fortement arrondis et à une poupe resserrée : forme générale *galet triangulaire*.
- ReSpeaker XVF3800 Ø100 mm placé horizontalement en haut sous le plexiglas fumé.
- Plexiglas circulaire Ø106 mm, épaisseur 1,5 mm, avec perçages acoustiques provisoires autour des quatre microphones.
- Visaton FR7 4 Ω orienté vers la table dans une chambre acoustique inférieure.
- Quatre pieds de 12 mm pour laisser diffuser le son sous le boîtier.
- Renforts des colonnettes de fixation reliés aux parois, pas de colonnettes flottantes.

## Cotes de conception (millimètres)

| Grandeur | V3 |
|:--|--:|
| Encombrement maximal X | ~176,7 |
| Encombrement Y | ~160,2 |
| Corps plastique, hors pieds | 124 |
| Pieds sous le socle | 12 |
| **Hauteur totale** | **136** |
| Hauteur paroi chambre acoustique | 39 |
| Hauteur compartiment électronique | 66 |
| Épaisseur paroi | 4 |
| Centre de l'écran Z depuis le socle | 81 |
| Fenêtre d'écran | Ø47,4 |
| Encastrement décoratif de façade | Ø60, profondeur 1,45 |
| Passage PCB de l'écran (par l'intérieur) | Ø56,6 |
| Haut-parleur, découpe acoustique | Ø61 |
| Haut-parleur, cercle de vis | Ø74, 4 perçages |
| XVF3800 nu (cote nominale) | Ø100 |
| Logement plexiglas | Ø106,4 |

Les cotes concernant les composants sont des valeurs nominales **à vérifier avec les pièces commandées**. Les positions exactes des microphones et fixations XVF3800 ainsi que les dimensions d'épaisseur, nappes et connecteurs de l'écran sont provisoires.

## Fichiers

- `generer_kimia_v3.py` : source paramétrique **CadQuery** ; permet de modifier toute la géométrie.
- `01...` à `07...` : **STL individuels** et fichiers **STEP** pour impression / CAO.
- `08_gabarit_plexiglas_NE_PAS_IMPRIMER` : silhouette de plexiglas, non destinée à l'impression 3D.
- `GABARIT_PLEXI_V3_NON_VALIDE.svg` / `.dxf` : gabarit pour découpe, **perçages à revalider**.
- `00_ENSEMBLE_V3_VISUALISATION.stl` : ensemble en position, à visualiser sur GitHub, **NE PAS L'IMPRIMER EN UNE PIÈCE**.
- `rendu_v3.py` et `APERCU_V3_*.png` : visualisations techniques.

### Génération

```bash
pip install cadquery shapely ezdxf
python generer_kimia_v3.py
python creer_gabarit_v3.py
python rendu_v3.py
```

## Avant la première impression complète

1. Vérifier la fixation du ReSpeaker XVF3800 réel et ses quatre entrées acoustiques ; ne pas percer le plexi au hasard. Tester l'effet des perçages sur l'écoute.
2. Vérifier l'encombrement du Waveshare rond 1,85 pouce (PCB, connecteur, nappe). La compatibilité d'interface avec ESPHome et les GPIO du XIAO ESP32-S3 doit être validée avant l'achat.
3. Confirmer les trous de montage du Visaton FR7 sur l'exemplaire réel et visser sur joint souple.
4. Tester le volume acoustique, l'étanchéité de la chambre et le retour de son vers les microphones (annulation d'écho).
5. Dessiner les supports définitifs SHT45/LD2410 avec leur référence de carte précise. SHT45 doit rester ventilé hors zone de chaleur.
6. Ajouter fixations de l'alimentation et du câble ; tester un tirage d'essai PLA/PETG de 2-3 pièces avant d'imprimer le tout.

Les STL sont des solides à maillage fermé ; cela ne valide **ni les jeux d'assemblage ni la qualité sonore ni la résistance des pièces**.