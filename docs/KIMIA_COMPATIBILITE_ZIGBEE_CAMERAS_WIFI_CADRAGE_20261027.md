# KIMIA Smart — Compatibilité Zigbee complète et caméras Wi-Fi
**Cadrage produit : 27 octobre 2026.** Décision validée par le responsable produit. Ce document décrit une cible à développer et tester, **pas une compatibilité déjà acquise**.

## Objectif de couverture
KIMIA doit gérer toutes les **familles fonctionnelles Zigbee** exposées par Home Assistant (priorité SONOFF + LEDVANCE, extensible aux autres fabricants), et intégrer les **caméras IP Wi-Fi compatibles** sans limiter KIMIA à un catalogue fermé de modèles.

- Base Zigbee : coordinateur compatible tel que le SMLIGHT SLZB-06U prévu, intégration ZHA en priorité. Ne pas installer simultanément deux applications concurrentes sur le même coordinateur. Zigbee2MQTT éventuellement évalué pour des modèles non pris en charge par ZHA, mais c'est une solution alternative à décider sur preuve, pas une seconde passerelle automatique.
- Base caméras : découverte et intégration natives Home Assistant, **ONVIF Profile S en priorité**, RTSP/Generic Camera en recours pour la vidéo seule. Caméras SONOFF CAM-B1P, CAM-PT2 et CAM-S2 : constructeur indique ONVIF et RTSP activables depuis eWeLink, avec fonctionnalités dépendantes du modèle et de son firmware. D'autres marques sont possibles si intégrées dans HA.
- Toute affirmation « compatible » concerne **la référence précise et les fonctions réellement exposées** après intégration. Aucun système ne peut garantir toutes les références Zigbee, certains appareils utilisent des commandes propriétaires nécessitant des quirks/converters ; caméras Wi-Fi propriétaire sans RTSP/ONVIF/intégration HA ne peuvent pas être garanties.

## Familles Zigbee à couvrir dans KIMIA
1. Éclairage : ON/OFF, intensité, blancs, RGB, scènes, bandes LED, groupes natifs.
2. Prises, relais et micromodules : marche/arrêt, mesure W/kWh, plusieurs canaux quand disponibles.
3. Commandes physiques : boutons simples/multiples, interrupteurs, télécommandes, événements d'appui simple/double/long (selon entités HA, souvent `event`/`device trigger`, pas forcément `switch`).
4. Capteurs et alertes : mouvement, présence, contact, fuite, fumée, température, humidité, luminosité, qualité de l'air, batterie ; notifications et scénarios.
5. Volets/stores/rideaux : ouverture/fermeture, position/angle si supporté.
6. Chauffage/ventilation : thermostats, vannes/TRV, ventilateurs, consignes, modes si disponibles.
7. Alarmes, sirènes, serrures, vannes, eau/arrosage : commandes et états, avec protections et confirmations supplémentaires.
8. Entités utiles et moins classiques : `number`, `select`, `button`, `event`, `update`, capteurs multiples par appareil, diagnostiques et disponibilité.

L'interface « Gestion des équipements », les pages Pièces/catégories, les cartes dynamiques, scénarios/scripts et automatisations ne doivent pas être codés uniquement pour `light` et `switch`. À terme, produire des commandes et champs **à partir des capacités HA** (registres, entités, `supported_features`, schéma des actions, attributs, déclencheurs d'appareils) ; afficher seulement les fonctions effectivement prises en charge, et ouvrir les écrans natifs HA pour les fonctions non représentables.

## Caméras Wi-Fi — comportement visé
- Affichage `camera.*` : mosaïque, vue individuelle, plein écran, flux disponible/indisponible et retour au tableau de bord, éventuellement tableau de surveillance dédié.
- Événements HA fournis par ONVIF : mouvement/personne/son et autres capteurs existants, utilisables en déclencheurs de scénarios/automatisations et notifications.
- Contrôles PTZ, instantanés et enregistrements **uniquement si pris en charge par caméra et intégration HA**. Ne pas promettre l'audio bidirectionnel, la conversation vocale ou l'enregistrement natif pour chaque caméra.
- Sécurité : comptes caméras dédiés, identifiants jamais inclus dans YAML public ou frontend ; accès local, permissions/visibilité, pas d'ouverture de port Internet caméra ; intégrations réseau client isolées correctement si nécessaire.
- RTSP seul : vidéo possible, mais **pas automatiquement** détection de mouvement ni PTZ. ONVIF : fonctionnalités exposées selon modèles/versions.

## Compatibilité et démarche de validation
- États visibles « disponible / indisponible / état inconnu » : une entité temporairement indisponible doit être trouvable et affichée en grisé plutôt qu'invisibilisée, sans tentative involontaire de commande.
- Enregistrer référence constructeur, protocole, version firmware, intégration HA, entités et fonctions disponibles; matrice `supporté / partiel / à vérifier / non compatible`. Pas de fausse compatibilité marketing.
- Attendre la clé et la prise Zigbee pour les premiers essais de la VM210. Ajouter ensuite un luminaire LEDVANCE, un capteur/bouton SONOFF puis une caméra Wi-Fi ONVIF pour validation vidéo/événements.
- Tester appairage, ré-appairage, affichage, actions, triggers, sauvegarde et exécution volontaire, indisponibilité réseau, navigation mobile et tablette, comportement après reboot. Pour caméras, vérifier performances avec plusieurs flux, droits et conservation des données.
- Par principe le backend d'exécution reste Home Assistant; KIMIA est une interface et une configuration guidée, pas un hub Zigbee ou NVR propriétaire développé de zéro.
- **Ne pas modifier maintenant le code runtime, les dashboards, les thèmes, les profils, les paramètres ou la Maquette** : leur validation précédente demeure. Pour l'instant c'est un cahier des charges, à mettre en œuvre par étapes après essai du matériel.

## Vérifications documentaires
- ZHA officiel : https://www.home-assistant.io/integrations/zha/
- ONVIF officiel : https://www.home-assistant.io/integrations/onvif/
- Generic Camera officiel : https://www.home-assistant.io/integrations/generic
- Documentation SONOFF sur ONVIF/RTSP des CAM-B1P, CAM-PT2 et CAM-S2 : https://sonoff.tech/blogs/news/how-to-add-security-camera-to-home-assistant
