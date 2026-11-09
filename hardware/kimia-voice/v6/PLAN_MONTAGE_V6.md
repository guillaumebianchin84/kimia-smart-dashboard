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

## Écran rond Waveshare

- Gabarit conservé : PCB Ø55, diamètre utile Ø45,68 mm.
- La bague arrière existante se place en position d'assemblage, avec les deux appuis M2 x±33 de la façade. **L'audit mesure 0,2 mm entre la bague et les appuis** : ce jeu nominal devra être repris au serrage, sans déformer l'écran. L'écran n'est pas encore réellement « serré » dans le modèle : il faut mesurer sa profondeur, puis dimensionner une cale compressible/entretoise à l'arrière du PCB.
- Un joint/cale souple et sa compression devront être choisis après réception de l'écran pour ne pas endommager l'afficheur ni coincer sa nappe ou son connecteur. La bague est démontable, par l'intérieur.

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
