# KIMIA Smart — appareils indisponibles / erreur de commande (8 novembre 2026)

## Portée

Correction **sur une branche de test** uniquement. Ne modifie aucun appareil Zigbee, le réseau ZHA, les entités Home Assistant ni les automatisations.

Ce correctif prolonge `feat/kimia-usages-prises-et-cartes-20261108` et n'intervient que dans `www/kimia-smart-core-v1.js`. Le gestionnaire Zigbee et le classement des prises restent inchangés.

## Protection pour toutes les tuiles générées KIMIA

KIMIA crée désormais un composant `custom:kimia-safe-tile-v1-card` autour de **la carte Tile native Home Assistant**, avec les mêmes `grid_options`. Ce composant est déclaré dans **le moteur KIMIA déjà chargé**, sans nouvelle ressource JavaScript.

Comportements :

- **Entité disponible** : vraie carte Tile native, commandes habituelles.
- **État `unavailable` ou `unknown`** : commandes de la tuile désactivées, fonctions interactives masquées, message « Indisponible ». Le titre et l'état restent affichés par la tuile native.
- **Entité absente du dictionnaire d'états HA** : une seule carte Home Assistant non interactive remplace la tuile, mentionnant l'absence de l'appareil.
- **Commande qui échoue alors que HA indique encore `on` ou `off`** : l'erreur de service, lorsqu'elle remonte au navigateur, est gérée au niveau de **cette seule tuile** ; les commandes de cette carte sont bloquées avec « Commande impossible » et un bouton « Réessayer ». Les autres tuiles restent fonctionnelles.
- **État redevenu disponible** : la carte retrouve ses commandes lorsque l'état est rétabli ou après demande de réessai pour un refus transitoire.

Domaines couverts par le moteur : `switch`, `light`, `cover`, `climate`, `fan`, `media_player`, `binary_sensor`, `alarm_control_panel`, ainsi que les entités prises dans la répartition KIMIA. Les entités de mesure déjà présentes dans une carte peuvent également utiliser cette protection ; les cartes personnalisées à la main ne sont pas réécrites.

### Limites à connaître

- Une prise physiquement débranchée peut rester temporairement marquée `on` ou `off` par ZHA. Tant que Home Assistant n'a pas détecté la coupure **et tant qu'aucune commande ne renvoie d'erreur**, aucun frontend ne peut affirmer qu'elle est hors ligne.
- Les commandes provenant d'automatisations, scènes, autres dashboards ou d'une carte **Area** native ne sont pas interceptées par ce composant. La protection est volontairement limitée aux tuiles KIMIA gérées automatiquement.
- La capture terrain précédente ne suffit pas à identifier avec certitude l'origine du changement de disposition. Les journaux du navigateur et de ZHA seront utiles si le problème se reproduit.
- Une déconnexion réseau complète entre le navigateur et Home Assistant doit être gérée par le client officiel HA ; aucun composant client ne peut garantir une continuité de service dans ce cas.
- La protection n'est pas une sécurité électrique : n'utiliser une prise connectée pour un surpresseur ou une climatisation que si le matériel et le fabricant l'autorisent.

## Installer sur la VM KIMIA de test

1. Sauvegarder le moteur actuel `/config/www/kimia-smart-core-v1.js` et exporter le dashboard `kimia-next` avant une synchronisation.
2. Télécharger le fichier **Raw** `www/kimia-smart-core-v1.js` depuis cette branche et remplacer exactement le fichier de test dans `/config/www/`.
3. Dans **Home Assistant → Paramètres → Tableaux de bord → Ressources**, mettre à jour **la ressource existante** vers `/local/kimia-smart-core-v1.js?v=20261108-horsligne` (ne pas la créer en double).
4. Recharger le navigateur et l'application mobile ; utiliser **KIMIA Configuration → Actualiser ma maison** pour migrer uniquement les anciennes tuiles non personnalisées.
5. Vérifier un premier équipement disponible et son action, puis tester sur **un appareil Zigbee de test** une déconnexion et son retour. Si l'équipement est piloté par une prise, ne pas y brancher un appareil sensible lors du test.
6. Vérifier aussi Sécurité, Lumières, Prises, Climatisation et Pièces ; aucune autre carte ne doit disparaître ou être bloquée.
7. En cas d'anomalie, restaurer le JavaScript sauvegardé et la ressource précédente, puis le dashboard sauvegardé si nécessaire.

Le gestionnaire `www/kimia-zigbee-manager-v1-card.js` de la branche précédente ne change pas : **un seul JS à remplacer** pour ce correctif.

## Tests logiciels

- `tests/kimia_v1.test.cjs` : migration des tuiles natives, conservation du reste de KIMIA, usages multiples.
- `tests/kimia_safe_tile_v1.test.cjs` : états disponibles / indisponibles / inconnus / absents, refus de commande, isolation entre cartes et reconnexion pour sept domaines.
- CI GitHub Actions. Validation matérielle réelle nécessaire avant fusion.

Suivi initial : [issue #14](https://github.com/guillaumebianchin84/kimia-smart-dashboard/issues/14).
