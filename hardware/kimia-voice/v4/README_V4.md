# KIMIA Voice — V4 / contour esthétique validé

**Référence esthétique impérative :** l'image validée par l'utilisateur `REFERENCE_FORME_VALIDEE.png` (vue de dessus, triangle galet à trois sommets très arrondis, face avant droite). **Ne pas remplacer cette silhouette** par un triangle classique ou un cercle. La source est un rendu perspectif, donc le tracé CAO est une reconstruction dimensionnée et non une conversion photographique exacte.

## Dimensions CAD V4 (mm)

| Mesure | Valeur |
|---|---:|
| Largeur maximale | 168,8 |
| Profondeur maximale | 161,0 |
| Face avant réellement plane | 102,0 |
| Hauteur totale, pieds inclus | 136,0 |
| Profondeur chambre acoustique | 39,0 |
| Espace libre sous le socle HP | 12,0 |
| ReSpeaker XVF3800 nu | PCB nominal Ø100 |
| Plexiglas fumé envisagé | Ø106 × 1,5 |
| Écran rond envisagé | Module Ø55, affichage Ø45,68 |
| Découpe écran | Ø47,4; cuvette de finition Ø60 |
| Haut-parleur envisagé | Visaton FR7 4 Ω, découp. Ø61, PCD Ø74 |

## Fonctionnement du boîtier

- XVF3800 monté **horizontal**, partie supérieure sous un disque translucide fumé.
- Plexiglas **percé uniquement après vérification des positions des microphones sur la carte réelle** : les trous du fichier 08 sont des repères de démonstration et **ne sont pas un gabarit final**.
- Un pan avant réellement plat, pour que l'écran soit totalement intégré dans la façade, sans dépasser de la silhouette.
- Un caisson acoustique inférieur avec haut-parleur tourné vers la table (12 mm de dégagement sous les pieds), isolé de la cavité électronique par la cloison 03.
- Le SHT45 sera monté sur une zone ventilée isolée de la chaleur; le LD2410 derrière du plastique non métallisé. Supports non finalisés.

## Modèles à imprimer (STL)

- 01 — socle de haut-parleur, orienté vers le bas
- 02 — chambre acoustique
- 03 — cloison étanche
- 04 — corps principal et écran encastré
- 05 — couronne supérieure XVF3800
- 06 — support écran (à vérifier sur le vrai module)
- 07 — bague de façade optionnelle
- 08 — gabarit de plexiglas **non validé; ne pas percer d'après ces positions**

`00_ENSEMBLE_V4_VISUALISATION.stl` est un modèle assemblé **pour visualiser uniquement**, pas pour imprimer d'une pièce.

## Sources et génération

- `generer_kimia_v4.py` : CAO paramétrique CadQuery et exports STL/STEP; profil par courbes de Bézier tracées d'après l'image approuvée.
- `rendu_v4.py` : rendus à partir des STL, avec VTK.
- Dépendances `cadquery>=2.4`, `shapely>=2`, `trimesh` pour le contrôle.
- Commande `python generer_kimia_v4.py` (déclenche exports dans le dossier courant).

## Contrôles effectués

Les **8 fichiers STL individuels** sont watertight et ne contiennent qu'un seul volume chacun. Les 8 objets CadQuery sont valides. La version V4 est **un prototype CAD non imprimé** : les perçages, l'acoustique, la position de l'écran, les alimentations, les jeux et les emplacements exacts des micros nécessitent un essai réel sur les composants. La disponibilité des GPIO pour ESPHome et l'écran reste à confirmer.

**Ne pas modifier la silhouette V4 sans demande explicite.**