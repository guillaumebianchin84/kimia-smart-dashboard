# KIMIA Voice V6 — faut-il séparer la couronne supérieure ?

## Situation
La forme extérieure triangulaire très arrondie, la hauteur et les cotes des composants restent **inchangées**. Cette étude ne modifie aucune pièce de référence : elle publie seulement des fichiers de visualisation supplémentaires.

## Trois vues GitHub

- **[Quatre pièces en vue éclatée](./00_KIMIA_V6_4_PIECES_VUE_ECLATEE.stl)** : socle, caisson cylindrique, coque, couronne du XVF3800.
- **[Couronne XVF seule](./04_couronne_XVF_avec_logements_clips.stl)** : dessous avec les logements des trois clips et inserts borgnes ; dessus sans vis apparentes.
- **[Étude coque + couronne fusionnées](./00_KIMIA_V6_ETUDE_COQUE_COURONNE_INTEGREES.stl)** : visualisation d'un seul volume extérieur, **NON validé pour impression ou assemblage**.

## Comparaison pratique

| | Couronne séparée (V6 actuelle) | Couronne intégrée à la coque (étude) |
|---|---|---|
| Aspect visible | Raccord discret entre coque et couronne | Pas de ligne de séparation |
| Impression 3D | Deux pièces imprimables indépendantes | Une grande coque, plus de volume/supports d'impression possibles |
| Montage XVF3800 | Clips installés sur le capot isolé, carte et connecteurs faciles à inspecter | Insertion et déclipsage depuis l'ouverture basse de la coque : accessibilité à réétudier |
| Entretien | Retrait du capot avec le XVF sans décoller le plexiglas ; fixations par-dessous | XVF à démonter dans la coque, avec l'électronique/le caisson en place ou déposés |
| Plexiglas Ø106 × 1,5 mm | Collage sur bande annulaire 1,5 mm | Même collage possible |
| Visserie de capot | Trois vis M3 accessibles par-dessous ; inserts borgnes | Visserie de liaison capot/coque supprimable, mais leurs logements doivent être revus |
| Risque pour carte/clips | Montage séparé testable à la main | Meilleure simplicité visuelle, mais plus difficile d'accéder aux clips |

## Recommandation

Pour le **premier prototype**, conserver la **couronne amovible**. Elle a un vrai intérêt pour **tester les clips du XVF3800, les micros et leurs connecteurs, remplacer la carte ou corriger un module sans réimprimer toute la coque blanche**.

L'intégration à la coque reste une **option de finition pour une V7 ou une version après validation physique**. Il faudrait alors déplacer/adapter les clips et faire disparaître les fixations devenues inutiles ; l'aperçu fusionné n'est pas un STL de fabrication. Aucune variante ne doit masquer les micros ni rendre l'écran ou l'ESP32 inaccessibles.
