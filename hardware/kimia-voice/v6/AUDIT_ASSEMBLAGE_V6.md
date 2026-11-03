# KIMIA Voice V6 — audit de montabilité (3 novembre 2026)

## Périmètre et limites

La **forme extérieure est figée** : galet de V6 (~124,7 × 126,3 × 113 mm pieds inclus), courbes de façade, emplacement de l'écran et du XVF. Les retouches ci-dessous restent internes / sous le socle.

L'audit est fondé sur les sources CadQuery, les pièces STEP/STL exportées et les tests d'intersection de volumes. **Un objet CAO valide n'est pas nécessairement imprimable ni montable sur le matériel réel.** Les boîtiers, connecteurs, circuits, joints et vis réels n'ont pas été placés en 3D avec des cotes fabricant complètes.

## Résultats vérifiés en CAO

| Contrôle | Résultat |
|---|---|
| Solides des pièces exportées | Valides ; une pièce par solide imprimable |
| Coque / cylindre / couronne / support écran | Aucun volume parasite commun détecté |
| Support BME280 / paroi / caisson | Aucune collision 3D volumique |
| Clips XVF dans logements | Emboîtement intentionnel présent ; flexibilité PETG réelle inconnue |
| Berceau ESP32 sur ancrages de toit du caisson | Interférence d'encliquetage intentionnelle |
| Tournevis vers les 3 vis supérieures par le dessous | Trajets Ø5,8 mm contrôlés dans les volumes CAO |
| Extrémité +X du berceau ESP32 | **Corrigée** : deux butées latérales, passage central USB simulé |
| Serrage HP | **Corrigé** : quatre logements d'écrous M3 captifs par l'intérieur du socle |
| Plexiglas | Bande d'adhésif périphérique prévue : 1,5 mm radial + ~0,30 mm pour la colle |
| Surface extérieure | Préservée, pas de nouvelles vis visibles |

Script exécutable : [auditer_assemblage_v6.py](./auditer_assemblage_v6.py), invoqué après les deux générateurs par GitHub Actions.

## Points à confirmer avant d'imprimer la coque complète

### 1. Écran : maintien axial à finaliser

La bague arrière est à **~0,2 mm** des appuis M2, ce qui peut être rattrapé par le serrage. En revanche la distance entre la poche avant de l'écran et le plan de bague dépend de la **profondeur réelle du module Waveshare, de son connecteur et de sa nappe**. Aucun vrai espaceur de compression adapté au PCB n'est encore validé. Prévoir une cale isolante souple / entretoise adaptée après prise de mesure, sans appuyer sur le LCD.

### 2. XVF3800 : clips et acoustique

La carte nominale Ø100 mm est capturée entre une lèvre basse et une portée supérieure, mais les jeux autour de la **vraie épaisseur de circuit (provisoirement 1,6 mm)** doivent être mesurés. Tester chaque clip en PETG sans forcer. Contrôler positions des orifices acoustiques, LED, boutons, connecteurs, XIAO éventuellement déjà soudé, antenne et orientation. Les trous de plexiglas actuellement dans le gabarit ne sont **pas des perçages définitifs**.

### 3. Carte ESP32-S3

Berceau paramétré à **57 × 28 × 1,6 mm** par hypothèse ; mesurer la vraie carte, le connecteur et les soudures. Les deux butées latérales libèrent le couloir USB central, mais ne garantissent pas que l'USB réel est à cet emplacement. Contrôler la profondeur entre le dessus du plateau et les composants sous le XVF, et vérifier que le support peut être extrait sans casser les clips.

### 4. HP et caisson fermé

Les dimensions employées dans la CAO sont Ø61 découpe et cercle de fixation Ø74, issues du projet V5. Les **quatre poches pour écrous M3** sont accessibles sur le dessus du socle avant insertion du caisson ; elles ont seulement **~0,2 mm de jeu nominal** vers la paroi cylindrique intérieure. Faire un test d'écrou / montage à sec. Un joint doit étancher la jonction HP-socle et celle du cylindre au socle, ainsi que le passe-fil. Confirmer que le cône, les têtes de vis et les pieds laissent réellement l'espace voulu sous le boîtier.

**Référence du HP à confirmer impérativement** : la documentation du dépôt mentionne un *Visaton FR7 4 Ω*, tandis que les notes d'achat KIMIA évoquent un haut-parleur *8 Ω*. Les cotes ne garantissent pas qu'il s'agisse du même modèle. Comparer le modèle physique avant de valider le serrage et la découpe.

### 5. BME280 et passages de câbles

Le support capteur est provisoirement ajusté à 20 × 15 × 1,6 mm. Les deux languettes ne sont pas encore éprouvées en traction ; vérifier qu'elles retiennent bien la cartouche imprimée. Positionner le capteur près des ouïes et à l'écart des sources chaudes. Définir l'orientation finale des fils pour qu'ils restent éloignés des clips, du haut-parleur et des quatre microphones.

## Essais d'assemblage préconisés

1. Mesurer XVF + XIAO/USB, ESP32, BME280, écran complet et vrai HP au pied à coulisse.
2. Imprimer **seulement** trois clips XVF, un morceau d'assise (si nécessaire), le berceau ESP, la bague écran et un échantillon de poche hexagonale M3.
3. Faire les essais de clipsage, de branchement, de compression de joint et de passage du tournevis. Repérer les points qui doivent rester démontables.
4. Mettre au propre les jeux et les cotes des connecteurs dans les sources paramétriques.
5. Seulement ensuite imprimer la coque complète V6 et faire un montage à blanc, sans collage définitif du plexiglas. Tester voix, écran, USB, BME et haut-parleur avant de coller le disque supérieur.

**Conclusion : la CAO est cohérente et les grandes collisions sont exclues, mais il manque encore des cotes réelles et un montage test pour déclarer la V6 entièrement assemblable.** La PR doit rester en brouillon.
