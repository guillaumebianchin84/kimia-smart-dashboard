# KIMIA Smart — objectif de compatibilité Zigbee complète et caméras Wi-Fi
Date : 27 octobre 2026 · **Cadrage produit validé, pas une livraison de fonctions.**
Branche de conception isolée. **Ne modifier aucun JavaScript, dashboard, moteur Routines, ressource ni VM210/VM100 à ce stade.**

## Objectif confirmé
KIMIA doit gérer toute **famille fonctionnelle** d'appareils Zigbee prise en charge par Home Assistant, et proposer une expérience de caméra Wi-Fi intégrée (vidéo, événements, scénarios), en donnant la priorité au fonctionnement local, sans se limiter aux ampoules et prises SONOFF / LEDVANCE. Rester ouvert aux autres fabricants Zigbee et de caméras interopérables.

**Compatibilité honnête :** impossible de garantir chaque référence propriétaire ; ZHA prend en charge les types Zigbee standards, mais certains modèles demandent des *quirks*, expose moins d'options ou ne fonctionnent pas. Ne pas confondre gamme supportée, modèle appairable, fonction pilotable, et fonction disponible dans les scripts/automatisations. Pour les caméras, le Wi-Fi n'est qu'un transport réseau ; les protocoles ONVIF/RTSP ou l'intégration de marque déterminent la compatibilité.

## Architecture : Home Assistant reste le moteur
1. **Zigbee via ZHA** et coordinateur KIMIA prévu SMLIGHT SLZB-06U, si firmware et liaison locale compatibles. Aucune seconde passerelle SONOFF/LEDVANCE obligatoire pour les appareils ZHA compatibles. Par la suite, étudier Zigbee2MQTT comme option distincte, sans changer automatiquement un réseau ZHA existant.
2. **Registres HA** (`area_registry`, `device_registry`, `entity_registry`, états, attributs, fonctions de domaines, services/actions et éventuellement événements) = seule source des appareils et capacités. Ne jamais coder la liste des modèles en dur ni déduire les caractéristiques d'un nom commercial.
3. **KIMIA** organise les pièces, présente les cartes adaptées et construit scripts et automatisations natifs HA. Ne pas écrire directement dans la base ou les registres, ne pas créer de moteur domotique propriétaire.
4. **Caméras Wi-Fi locales** : intégrer ONVIF Profile S quand disponible (vidéo, événements, éventuellement PTZ), RTSP/Generic Camera ou go2rtc pour flux et affichage, ainsi que les intégrations constructeur officielles quand elles offrent davantage de commandes. L'application KIMIA ne doit pas devenir elle-même un serveur vidéo. Flux locaux gérés/authentifiés par HA et couche vidéo compatible.
5. **Confidentialité et droits réels** : les profils actuels KIMIA masquent seulement visuellement les pièces. Cela NE protège PAS les flux vidéo, commandes de serrure, alarmes ou vies privées. Avant la diffusion commerciale, prévoir un modèle de permissions effectives côté serveur ou limiter strictement la visibilité/les opérations aux comptes réellement autorisés dans HA. Ne jamais injecter d'URL RTSP avec identifiants dans le YAML de cartes accessibles à tous. Aucune ouverture de ports caméra sur Internet. Accès externe protégé via infrastructure HA déjà retenue.

## Gammes Zigbee ciblées : tous types HA exposés
- **Éclairage** : `light`, intensité, couleur, blanc variable, scènes, groupes.
- **Prises, relais et énergie** : `switch`, mesure `sensor` (W, kWh, A, V) si le produit la publie.
- **Boutons, télécommandes, interrupteurs** : `event`, événements/actions ZHA, éventuellement scènes/bindings ; actions simples, double clic, maintien si exposés.
- **Capteurs** : `binary_sensor` et `sensor` (mouvement, présence, contact, fuite, fumée, température, humidité, luminosité, batterie, pression, qualité de l'air).
- **Volets, stores, rideaux, ouvrants** : `cover`, position, tilt si disponible.
- **Chauffage / ventilation** : `climate`, `fan`, têtes thermostatiques, consignes, modes supportés.
- **Vannes et arrosage** : `valve`, état et position si exposés.
- **Serrures, alarmes, sirènes** : `lock`, `alarm_control_panel`, `siren` ; confirmations et vraies permissions serveur avant commande.
- **Paramètres spécifiques** : `number`, `select`, `button`, `update` (réglages matériels, calibrage, OTA), sans exposer les actions de maintenance dangereuses à l'utilisateur lambda.
- Certains modèles ne publieront qu'une partie de ces entités ; présenter les fonctionnalités réellement reconnues avec indication d'indisponibilité.

**SONOFF** : inclure en priorité prises, micromodules, capteurs de présence/mouvement/porte/eau/température, télécommandes, thermostats, énergie, volets/vannes sous réserve de compatibilité modèle. **LEDVANCE** : toutes catégories SMART+ Zigbee exposées par ZHA, pas seulement E27/GU10 ; rubans, luminaires, prises, boutons et autres équipements réellement reconnus.

## Caméras Wi-Fi : expérience KIMIA attendue
- Nouvelle interface ou section **Caméras** intégrée à la navigation existante sans la casser ; liste par pièce ; aperçu et direct sur mobile/tablette/PC.
- Détection automatique des entités `camera` déjà présentes dans HA ; configuration guidée pour ONVIF/RTSP via les intégrations officielles (ne jamais demander de mot de passe en clair dans une carte Lovelace).
- États et qualité du flux, indication « caméra indisponible », ordre manuel, sélection du flux principal ou léger si existant.
- **Routines** : déclencheurs sur événement de mouvement/personne/sonnette fourni par l'intégration (souvent `binary_sensor`/`event`), conditions et actions compatibles (captures, notifications, enregistrements si autorisés).
- **Options facultatives selon caméra** : PTZ, instantanés, sirène, projecteur, détection humaine, enregistrement local/NVR, microphone/talkback. Ne jamais inventer d'entité et ne pas promettre l'audio bidirectionnel ou PTZ universel.
- Flux vidéos lourds : bas débit ou sous-flux pour mosaïque multi-caméras, flux haute qualité à l'ouverture, limites CPU/réseau du Home Assistant Green.
- Aucun démarrage d'enregistrement ni accès microphone par défaut ; modes de confidentialité et consentement des occupants à concevoir avant produit commercial.

### Compatibilités de marque confirmées par documentation constructeur
- **SONOFF CAM-B1P, CAM-PT2, CAM-S2** : guide SONOFF ONVIF/RTSP avec vidéo et événements sur modèles pris en charge ; PTZ sur modèles compatibles nécessite une commande/script spécifique. Vérifier firmware.
  Source : https://sonoff.tech/blogs/news/how-to-add-security-camera-to-home-assistant
  Notice SONOFF CAM-PT2 : https://sonoff.tech/fr-fr/blogs/news/how-to-integrate-sonoff-cam-pt2-into-home-assistant
- **LEDVANCE SMART+ Wi-Fi Camera Fixed et 360, intérieur et extérieur** : fiche LEDVANCE annonce RTSP/ONVIF. Les autres fonctions décrites dans l'application SMART+ ne seront pas nécessairement toutes exposées dans HA.
  https://data.ledvance.com/fr-fr/home-lighting/produits/smart-home/electronique-domestique/smart-wifi/composants-interieurs-smart-avec-technologie-wi-fi/cameras-smart-avec-technologie-wi-fi/cameras-de-surveillance-connectees-avec-qualite-dimage-haute-resolution-et-technologie-wifi-c391333?productId=364415
  https://www.ledvance.com/fr-fr/home-lighting/produits/smart-home/electronique-domestique/smart-wifi/composants-exterieurs-smart-avec-technologie-wi-fi/cameras-smart-avec-technologie-wi-fi/cameras-de-surveillance-exterieures-connectees-avec-qualite-dimage-haute-resolution-et-technologie-wifi-c391336?productId=364421
- **Autres marques** : admettre toute caméra exposant une intégration caméra Home Assistant fonctionnelle ; ONVIF/RTSP ou intégration fabricant. Le Wi-Fi seul ne suffit pas.
  Sources HA : https://www.home-assistant.io/integrations/zha/ ; https://www.home-assistant.io/integrations/onvif/ ; https://www.home-assistant.io/integrations/generic/ ; https://www.home-assistant.io/integrations/go2rtc/

## État KIMIA existant (ne rien casser)
- Le gestionnaire Zigbee KIMIA actuel permet ZHA, recherche/appairage, liste, renommage et affectation de pièces.
- Le cœur du dashboard client courant ne catégorise que `light`, `cover`, `climate`, `fan`, `switch`, `media_player`, `binary_sensor`, `alarm_control_panel`. Il **n'a pas encore** une expérience caméra `camera`, serrure `lock`, vanne `valve` etc. dans ses catégories automatiques.
- Routines V3 / V3.1 ne couvre qu'un sous-ensemble d'actions et de déclencheurs HA ; l'éventuelle extension aux événements de boutons et de caméras exigera des adaptations explicites, sans perdre la fidélité lecture/écriture existante.
- Tous les tableaux de bord, thèmes, maquettes, profils, cartes client et automatisations validés restent figés pendant la phase de cadrage.

## Feuille de route à valider après réception de la clé et de la prise
**Phase A** : appairage SONOFF Zigbee + LEDVANCE de test, inventaire des entités et fonctions réelles, scénarios et automatismes simples, réparation des appareils indisponibles dans sélecteurs.
**Phase B** : générateur de cartes et sélecteur d'actions *basés sur les capacités*, couvrant tous domaines standards Zigbee, y compris événements/boutons. Vérification multi-marques, permissions et OTA.
**Phase C** : caméra Wi-Fi SONOFF ou LEDVANCE ONVIF/RTSP représentative. Vérifier flux, latence, événement mouvement, vue caméra et permissions, puis une routine de test sans action risquée.
**Phase D** : autres intégrations caméra/ONVIF, vidéo multiple et expériences avancées réellement supportées, sécurité/ACL, documentation installateur.
**Phase E** : matrice de compatibilité modèle/firmware/intégration/fonctions validées à l'aide de matériel réel ; pas de label « compatible » sans essais ou documentation technique fiable.

## Critères d'acceptation
- Toutes les entités standards HA reconnues apparaissent dans un inventaire KIMIA même quand l'une est indisponible (avec son état), sans faux contrôle.
- Aucun modèle de produit codé en dur ; SONOFF/LEDVANCE testés, autres marques possibles si leur HA est opérationnel.
- Les scènes, scripts et automatisations créés par KIMIA restent exécutés par HA ; pas d'action pendant la création, aucune réécriture avec perte.
- Une caméra ONVIF/RTSP compatible peut être vue en direct depuis KIMIA en local ; événements accessibles à une routine s'ils existent.
- Les flux caméra, serrures, alarmes restent protégés par de **vraies** autorisations, pas seulement des conditions de visibilité UI.
- Régression : vérifier toutes les sections KIMIA existantes, navbar, thèmes, dashboards, maquettes, liste To-do, utilisateurs.
