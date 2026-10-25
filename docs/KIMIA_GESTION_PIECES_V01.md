# KIMIA Smart — Gestion des pièces, v0.1

## Fonction créée
La carte personnalisée `custom:kimia-room-manager-card`, intégrée au **deuxième onglet « Pièces et appareils » du dashboard KIMIA Administration**, permet sans quitter le dashboard de :

- consulter les vraies Zones Home Assistant et leurs appareils ;
- créer un étage ;
- créer une pièce avec nom, étage et type (icône) ;
- sélectionner une pièce, la renommer et modifier son étage ;
- associer un appareil **déjà installé** à cette pièce (si l'appareil appartient à une autre pièce, une confirmation est demandée).

Le premier onglet « Navigation » reste identique. Le dashboard KIMIA Smart public, y compris son Accueil, sa Maquette, ses cartes, sa météo et ses boutons, n'a pas été modifié pour cette fonctionnalité.

## Prérequis

- Home Assistant prenant en charge les API WebSocket des registres Zones, Étages et Appareils.
- Un **compte administrateur Home Assistant** pour effectuer les opérations d'écriture.
- Un dashboard **KIMIA Administration réservé aux administrateurs**.
- Une sauvegarde avant les premiers essais.

Le code utilise directement la connexion `hass.callWS` du compte utilisateur actif ; pas de jeton supplémentaire et pas de service externe.

## Installer sur la VM de test

1. Télécharger depuis GitHub `www/kimia-room-manager-card.js` en **Raw** (fichier JavaScript), puis le placer dans `/config/www/kimia-room-manager-card.js` de Home Assistant.
2. Déclarer une ressource Lovelace dans **Paramètres → Tableaux de bord → Ressources** (ou dans l'interface « Ressources » de la version HA) :
   - URL : `/local/kimia-room-manager-card.js?v=1`
   - Type : **Module JavaScript** (`module`).
3. Faire un rechargement complet de la page afin de charger la ressource.
4. Sauvegarder le YAML de **KIMIA Administration** existant.
5. Remplacer uniquement le YAML du dashboard Administration par `kimia-admin-ui-import.yaml`.
6. Ouvrir l'onglet **Pièces et appareils**. La carte `KIMIA · Gestion des pièces` doit apparaître.
7. Tester dans cet ordre : création de l'étage **RDC**, de la pièce **Salon**, renommage temporaire de **Salon** puis retour à son nom initial, et association d'un appareil de démonstration déjà installé.
8. Vérifier dans **Paramètres → Zones, étiquettes et étages** que la pièce existe réellement, et dans la fiche de l'appareil que sa zone est correcte.

**En cas de « Carte personnalisée introuvable » :** vérifier le chemin du fichier, l'URL de la ressource et son chargement dans le navigateur. La branche GitHub ne déploie rien automatiquement sur la VM.

## API Home Assistant utilisées

- `config/area_registry/list`, `config/area_registry/create`, `config/area_registry/update`
- `config/floor_registry/list`, `config/floor_registry/create`
- `config/device_registry/list`, `config/device_registry/update`

La validation statique JavaScript a été effectuée. **Aucun essai réel de création ou d'association n'a encore été effectué sur la VM.**

## Ce qui reste à faire

1. Ajouter l'**appairage Zigbee via ZHA** directement dans KIMIA, pour le coordinateur réseau SMLIGHT SLZB-06U et les équipements SONOFF / LEDVANCE Zigbee compatibles.
2. Ajouter la possibilité d'affecter les entités sans appareil (registre des entités).
3. Afficher automatiquement les équipements créés dans des **cartes de pièce KIMIA**, sans modifier le YAML à chaque ajout. La carte d'administration v0.1 ne fait pas encore cela.
4. Pour des **utilisateurs non administrateurs** qui doivent créer des pièces ou appairer des appareils, concevoir un composant serveur avec autorisations explicitement limitées : une carte frontend seule n'a pas le droit de contourner la sécurité Home Assistant.

La carte ne supprime pas de pièces ni d'appareils. Modifier la pièce affectée à un équipement peut modifier le comportement d'automatisations utilisant cette pièce ; tester sur une VM de démonstration.

Sources API officielles :
- https://github.com/home-assistant/core/blob/dev/homeassistant/components/config/area_registry.py
- https://github.com/home-assistant/core/blob/dev/homeassistant/components/config/floor_registry.py
- https://github.com/home-assistant/core/blob/dev/homeassistant/components/config/device_registry.py
