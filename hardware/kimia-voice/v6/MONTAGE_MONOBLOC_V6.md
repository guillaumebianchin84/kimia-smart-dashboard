# KIMIA Voice V6 — montage par le dessous, couronne intégrée (choix retenu)

**Décision de conception du 3 novembre 2026 :** la couronne XVF3800 est désormais intégrée à la coque blanche. Le montage s'effectue entièrement par-dessous ; le caisson acoustique est installé en dernier, avec assez de mou sur le câble du haut-parleur pour poser le caisson sur le côté durant le raccordement.

## Architecture et pièces

1. **Coque blanche monobloc** : profil extérieur V6 inchangé (~124,7 × 126,3 mm) ; hauteur hors socle z=5…103 mm. Assise XVF3800 Ø100 et feuillure plexiglas Ø106 × 1,5 mm intégrées.
2. **Caisson acoustique cylindrique indépendant** : Ø88 mm, fermé sur le dessus, support ESP32 posé dessus. Il est fermé dessous par le haut-parleur orienté vers la table, avec un joint étanche.
3. **Socle inférieur** : ouvert au passage de l'onde sonore Ø61 et des quatre fixations HP Ø74 PCD. Il reste amovible, vissé uniquement par-dessous à la coque.
4. **Plexiglas supérieur** : élément **non imprimé**, collé dans la feuillure en toute dernière opération, sur une bande annulaire de **1,5 mm de large**, avec ~0,30 mm de réserve verticale pour la colle.

Les clips XVF3800, la bague écran, le berceau ESP32 et le porte-BME280 restent des petites pièces amovibles.

## Pourquoi le montage par-dessous fonctionne

Le disque PCB XVF nominal Ø100 doit traverser l'intérieur de la coque jusqu'à son siège supérieur. L'audit CAO simule sa remontée **sans le caisson installé**. Les deux vis avant du socle de l'ancienne V6 avaient leurs bossages dans cette trajectoire. Leurs **fixations invisibles sont déplacées** de (±26,−52) à (±28,−56) mm, sans modifier le profil externe ni les pieds. Les deux autres fixations du socle restent en place.

Les trois longues colonnes M3 et les poches d'inserts de l'ancienne **couronne séparée sont supprimées** du monobloc, de même que les trois trous de tournevis devenus inutiles dans le socle. L'ergot de clip situé vers 270° passe à **280°** pour éviter un léger contact avec la paroi interne de façade. Les dimensions nominales des composants restent inchangées.

## Ordre de montage recommandé

1. Poser la coque monobloc sur le côté ou retournée avec une protection pour la finition.
2. **Depuis le dessous**, faire passer le XVF3800 dans la coque et le clipser sur le siège supérieur (clips 30°, 150°, 280°). Vérifier micros, connecteurs, antenne, LED et maintien du circuit, sans forcer.
3. Installer l'écran rond et sa bague arrière, puis le BME280 et le câblage. Prévoir un accès réel aux connecteurs pour la maintenance.
4. Installer le PCB ESP32-S3 sur son berceau au-dessus du caisson ; effectuer les branchements et contrôler le dégagement sous le XVF.
5. Installer les inserts M3 de la coque et les écrous captifs du HP dans le socle. Monter le haut-parleur sur le socle avec son joint, membrane vers le bas.
6. Conserver un **mou de câble suffisant pour poser le caisson sur le côté** sans tirer sur les bornes du HP ; maintenir cette réserve à l'écart du cône, des clips et des vis. Acheminer les fils par la traversée du caisson et **étancher ce passage**.
7. Placer le caisson cylindrique en dernier, assurer le joint caisson/socle, connecter le HP, puis refermer et visser le socle **par-dessous**. Ne jamais pincer de câble dans le joint.
8. Tester écran, XVF, ESP32, capteur, son et qualité de détection vocale. Coller le plexiglas fumé en **dernière opération seulement** après validation des passages acoustiques (le gabarit actuel des orifices reste indicatif).

## Modèles GitHub

- [Vue 3D éclatée monobloc en trois pièces](./00_KIMIA_V6_MONOBLOC_VUE_ECLATEE.stl)
- [Vue d'assemblage monobloc](./00_KIMIA_V6_MONOBLOC_ASSEMBLAGE.stl)
- [Coque monobloc (STL)](./01_coque_blanche_monobloc_V6.stl)
- [Socle (STL)](./02_socle_bas_V6.stl)
- [Caisson cylindrique (STL)](./03_caisson_cylindrique_V6.stl)
- [Script CadQuery de la variante retenue](./generer_coque_monobloc_v6.py)

Le modèle historique à couronne séparée reste conservé dans les sources **comme sauvegarde**, mais n'est plus l'architecture à privilégier.

**Attention :** la CAO et le passage nominal Ø100 sont contrôlés virtuellement, pas physiquement. L'épaisseur du vrai XVF, les connecteurs, la tenue PETG des clips, l'écran, le boîtier réel du HP et l'étanchéité nécessitent toujours des mesures et des essais à blanc. La PR reste brouillon.
