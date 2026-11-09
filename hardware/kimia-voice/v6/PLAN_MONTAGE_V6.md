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
- Petit berceau clipsable sans vis, PCB retenu par glissières et languettes souples sur ses bords. **Correction de l'audit :** la butée centrale côté +X masquait un port USB axial potentiel ; elle est remplacée par **deux butées latérales**, ménageant un passage libre d'environ 19,7 mm au centre. La vraie position du connecteur reste à mesurer.
- **Gabarit provisoire seulement : PCB 57 × 28 × 1,6 mm**, à corriger au pied à coulisse pour la carte ESP32-S3 N16R8 réellement achetée. Ni sa profondeur de connecteurs ni la présence du XIAO déjà monté sur le XVF ne sont vérifiées. Ne jamais forcer la carte dans le berceau.
- Hauteur restante indicative au-dessus du plateau : ~13 mm avant le bas de la couronne du dessus, **sans déduire l'encombrement réel de l'arrière du XVF3800**. Valider en montage à blanc ; si collision, déplacer uniquement le plateau ou choisir une orientation différente, sans modifier la coque extérieure.

## Écran rond Waveshare 1,85 pouce — montage EXTÉRIEUR, 3 vis M2 (révision du 09/11/2026)

**Référence officielle :** [Waveshare 1.85inch Touch LCD Module — dimensions](https://docs.waveshare.com/1.85inch_Touch_LCD_Module#dimensions). L'écran est introduit **par l'avant**. Le Ø55 mm s'assoit dans la feuillure existante Ø60 mm, de profondeur utile 1,35 mm. L'épaulement autour de l'ouverture Ø47,4 mm empêche la vitre de passer vers l'intérieur. Le dégagement arrière de Ø56,6 mm demeure inchangé.

- Verre Ø55 mm, épaisseur indiquée 0,70 mm ; retrait nominal **0,65 mm** sous la façade, à vérifier avec l'écran réel et éventuellement un joint mince.
- Trois inserts filetés **M2** du module, coordonnées nominales dans le plan de l'écran (x, z), centre (0, 0) : **(0, +21,00), (-14,85, -14,85), (+14,85, -14,85) mm**. Entraxe entre les deux inserts inférieurs : **29,70 mm**. Ces inserts traversent l'ouverture Ø47,4 ; vérifier la place des composants proches.
- Le **nouvel anneau arrière** est toujours retenu sur les **deux appuis intérieurs M2 x=±33 mm** de la coque, mais possède désormais **trois bras/colonnettes** avec trous de passage Ø2,4 mm alignés sur les inserts Waveshare. Les vis M2 sont introduites depuis l'intérieur, via les trois colonnettes, et vissées dans le module. Un lamage reçoit chaque tête.
- Longueur CAO des colonnettes : **6,45 mm** entre l'anneau et les inserts, calculée avec profondeur totale **9,10 mm** (dessin constructeur) et retrait du verre **0,65 mm**. C'est une **hypothèse de montage**, pas une mesure du module dans sa position finale. Ajuster après pose à blanc : aucune traction sur le verre ni sur le circuit imprimé.
- Passage de nappe conservé par une encoche au bas de l'anneau ; maintenir la flex et le câble GH 15 broches libres, sans pincement.
- Bague de finition extérieure optionnelle adaptée à **Ø55,4 mm intérieur**, pour ne plus masquer la vitre. Elle est une pièce indépendante, à tester avant collage définitif.

**Ordre de montage :** introduire l'écran par l'extérieur ; le caler légèrement en retrait ; depuis le dessous ouvert de la coque, installer l'anneau et ses 2 vis de fixation ; engager les 3 vis M2 vers les entretoises du Waveshare, serrer sans effort ; contrôler l'affleurement, la nappe et l'accès à la maintenance. Ne jamais forcer pour compenser une longueur de colonnette incorrecte.

**Contrôles avant la première impression intégrale :** réaliser d'abord une impression du support 3-M2 seul, confronter à l'écran physique les trois entraxes, les diamètres de vis, les hauteurs de colonnettes, le diamètre réel du verre et les connecteurs. Vérifier le passage de ce support à côté du caisson Ø88 mm.

## BME280 et câblage

- La petite cartouche clipsable se glisse derrière les ouïes **déjà présentes** sur le flanc gauche. Deux mini-dégagements internes prolongent ces ouïes : rien de nouveau n'est percé à l'extérieur.
- **Empreinte BME280 provisoire : 20 × 15 × 1,6 mm** ; ce n'est PAS une cote mesurée du module spécifique. Le régulateur embarqué, la broche et le sens du connecteur doivent être vérifiés. Ne pas exposer le capteur à la chaleur de l'ESP32 ou du haut-parleur ; ventiler la zone.
- Deux petites boucles internes sur le toit du caisson reçoivent des colliers fins pour immobiliser les fils ; ne pas obstruer le passage d'air et éviter les points vibrants.
- La traversée du fil du HP dans le cylindre doit être rebouchée de manière **étanche** après montage.

## Socle, haut-parleur et capot : vis seulement par-dessous

- HP Visaton FR7 : ouverture Ø61 et 4 fixations sur cercle Ø74 ; membrane vers la table. **Correction :** quatre poches hexagonales sur la face supérieure du socle pour **écrous M3 captifs** (hexagone Ø6,6 mm sur sommets, profondeur 2,65 mm) ; les anciens lamages inférieurs, qui auraient affaibli le matériau sous les écrous, sont supprimés. Introduire les écrous depuis l'intérieur avant de fermer le caisson, les maintenir pendant le premier serrage et assurer l'étanchéité autour des vis. Vérifier l'espace libre nominal de 10 mm sous la membrane, l'encadrement réel du HP et la tête des vis.
- Socle : quatre vis indépendantes accessibles dessous, via les inserts déjà modélisés dans la V6.
- Capot XVF3800 : trois vis cachées accessibles dessous, par des colonnes traversant l'enveloppe ; **aucune vis apparente sur le dessus ni sur le plexiglas**.
- **Ordre recommandé :** 1) installer les inserts M3 du capot et du socle, vérifier les passages du tournevis ; 2) fixer/ajuster le support et la cale de l'écran et la cartouche BME ; 3) poser le XVF avec les trois clips, tester les commandes et connecteurs ; 4) connecter l'ESP32 et l'engager dans le berceau ; 5) placer le berceau sur le toit du cylindre ; 6) mettre les écrous captifs HP dans le socle, jointoyer le pied du caisson et passer le câble haut-parleur ; 7) positionner le caisson dans le socle, brancher le HP et serrer ses quatre vis par dessous avec joint, avant fermeture ; 8) refermer le socle puis serrer les fixations de base et de capot par-dessous ; 9) faire les tests audio/écran/voix, puis **coller le plexiglas en tout dernier**, sans boucher les orifices microphones.

## Export et statut

La commande GitHub Actions génère d'abord la V6 de référence, puis `generer_fixations_v6.py`, et publie un STL **d'assemblage** (non imprimable d'un bloc), des STL/STEP individuels et les sources. Les pièces `08` à `13` sont nouvelles. Le dessin ne remplace ni le pied à coulisse ni un montage à blanc. Les logements des clips, la position exacte du micro, le gabarit de carte ESP32, le sensor BME280, la place des connecteurs et la tenue en vibration sont **à confirmer avant toute impression définitive**.

## Audit CAO indépendant — 3 novembre 2026

Le script [auditer_assemblage_v6.py](./auditer_assemblage_v6.py) est lancé dans GitHub Actions **après export**. Il vérifie la validité des solides, l'absence d'interférences non désirées entre coque/cylindre/écran/capteurs, l'interférence volontaire des clips, le passage d'un outil de Ø5,8 mm vers les trois vis de capot, et le passage USB axial prévu pour le berceau ESP32. L'absence de collision de volumes CAO ne prouve pas la tenue d'une pièce imprimée.

**Points non validés physiquement :**
- **XVF3800** : épaisseur PCB réelle, emplacement des 4 microphones, XIAO/USB/antenne, épaisseur de lèvres PETG et possibilité de déclipser sans forcer.
- **Écran Waveshare** : profondeur exacte, connecteur/nappe et entretoise souple nécessaire pour le serrage arrière ; la bague a 0,2 mm de jeu côté bossages.
- **ESP32-S3** : dimensions du PCB et du connecteur USB à confirmer, ainsi que sa hauteur libre sous le XVF ; berceau actuel paramétré à 57 × 28 mm.
- **BME280** : empreinte 20 × 15 mm supposée ; confirmer retenue effective des deux petites languettes et absence de biais thermique.
- **HP/caisson** : encadrement réel Visaton FR7, vis M3 et écrous, joint acoustique, passage de fils étanche, fixation du cylindre sur le socle ; 10 mm sous l'appareil est un jeu CAO, pas une garantie acoustique.
- **Service** : imprimer d'abord des échantillons de clips et du support USB ; ne pas lancer le boîtier complet avant montage à blanc des vrais modules et évaluation des jeux FDM.

**Statut : CAO auditable, assemblage réel à valider.** Ne pas déclarer « prêt à imprimer en définitif » avant ces contrôles.
