# KIMIA Smart — Dashboard Home Assistant

## Direction visuelle v0.4 — sobre et premium

La branche `feat/themes-premium-responsive` ajoute **trois thèmes** (KIMIA Clair, KIMIA Sombre, KIMIA Signature), un petit bandeau KIMIA Smart by PROMAINT et une navigation claire entre les pages Accueil, Lumières, Volets, Climatisation, Musique, Sécurité, Prises et Paramètres.

**Responsive natif :** toutes les vues utilisent `type: sections` ; Home Assistant réorganise les sections sur téléphone et tablette. Les thèmes sont choisis **par utilisateur** via son profil Home Assistant, pas via un bouton fictif du dashboard. Aucun thème n'est forcé sur les vues. **Aucun HACS ni JavaScript personnalisé requis.**

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
- `themes/KIMIA-Clair.yaml` et `themes/KIMIA-Sombre.yaml` : thèmes alternatifs lisibles
- `www/kimia-logo.svg` : petite signature de marque
- `views/08-prises.yaml` : page Prises
- `packages/kimia_demo.yaml` : entités et scripts **fictifs**, pour essais uniquement
- `packages/kimia_rss_optional.yaml` : option journal RSS automatique (sans HACS ni IA)


## Installer sur une VM Home Assistant de test

1. Créer `/config/kimia/`, y copier `dashboard.yaml` et le dossier `views/` (l'arborescence doit contenir `/config/kimia/views/01-accueil.yaml`).
2. Copier **les trois fichiers du dossier** `themes/` dans `/config/themes/` (KIMIA-Smart, KIMIA-Clair, KIMIA-Sombre).
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
7. Vérifier la configuration puis redémarrer Home Assistant. Choisir **KIMIA Clair**, **KIMIA Sombre** ou **KIMIA Signature** dans le profil utilisateur. Ouvrir **KIMIA Smart** dans la barre latérale.

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

- Sur VM HA : vérifier les trois thèmes (contraste titres, icônes, champs, cartes) et la navigation.
- Comparer la page Accueil sur téléphone et sur tablette.
- Vérifier que le fichier `/local/kimia-logo.svg` se charge depuis l'installation HA.
- Tester les commandes de démonstration avant de substituer des appareils réels.
- Le dashboard **n'ajoute pas automatiquement les nouveaux appareils** : l'automatisation de l'affichage sera étudiée à part, en privilégiant les fonctions natives Home Assistant.
- **Ne pas fusionner la PR #2** sur le configurateur expérimental sans validation technique spécifique.
