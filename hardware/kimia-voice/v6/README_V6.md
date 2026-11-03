# KIMIA Voice V6 — coque continue et caisson cylindrique interne

**Statut : CAO de prototype.** Forme et architecture décidées le 3 novembre 2026 à partir du modèle V5 et du croquis validé. **Ni l'emboîtement réel, ni l'acoustique n'ont encore été validés par impression/assemblage.** La V5 reste intacte dans `../v5/`.

## Architecture validée — à conserver

- **Même silhouette que la V5** : galet triangulaire très arrondi ; les 2 coins de façade commencent à s'arrondir dès après le cadre de l'écran. La façade reste plane sur ~69,5 mm, le reste de la silhouette et les dimensions maximales sont conservés. Ne pas changer en cube, rond ou triangle géométrique.
- **Dessus sans vis apparentes** : module XVF3800 horizontal Ø100 mm ; disque de protection/plexiglas envisagé Ø106, avec une bordure extérieure blanche de l'ordre de 5 mm au point le plus serré. La couronne supérieure est retenue par **3 vis depuis le dessous** dans des logements borgnes avec inserts M3 (cotes préliminaires). Les orifices micros du gabarit sont *indicatifs*, surtout pas définitifs.
- **Façade** : écran rond centré environ à mi-hauteur, même enveloppe PCB Ø55 et diamètre visible Ø45,68 qu'en V5 ; il passe **devant** le caisson cylindrique.
- **Coque** : une enveloppe extérieure **blanche continue**, du haut jusqu'au socle inférieur. Aucune bande bleue extérieure superposée.
- **À l'intérieur** : **caisson acoustique CYLINDRIQUE**, imprimable en bleu ou autre couleur, fermé en haut et ouvert en bas. Le haut-parleur **ferme le bas** une fois monté, membrane dirigée vers la table. Joint d'étanchéité nécessaire entre caisson, socle et haut-parleur.
- **Dessous** : socle avec ouverture HP Ø61 mm et PCD de fixation Ø74 mm, pieds de 10 mm pour laisser s'échapper le son. La coque extérieure ne remplace pas le caisson acoustique.
- Le cylindre peut remonter derrière l'écran : cela supprime l'ancienne cloison horizontale de séparation et évite une grosse zone électronique vide.

## Dimensions CAO V6

| Mesure | V5 | V6 proposée |
|---|---:|---:|
| Largeur extérieure maximale | 157,8 mm | **124,7 mm** |
| Profondeur maximale | 154,0 mm | **126,3 mm** |
| Hauteur pieds compris | 136 mm | **113 mm** |
| Diamètre extérieur du caisson acoustique | chambre en forme de coque | **88 mm** |
| Hauteur du cylindre depuis le socle | sans objet | **72 mm** |
| Épaisseur cylindrique | sans objet | **3,5 mm** |
| Épaisseur du toit du cylindre | sans objet | **4 mm** |
| Volume intérieur cylindrique théorique | sans objet | **~350 cm³** |
| Jeu de centrage du cylindre sur socle | sans objet | **0,5 mm radial** |
| Dégagement HP sous le socle | 12 mm | **10 mm** |

La réduction de hauteur vient de l'emboîtement des fonctions, et non d'une réduction du haut-parleur ou de l'écran. **Volume acoustique indicatif**, avant déplacement d'air par l'arrière du HP, joints et câblage : ne constitue pas un réglage acoustique certifié.

## Fixation invisible du capot (nouvelle révision)
- Aucune tête de vis visible sur la couronne XVF3800 **ni sur le plexiglas**. Le plexiglas est retenu provisoirement par un adhésif/joint périphérique sur la feuillure, sans masquer les microphones (à valider).
- Trois longues colonnes internes liées à la coque blanche, alignées avec des passages de tournevis **accessibles par la face inférieure du socle**.
- Épaulement à Z = 86 mm ; vis M3 × 12 proposées, introduites depuis le bas avec un tournevis aimanté assez long.
- Trois poches borgnes dans le capot pour inserts thermiques M3 (Ø4,5 × 4 mm **à confirmer sur les inserts achetés**) ; profondeur de poche CAO 4,8 mm.
- Vérifier qu'aucune colonne ou vis ne gêne les connecteurs et qu'il est possible de serrer les vis avec le haut-parleur monté. Cette fixation est une **proposition à éprouver**, pas une validation d'assemblage.

## Gabarits de composants conservés strictement de V5

- XVF3800 nominal Ø100 mm ;
- écran Waveshare 1,85 pouce, PCB Ø55 mm, zone visible Ø45,68 mm ;
- haut-parleur : découpe Ø61 mm et points de fixation sur cercle Ø74 mm, tels que définis dans la V5 ;
- plexiglas Ø106 × 1,5 mm envisagé (perçages micros NON validés).

Les encombrements des connecteurs/XIAO et des cartes auxiliaires (ESP32-S3, BME280, etc.) ne sont pas suffisamment cotés dans les fichiers V5 pour garantir leur placement. **Ne pas inventer leurs dimensions** : présenter les vrais composants lors de l'essai à blanc. Les fentes de capteur et l'accès alimentation restent provisoires.

## Fichiers et reconstruction

- [Générateur CadQuery V6](./generer_kimia_v6.py) — génère STL et STEP de chaque pièce, plus un STL/STEP assemblé pour visualisation.
- `01_socle_HP_vers_le_bas`
- `02_caisson_cylindrique_interne_ferme_haut`
- `03_coque_blanche_continue_ecran`
- `04_couronne_superieure_XVF`
- `05_support_arriere_ecran`
- `06_bague_facade_optionnelle`
- `07_gabarit_plexiglas_NON_VALIDE` (**ne pas imprimer/percer comme gabarit final**).

`00_KIMIA_VOICE_V6_GITHUB.stl` est **un assemblage de visualisation uniquement**, pas une pièce à imprimer d'un bloc.

Installation : `pip install "cadquery>=2.4,<3" "shapely>=2"`, puis
`python hardware/kimia-voice/v6/generer_kimia_v6.py`.

Le workflow GitHub Actions `kimia-voice-v6-cad.yml` lance l'export et publie les pièces en **artefact ZIP** téléchargeable, sans modifier les versions historiques.

## Montage / validations impératives

1. **Montage à blanc** du XVF réel, de l'écran, du support, de l'ESP32 et du capteur ; vérifier la profondeur derrière l'écran, les connecteurs USB et les positions exactes de microphones.
2. Contrôler les trois colonnes de fixation du capot : passage du tournevis **par le dessous**, placement des inserts M3 et absence de collision avec câbles, écran et caisson.
3. Positionner le cylindre à l'intérieur de la coque, l'emboîter dans le rebord de centrage du socle, jointoyer son pied. Le passe-fil AR Ø4 mm doit être étanchéifié après le passage des deux conducteurs.
4. Fixer le haut-parleur sur la face inférieure du socle, membrane vers le bas, pour **fermer l'ouverture inférieure du cylindre** ; ajouter un joint sous la bride HP. Vérifier géométrie réelle de bride, trous et vis avant perçage définitif.
5. Tester acoustique, vibrations, qualité de détection XVF et espace libre de 10 mm sous la sortie sonore ; augmenter l'espace si la table atténue trop le son.
6. Contrôler la mécanique réelle des perçages et la marge du XVF : **le dessin n'est pas une validation d'impression**.

**Règle ferme pour les itérations suivantes : conserver cette architecture et le galet V5 réduit, avec arrondis de façade accentués et aucune vis sur le dessus, sauf décision explicite contraire.**
