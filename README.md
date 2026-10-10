# KIMIA Smart — dashboards premium et configuration client

## Nouvelle option : plan interactif Maquette Card

Cette branche ajoute une vue **Plan de maison** avec [Maquette Card](https://github.com/TooMuhtsh/maquette-card). L'installateur dessine le logement dans l'éditeur graphique de la carte, peut commencer à partir des pièces Home Assistant et associe les véritables entités. Le plan de chaque client est à créer : nous ne connaissons pas les dimensions réelles du logement.

**Installation nécessaire :** Maquette v0.2.0 depuis HACS (dépôt personnalisé). La page principale KIMIA et ses cartes indépendantes restent intactes. Un dashboard de démo isolé (sans action sur tes appareils) est fourni : `maquette-demo-ui-import.yaml`.

Guide d'installation : [Maquette Card dans KIMIA](docs/MAQUETTE_CARD.md).


## V0.6 — Nouvelle base validée visuellement

La V0.6 reprend **l'Accueil V4 Gris Premium testé sur téléphone**,
et le décline en pages indépendantes : Lumières, Volets, Climatisation,
Musique, Sécurité et Prises. Les cartes sont **individuelles**,
placées dans des sections HA natives. La page Paramètres reste le lien
vers le dashboard **Configuration client**.

**Attention : le design de l'accueil est validé visuellement par le test,
mais les autres pages et les fonctions de configuration sont de nouveaux
prototypes et restent à tester en Home Assistant.**

### Importation recommandée (cartes déplaçables)

- `dashboard-ui-import.yaml` : dashboard principal prêt pour l'éditeur
  brut d'un **dashboard HA géré par l'interface (mode storage)**.
- `config-client-ui-import.yaml` : dashboard Configuration client,
  à importer dans un **second dashboard HA géré par l'interface**.
- `maintenance-installateur.yaml` : dashboard de maintenance,
  **à déclarer administrateur uniquement** via le réglage HA
  `require_admin: true` ou l'option équivalente dans les paramètres du dashboard.

Ce mode est requis si l'on veut déplacer les cartes par glisser-déposer
dans HA : **les dashboards en `mode: yaml` ne sont pas éditables
visuellement**.

### Fonctions client v0.6

La page Configuration client peut :
- choisir les quatre thèmes KIMIA ;
- afficher/masquer **la météo et le journal** de l'accueil,
  avec `input_select.kimia_meteo_visible` et
  `input_select.kimia_journal_visible` ;
- ouvrir la page Maintenance si le compte dispose de droits administrateur.

Le thème choisi est le **thème par défaut de tout Home Assistant**,
et non seulement de KIMIA. Les préférences personnelles de thème
des profils HA restent prioritaires.

### Ce qui n'est pas encore automatique

Les cartes "À associer" des pages Lumières, Volets, Prises,
Sécurité et Musique sont des emplacements prêts à personnaliser ;
elles **ne pilotent pas encore les équipements** d'un client.
L'installateur devra leur affecter la bonne entité Home Assistant
avant leur mise en service. Aucun contrôle d'un moteur de volet,
aucun système d'alarme et aucune caméra n'est mis en service
par ce prototype.

L'accueil réutilise les entités de **la maison de test**
(Météo-France du Pontet, Netatmo, climatisations, RSS BFMTV et Le Monde).
Les installations client devront utiliser **leurs propres** entités
et sources configurées.

**Guide détaillé : [DASHBOARDS_PREMIUM_V06](docs/DASHBOARDS_PREMIUM_V06.md)**

---

## Historique du prototype

## Configuration client v0.5 : quatre thèmes au même endroit

**Nouvelle branche : `feat/config-client-themes` (non fusionnée).**

Cette version fournit un **deuxième dashboard "Configuration client"**, avec quatre
styles : **KIMIA Gris Premium**, **KIMIA Clair**, **KIMIA Sombre** et **KIMIA Signature**.
Chaque style est un bouton indépendant, et une liste déroulante native permet
aussi de choisir le thème. Les réglages techniques du routeur et les secrets
ne sont pas affichés dans le dashboard client.

La sélection est enregistrée par `input_select.kimia_theme_global`,
puis une automation applique le thème grâce à l'action officielle
`frontend.set_theme`. Aucun JavaScript custom n'est nécessaire pour la sélection.

**Limites importantes :** cette action change le **thème Home Assistant par défaut
sur toute l'installation**, pas seulement les pages KIMIA. Un utilisateur ayant
choisi explicitement un thème dans son profil doit repasser à **Utiliser le thème
par défaut** pour suivre ce réglage collectif. Certains styles CSS codés en dur
dans les cartes HACS restent indépendants des thèmes.

**Mode d'emploi complet : [Configuration client](docs/CONFIGURATION_CLIENT.md).**
La fonctionnalité est codée mais **non testée sur une VM Home Assistant**.

### Installation supplémentaire v0.5

- Copier les **quatre** fichiers `themes/*.yaml` dans `/config/themes/`.
- Copier `packages/kimia_client_theme.yaml` dans `/config/packages/`.
- Copier `config-client.yaml` et `views/09-configuration-client.yaml` sous `/config/kimia/`.
- Déclarer **deux** dashboards sous l'unique clé `lovelace.dashboards` :
  le dashboard `kimia-smart` existant et le nouveau `kimia-client`.
- Le lien **Paramètres → Configuration client** du dashboard KIMIA
  mène à `/kimia-client/configuration`.


## Direction visuelle v0.4 — sobre et premium

La branche `feat/themes-premium-responsive` introduit **trois thèmes** (KIMIA Clair, KIMIA Sombre, KIMIA Signature), un petit bandeau KIMIA Smart by PROMAINT et une navigation claire entre les pages Accueil, Lumières, Volets, Climatisation, Musique, Sécurité, Prises et Paramètres.

**Responsive natif :** toutes les vues utilisent `type: sections` ; Home Assistant réorganise les sections sur téléphone et tablette. Dans la v0.5 le thème commun est choisi depuis **Configuration client**. Le profil HA doit rester sur le thème par défaut pour suivre ce choix. Aucun thème n'est forcé sur les vues. **Aucun HACS ni JavaScript personnalisé requis.**

Le pictogramme `www/kimia-logo.svg` est une **signature graphique provisoire** reprenant le nom et les couleurs de la plaquette ; il ne remplace pas le fichier logo officiel PROMAINT de qualité source.

**Les cartes de la version 0.4 utilisent les entités simulées du package de démonstration.** Les véritables équipements SONOFF, LEDVANCE et Google devront être reliés après installation. Cette branche ne contient pas le configurateur JavaScript expérimental de la PR #2.


Prototype de l'interface **KIMIA Smart by PROMAINT**, conçu pour une VM Home Assistant de démonstration.

**Objectif :** un accueil agréable avec météo, raccourcis et brief du jour, puis des vues séparées pour les fonctions de la maison. Les couleurs sont inspirées de la nouvelle identité KIMIA Smart (bleu et turquoise).

## Contenu

- `dashboard.yaml` : configuration Lovelace et navigation
- `views/01-accueil.yaml` : météo, journal, accès rapides, état de la maison
- `views/02-lumieres.yaml` : éclairage par pièce
- `views/03-volets.yaml` : volets et commandes générales
- `views/04-climatisation.yaml` : consignes et confort
- `views/05-musique.yaml` : Google Cast, MP3 et réveils (maquette fonctionnelle limitée)
- `views/06-securite.yaml` : ouvertures et capteurs
- `views/07-parametres.yaml` : réseau, accès distant, informations
- `themes/KIMIA-Smart.yaml` : thème **KIMIA Signature** (bleu et turquoise)
- `themes/KIMIA-Clair.yaml`, `themes/KIMIA-Sombre.yaml` et `themes/KIMIA-Gris-Premium.yaml` : thèmes alternatifs lisibles
- `www/kimia-logo.svg` : petite signature de marque
- `views/08-prises.yaml` : page Prises
- `packages/kimia_demo.yaml` : entités et scripts **fictifs**, pour essais uniquement
- `packages/kimia_rss_optional.yaml` : option journal RSS automatique (sans HACS ni IA)


## Installer sur une VM Home Assistant de test

1. Créer `/config/kimia/`, y copier `dashboard.yaml` et le dossier `views/` (l'arborescence doit contenir `/config/kimia/views/01-accueil.yaml`).
2. Copier **les quatre fichiers du dossier** `themes/` dans `/config/themes/` (KIMIA-Smart, KIMIA-Clair, KIMIA-Sombre, KIMIA-Gris-Premium).
3. Copier `www/kimia-logo.svg` dans `/config/www/kimia-logo.svg`. Créer le dossier `/config/www/` si nécessaire.
4. Pour activer les entités de démonstration, copier `packages/kimia_demo.yaml` dans `/config/packages/kimia_demo.yaml`.
5. Ajouter ou fusionner dans `/config/configuration.yaml` les sections ci-dessous, **sans créer de deuxième clé** `frontend`, `homeassistant` ou `lovelace` si elles existent déjà.

```yaml
homeassistant:
  packages: !include_dir_named packages

frontend:
  themes: !include_dir_merge_named themes

lovelace:
  dashboards:
    kimia-smart:
      mode: yaml
      title: KIMIA Smart
      icon: mdi:home-variant
      show_in_sidebar: true
      filename: kimia/dashboard.yaml
```

6. **Facultatif** : pour activer les actualités, copier `packages/kimia_rss_optional.yaml` dans `/config/packages/kimia_rss_optional.yaml`, puis ajouter l'intégration **Feedreader** via *Paramètres > Appareils et services* avec le flux RSS d'un journal choisi. Ce module affiche les trois derniers titres reçus (sans résumé IA). À éviter sur un client si les sources ne sont pas définies.
7. Vérifier la configuration puis redémarrer Home Assistant. Pour la v0.5, choisir **Utiliser le thème par défaut** dans le profil utilisateur, puis choisir une des quatre ambiances dans **Configuration client**. Ouvrir **KIMIA Smart** dans la barre latérale.

Si tu utilises déjà des packages ou thèmes, conserver ta configuration et fusionner les entrées plutôt que de remplacer les sections.

## Ce qui fonctionne dans le prototype

- Boutons de scènes et commandes de démonstration via `packages/kimia_demo.yaml`.
- Interrupteurs de lumière et de volet *simulés*, consignes de climatisation *simulées*.
- Accueil v0.2 : salutation selon l'heure, météo avec message de secours, scénarios rapides, état de la maison et navigation en 6 boutons.
- Journal : trois titres RSS renseignés par les helpers `input_text.kimia_actu_1..3`, et un court extrait RSS (ou message éditable) via `input_text.kimia_brief`. Le module RSS optionnel récupère les titres et un extrait de description, sans générer de résumé IA : il faut choisir un flux Feedreader.
- Les titres RSS sont affichés tels quels, sans tri de pertinence, sans résumé et sans traduction.
- Météo : adapter `weather.forecast_home` à l'entité disponible dans la VM. Sans entité météo, un message de remplacement s'affiche et le dashboard reste utilisable.
- La page Prises montre une prise simulée. Les mesures SONOFF réelles demandent une intégration compatible.
- Musique : les lecteurs Cast, la file MP3 et le réveil réel restent à configurer et valider.

## À ne pas confondre avec une installation client

Cette version **n'est pas un package prêt à déployer chez un client**. Les helpers `input_boolean` et `input_number` sont des simulations. Ils seront remplacés par de véritables entités `light`, `cover`, `climate`, etc. Les liens réseau de la page Paramètres sont des exemples.

**Aucune connexion Cloudflare, intégration Matter ou synchronisation MP3 n'est configurée automatiquement.** Le journal RSS nécessite une source Feedreader choisie et l'installation du package facultatif.

## Sécurité et maintenance

Le dépôt GitHub est actuellement public. Ne jamais y placer de mots de passe, clés API, jetons Cloudflare, identifiants d'un client, adresses personnelles ou fichiers `secrets.yaml`.

Conception : cartes natives Home Assistant en priorité, aucune dépendance HACS obligatoire, fonctionnement local pour les fonctions domotiques, cloud uniquement pour les services concernés.

## Validation avant installation chez un client

- Sur VM HA : vérifier les quatre thèmes (contraste titres, icônes, champs, cartes) et la navigation.
- Comparer la page Accueil sur téléphone et sur tablette.
- Vérifier que le fichier `/local/kimia-logo.svg` se charge depuis l'installation HA.
- Tester les commandes de démonstration avant de substituer des appareils réels.
- Le dashboard **n'ajoute pas automatiquement les nouveaux appareils** : l'automatisation de l'affichage sera étudiée à part, en privilégiant les fonctions natives Home Assistant.
- **Ne pas fusionner la PR #2** sur le configurateur expérimental sans validation technique spécifique.
