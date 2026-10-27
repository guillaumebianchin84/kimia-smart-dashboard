# KIMIA Smart — Extension native Énergie · Eau · Secours · Caméras V1

**Statut : prototype isolé de développement — pas installé sur VM210.**
**Base : dernière branche Routines V3.1 et socle KIMIA en l'état.**

## Décisions strictes
- Ne **rien remplacer** dans KIMIA existant (cartes, bandeau, icônes, navbar, thèmes, profils, maquette, réglages, scénarios, pièces).
- Aucune carte `custom:*` créée par cette extension.
- Une **seule carte native par équipement physique** : pour un compteur possédant puissance (W) + énergie (kWh), la carte native `entities` regroupe les deux mesures ; s'il n'y a qu'une seule mesure, une carte `tile`.
- Pour les caméras, **une carte native `picture-entity` par appareil**, en choisissant un seul flux principal lorsque la même caméra a plusieurs profils. Une caméra momentanément indisponible reste affichée.
- Les capteurs de porte, mouvements, alarmes et cartes déjà présents dans l'onglet **Sécurité** restent **strictement inchangés**.
- Aucun changement au cœur `kimia-smart-core-v1.js` ou au moteur de routines.
- Aucun ajout d'icône à la navbar existante. La nouvelle vue `/kimia-next/energie` est une **sous-vue autonome**, accessible par son URL directe et retour natif vers Accueil ; navigation à réexaminer ultérieurement uniquement si explicitement autorisée.
- Pas de création de nouvelle rubrique Caméras : elles s'ajoutent dans **Sécurité** (sections « Caméras · Salon », etc.).

## Contenu du module
Nouveau fichier seulement : `www/kimia-native-extension-v1.js`. Il expose `window.KimiaNativeExtensionV1` avec :
- `plan({dashboard,states,entities,devices,areas,equipment})` : calcul **sans écriture** d'une configuration complète mais structurellement identique, à l'exception des nouvelles sections caméra et de la nouvelle sous-vue Énergie. Contrôle d'idempotence et de collision.
- `apply(hass,{confirm:true,equipment})` : installation **manuelle volontaire**, réservée admin, par API WebSocket native `lovelace/config`, conservation de la version antérieure, vérification anti-conflit avant `lovelace/config/save`. **Aucun lancement ni réécriture au chargement**.
- `automationDrafts(mapping)` : génère quatre brouillons **natifs Home Assistant**, désactivés avec `initial_state:false`. **N'enregistre aucune automatisation et ne commande rien.**

### Consommation électrique
- Détection à partir des véritables entités HA `sensor` dont `device_class` est `power` (W/kW) ou `energy` (Wh/kWh/MWh).
- Une carte native par appareil reconnu (`tile` si une mesure, `entities` si plusieurs).
- Les mesures provenant d'un même compteur utilisent le même `device_id` : pas de doublons puissance + énergie.
- Pas de Linky français supposé, pas de FCFA calculés sans tarif réel, pas de faux compteurs.
- Sous-vue indépendante `/kimia-next/energie`. Aucun changement à la navbar actuelle.

### Eau et surpresseur
- Entités explicites facultatives : `pressureSensor` (mesure pression), `pumpCommand` (commande reconnue et câblée par le client/collègue).
- Une tuile native pour la mesure et une tuile native pour la commande, si elles représentent deux équipements distincts. Aucune activation automatique sur la VM de développement.
- Deux automatismes proposés, **inactifs** : demande de démarrage au-dessous du seuil après temporisation ; fin de demande au-dessus du seuil, avec hystérésis `haut > bas`.
- Nécessite impérativement une autorisation matérielle pompe `pumpPermissive` signalée dans HA et une protection réelle contre marche à sec ; capteur indisponible = pas de nouveau démarrage via la condition du déclencheur.

### Réseau public et groupe électrogène
- Entités explicites : `mainsPresent` (retour présence réseau), `generatorRequest` (entrée « demande de démarrage » d'un **contrôleur dédié**, PAS un contacteur ou un inverseur ATS), `generatorRunning` (retour d'état facultatif).
- Une tuile native par équipement/retour configuré.
- Deux automatismes proposés, **inactifs** : demande de groupe après disparition confirmée du réseau et si le contrôleur remonte `generatorReady=on` ; retrait de la demande après retour réseau confirmé. Ces brouillons ne contrôlent **jamais** un inverseur de source et ne peuvent pas remplacer ses interverrouillages matériels, protections, temporisations ni contrôles de tension.
- L'installateur configure le matériel, valide la logique d'entrée de commande du contrôleur et garde la responsabilité de la sécurité électrique.

## Prérequis d'une validation sur VM210
1. Sauvegarder KIMIA et la VM210. Vérifier que le dashboard `kimia-next` est en **mode Interface/Storage**.
2. Disposer des vraies entités HA avant de renseigner leurs identifiants. Sans elles, les sections Eau/Réseau affichent simplement une instruction native.
3. Aucun capteur, relais ou caméra fictif n'est installé. Le nouveau module ne cherche jamais à appairer un équipement et ne modifie aucune configuration matérielle.
4. Faire d'abord le contrôle avec `plan(...)` : les différences autorisées sont **exclusivement** ajout de sections « Caméras · pièce » dans `securite` et création de la vue `energie`.
5. Pour installer manuellement, `apply` doit être appelé explicitement par un administrateur. Les instructions détaillées dépendent de la manière dont cette application sera livrée/installée sur la VM ; **ne pas copier le YAML complet du dashboard** et ne jamais demander « Actualiser ma maison » pour installer cette extension.
6. La seconde exécution doit être idempotente : zéro duplication et zéro écriture si rien n'a changé. Aucun ancien élément ne doit disparaître.
7. Activer les automatisations seulement **après** validation des sondes, seuils, contrôleur de secours et autorisations matérielles par l'installateur ; **jamais** dans le pack V1.

## Points à finaliser après matériel / avant livraison commerciale
- Définir les seuils réels de pression avec le client/collègue, et comment le pressostat/automate protège la pompe.
- Confirmer l'entrée de commande du groupe et l'état « contrôleur prêt » ; vérifier le retour du réseau et l'ATS interverrouillé.
- Installer une caméra ONVIF/RTSP compatible en intégration HA, vérifier le flux et la séparation effective des accès utilisateurs. Un simple masquage visuel KIMIA ne sécurise pas un flux caméra.
- Ajouter si souhaité plus tard un **accès navigation** à Énergie en respectant intégralement les icônes/bandeau existants et l'ergonomie choisie par l'utilisateur.
- Relier la conversion en coût FCFA à des vrais index kWh et au prix appliqué chez le client.
- Tester sur matériel SONOFF et LEDVANCE Zigbee et caméras Wi-Fi dès leur réception.
- Régler l'affichage des dispositifs indisponibles dans le sélecteur de routines lors d'une mise à jour future séparée.

## Rollback
Aucun déploiement par le dépôt. Sur une installation d'essai, restaurer la copie du dashboard KIMIA précédente, ou retirer exclusivement la vue `energie` et les sections « Caméras · ... » créées par l'extension. Éviter tout remplacement global du dashboard depuis un YAML ancien, qui écraserait des personnalisations récentes.

## Validations du dépôt
`node --check www/kimia-native-extension-v1.js`
`node tests/kimia_native_extension_v1.test.cjs`
`node tests/kimia_v1.test.cjs`
`node tests/kimia_routines_v3.test.cjs`
`node tests/kimia_routines_v31_conditions.test.cjs`
