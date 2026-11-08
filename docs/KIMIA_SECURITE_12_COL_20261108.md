# KIMIA — Sécurité sans commande, tuiles 12 colonnes (08/11/2026)

## Problèmes constatés
- Dans **Sécurité**, l'ancienne carte native « Area / Salon » conserve une commande générale de prises (et parfois d'autres équipements) alors que la page doit uniquement afficher des capteurs.
- Les tuiles ajoutées dans certaines vues (lumières, volets, musique...) ont encore une largeur de 6 colonnes : texte tronqué.

## Correctif
- **Sécurité** : chaque pièce est présentée par un **titre natif Home Assistant de type `heading`**, texte uniquement, sans pictogramme, fonction ni commande. L'ancienne carte Area est remplacée lors de « Actualiser ma maison ».
- **Toutes les cartes d'équipement générées par KIMIA** : `grid_options.columns=12`, également dans la carte Tile native sous-jacente. Largeur 12/12 sans CSS custom.
- Migration des anciens modèles KIMIA 6 colonnes, avec conservation des cartes personnalisées qui ne correspondent pas à un modèle généré connu.
- Les commandes de pièce dans les autres vues demeurent inchangées.
- Le traitement de l'indisponibilité des appareils reste celui de la branche précédente ; le bug général `MAC_NO_ACK` est suivi à part.

## Installation test
1. Sauvegarder `/config/www/kimia-smart-core-v1.js` et le dashboard `kimia-next`.
2. Récupérer **uniquement** `www/kimia-smart-core-v1.js` depuis la branche `fix/kimia-securite-titre-tuiles-12-20261108` dans GitHub.
3. Remplacer `/config/www/kimia-smart-core-v1.js` sur la machine de test KIMIA (ne pas toucher VM100).
4. Actualiser la ressource Home Assistant existante en `/local/kimia-smart-core-v1.js?v=20261108-security12` (ne pas ajouter une ressource en double).
5. Recharger complètement la page sur le PC/mobile puis cliquer sur **KIMIA Configuration → Actualiser ma maison**.
6. Vérifier dans **Sécurité** le titre « Salon » sans bouton ; vérifier sur **Prises, Lumières, Volets, Musique, Climatisation et Pièces** que toutes les tuiles ajoutées sont larges et que les commandes normales restent disponibles.

## Tests automatisés
- Conversion des anciennes cartes Area Sécurité en titres natifs.
- Pas de doublon après plusieurs synchronisations.
- Migration des anciennes tuiles musique 6 colonnes en 12.
- Largeur 12 vérifiée dans toutes les rubriques, côté carte externe et Tile HA interne.
- Conservation des cartes modifiées par l'utilisateur.

**Rien n'est installé automatiquement sur Home Assistant : GitHub ne contient que la version candidate à tester.**
