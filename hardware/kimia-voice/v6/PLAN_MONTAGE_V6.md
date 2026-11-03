# KIMIA Voice V6 — montage complet des composants

## Géométrie extérieure figée

**Ne pas modifier** la forme extérieure validée de V6 (galet triangulaire aux deux grands arrondis de façade), ni la position ou les gabarits des modules. Le montage ajouté est **100 % côté intérieur** et peut se retirer/adapter sans remodeler l'apparence. Largeur 124,7 mm ; profondeur 126,3 mm ; hauteur 113 mm avec pieds. Le code de référence reste `generer_kimia_v6.py` et son assemblage initial.

## Plexiglas supérieur : collé, sans vis

- Disque Ø106 × 1,5 mm, repris de V5/V6 ; aucun trou de fixation.
- Feuillure existante de Ø106,4 et profondeur 1,85 mm : disque centré avec 0,2 mm de jeu radial nominal.
- **Réserver une couronne de colle de 1,5 mm de large** sur le rebord déjà présent, entre les rayons 51,5 et 53,0 mm ; ne pas ajouter de matière visible ni changer la silhouette.
- Le plexiglas posé dans le retrait laisse 0,35 mm au total pour la colle, dont 0,30 mm de joint prévu dans le contrôle CAO. Un ruban adhésif optiquement compatible et non dégazant peut convenir après essai ; dépôt continu seulement sur cette bande périphérique.
- Microphones XVF sur la face inférieure : **ne pas coller ni masquer les entrées acoustiques**, l'antenne Wi-Fi, les LED ou les boutons. Le gabarit de perforations actuel est illustratif et NON VALIDÉ ; aucune découpe réelle de plexiglas avant confrontation à la carte.

## XVF3800 Ø100 : trois clips plastiques démontables, zéro trou PCB

- La couronne V6 conserve son assise intérieure Ø101,6. Trois poches borgnes Ø2,9 de profondeur 5 mm sont ajoutées **par le dessous**, sans percer le dessus.
- Trois petits clips plastiques pressés par-dessous, aux angles 30°, 150°, 270°, sur un cercle de rayon 52,1 mm décalé avec la carte.
- Les lèvres retiennent environ 1 mm du bord inférieur du PCB sans vis ni perçage ; marge nominale de 0,15 mm sous une carte supposée épaisse de 1,6 mm.
- **Essai PETG obligatoire** : mesurer l'épaisseur réelle, vérifier les ports micro côté inférieur, les connecteurs, l'antenne du XIAO et la possibilité de déclipser sans plier le PCB. Modifier seulement les clips si nécessaire.

## ESP32-S3 séparé : berceau à glissières clipsé sur le toit du caisson

- Le caisson acoustique Ø88 reste un cylindre fermé en haut et par le haut-parleur en bas. Les 4 plots champignons du porte-carte et deux boucles pour colliers de câbles sont **sur le toit extérieur**. Aucun perçage de l'enceinte acoustique.
- Petit berceau clipsable sans vis, PCB retenu par glissières et languettes souples sur ses bords, ports USB dégagés sur l'axe longitudinal.
- **Gabarit provisoire seulement : PCB 57 × 28 × 1,6 mm**, à corriger au pied à coulisse pour la carte ESP32-S3 N16R8 réellement achetée. Ni sa profondeur de connecteurs ni la présence du XIAO déjà monté sur le XVF ne sont vérifiées. Ne jamais forcer la carte dans le berceau.
- Hauteur restante indicative au-dessus du plateau : ~13 mm avant le bas de la couronne du dessus, **sans déduire l'encombrement réel de l'arrière du XVF3800**. Valider en montage à blanc ; si collision, déplacer uniquement le plateau ou choisir une orientation différente, sans modifier la coque extérieure.

## Écran rond Waveshare

- Gabarit conservé : PCB Ø55, diamètre utile Ø45,68 mm.
- La bague arrière existante se place enfin en position d'assemblage, avec les deux appuis M2 x±33 de la façade (aucun trou nécessaire dans le PCB).
- Un joint/cale souple et sa compression devront être choisis après réception de l'écran pour ne pas endommager l'afficheur ni coincer sa nappe ou son connecteur. La bague est démontable, par l'intérieur.

## BME280 et câblage

- La petite cartouche clipsable se glisse derrière les ouïes **déjà présentes** sur le flanc gauche. Deux mini-dégagements internes prolongent ces ouïes : rien de nouveau n'est percé à l'extérieur.
- **Empreinte BME280 provisoire : 20 × 15 × 1,6 mm** ; ce n'est PAS une cote mesurée du module spécifique. Le régulateur embarqué, la broche et le sens du connecteur doivent être vérifiés. Ne pas exposer le capteur à la chaleur de l'ESP32 ou du haut-parleur ; ventiler la zone.
- Deux petites boucles internes sur le toit du caisson reçoivent des colliers fins pour immobiliser les fils ; ne pas obstruer le passage d'air et éviter les points vibrants.
- La traversée du fil du HP dans le cylindre doit être rebouchée de manière **étanche** après montage.

## Socle, haut-parleur et capot : vis seulement par-dessous

- HP : ouverture Ø61, fixations sur cercle Ø74 (4 vis et joint) ; membrane vers la table, 10 mm d'espace libre sous l'appareil.
- Socle : quatre vis indépendantes accessibles dessous, via les inserts déjà modélisés dans la V6.
- Capot XVF3800 : trois vis cachées accessibles dessous, par des colonnes traversant l'enveloppe ; **aucune vis apparente sur le dessus ni sur le plexiglas**.
- Ordre conseillé : coller/viser l'écran et son support ; placer la cartouche capteur ; installer le XVF avec trois clips ; câbler l'ESP32 dans son berceau ; poser celui-ci sur le toit du caisson ; faire passer HP + cable, jointoyer le cylindre ; refermer le socle et serrer les deux ensembles de vis ; coller le plexiglas **en dernier** après essai de micros/LEDs.

## Export et statut

La commande GitHub Actions génère d'abord la V6 de référence, puis `generer_fixations_v6.py`, et publie un STL **d'assemblage** (non imprimable d'un bloc), des STL/STEP individuels et les sources. Les pièces `08` à `13` sont nouvelles. Le dessin ne remplace ni le pied à coulisse ni un montage à blanc. Les logements des clips, la position exacte du micro, le gabarit de carte ESP32, le sensor BME280, la place des connecteurs et la tenue en vibration sont **à confirmer avant toute impression définitive**.