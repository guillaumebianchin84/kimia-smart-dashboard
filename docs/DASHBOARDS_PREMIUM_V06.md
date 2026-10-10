# KIMIA Smart v0.6 — guide des dashboards et de Configuration client

## 1. Les fichiers qui comptent

- `dashboard-ui-import.yaml` : **8 vues** KIMIA à importer dans le dashboard principal HA créé depuis l'interface.
- `config-client-ui-import.yaml` : page de configuration client à importer dans un deuxième dashboard HA créé depuis l'interface.
- `maintenance-installateur.yaml` : page maintenance, réservée à un compte HA **administrateur**.
- `themes/` : quatre thèmes, dont **KIMIA Gris Premium** validé visuellement.
- `packages/kimia_client_theme.yaml` : sélecteur de thème et affichage météo/journal.
- `views/*.yaml` + `dashboard.yaml` : sources modulaires YAML de référence pour les installateurs, pas le mode recommandé aux utilisateurs voulant déplacer les cartes.

## 2. Installation sur une VM Home Assistant de test

1. Installer et contrôler les ressources HACS **Button Card** et **Card Mod**. L'accueil utilise aussi **RSS News Card** ; sans cette carte, remplacer son bloc par une carte Markdown lors des essais.
2. Copier les quatre fichiers `themes/*.yaml` dans `/config/themes/`.
3. Copier `packages/kimia_client_theme.yaml` dans `/config/packages/`.
4. Vérifier une seule fois dans `configuration.yaml` :
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   frontend:
     themes: !include_dir_merge_named themes
   ```
   Si ces sections existent déjà, ne pas les dupliquer.
5. Vérifier la configuration HA puis **redémarrer manuellement une fois** pour charger le package. Recharger les thèmes si nécessaire.
6. Créer le dashboard **KIMIA Smart** depuis l'interface de Home Assistant, puis coller `dashboard-ui-import.yaml` dans l'éditeur de configuration brute.
7. Créer le dashboard **Configuration client** depuis l'interface HA, puis coller `config-client-ui-import.yaml`. Fixer son URL à `kimia-client` pour que le bouton Paramètres de KIMIA la rejoigne.
8. Pour Maintenance : créer **un troisième dashboard** avec les options de sécurité `require_admin: true` et l'URL `kimia-maintenance`, puis importer `maintenance-installateur.yaml`. Dans HA, le propriétaire du dashboard peut régler sa visibilité / son accès dans les paramètres. **Vérifier avec un compte non administrateur que l'accès est refusé.**
9. Dans les profils HA qui doivent suivre le choix collectif, sélectionner **Utiliser le thème par défaut**.

Les URLs `/kimia-client/configuration` et `/kimia-maintenance/maintenance` supposent exactement ces URL de dashboards.

## 3. Règle de conception : une carte = un élément

Toutes les pages du dashboard principal utilisent des **Sections** HA
avec des cartes individuelles et `grid_options` :
- pas de `horizontal-stack` ;
- pas de `vertical-stack` ;
- pas de cartes `grid` imbriquées.
Chaque élément peut être déplacé ou redimensionné **dans l'éditeur HA (mode storage)**.

Les emplacements intitulés « À associer » sont volontaires :
- l'installateur choisit une entité `light`, `cover`, `switch`, `camera` ou `media_player` compatible ;
- il transforme la carte d'emplacement en commande réelle **après vérification du comportement de l'appareil** ;
- il supprime les emplacements inutiles du client.

**Attention :** les pages ne se construisent pas automatiquement avec les appareils HA.
C'est un gabarit ergonomique à configurer, sans script dynamique supplémentaire
ni dépendance de découverte automatique.

## 4. Accueil validé et sources de démonstration

L'accueil reprend la V4 testée visuellement :
- bandeau KIMIA Smart by PROMAINT ;
- Météo-France : `weather.meteo_france_forecast_for_city_le_pontet_provence_alpes_cote_d_azur_84_fr_le_pontet` ;
- capteurs `sensor.temperature_interieure_netatmo` et
  `sensor.temperature_exterieure_meteo_france` ;
- modes `input_boolean.mode_absence` et
  `input_boolean.gestion_clim_chauffage_maison` ;
- climatiseurs `climate.clim_salon` / `climate.clim_chambre` ;
- consigne `input_number.consigne_maison` ;
- RSS `sensor.rss_bfmtv`, `sensor.rss_le_monde` avec `custom:rss-news-card`.

Ces noms servent **aux tests sur la maison témoin** ; les installations
clients doivent utiliser leurs propres intégrations et entités.

## 5. Réglages client

Les sélecteurs `input_select.kimia_meteo_visible` et
`input_select.kimia_journal_visible` ont deux valeurs : « Oui » et « Non ».
Ils rendent visibles ou masquent les cartes correspondantes sur l'accueil
avec la propriété native `visibility` — sans supprimer ces cartes.

Le choix du thème `input_select.kimia_theme_global` déclenche
une automation `frontend.set_theme`. **Le thème par défaut est global
à Home Assistant** et chaque profil utilisateur peut conserver un thème
individuel distinct. Les cartes utilisant des couleurs CSS fixes peuvent
ne pas suivre automatiquement le thème sélectionné.

## 6. Redémarrage

Le bouton « Redémarrer Home Assistant » se trouve uniquement
dans le dashboard de **maintenance administrateur**.
Il utilise l'action officielle `homeassistant.restart` et une
**confirmation explicite**. Il ne contourne pas le contrôle d'accès
de Home Assistant. **Un client sans droits administrateur
ne peut pas utiliser ce bouton.**

Le redémarrage relance **Home Assistant Core**, pas
nécessairement Proxmox, le routeur ou le système d'exploitation.
L'action vérifie la configuration avant de redémarrer.

## 7. Ce qu'il faut encore tester

- Importation UI des 8 vues, déplacement des cartes individuellement ;
- rendu sur téléphone/tablette avec les **quatre thèmes** ;
- bon fonctionnement des nouvelles préférences (incluant après un redémarrage) ;
- RSS News Card installée et Météo-France disponible ;
- droits d'accès Maintenance depuis un compte standard et un compte admin ;
- commande de redémarrage admin (sur VM de test uniquement) ;
- attribution réelle d'une entité par carte, sans relais fictif.

**Aucun composant n'a été installé chez un client par cette branche GitHub.**
