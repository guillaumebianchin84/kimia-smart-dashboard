# KIMIA Smart — Dashboard Home Assistant

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
- `themes/KIMIA-Smart.yaml` : couleurs de marque
- `packages/kimia_demo.yaml` : entités et scripts **fictifs**, pour essais uniquement

## Installer sur une VM Home Assistant de test

1. Créer `/config/kimia/`, y copier `dashboard.yaml` et le dossier `views/` (l'arborescence doit contenir `/config/kimia/views/01-accueil.yaml`).
2. Copier `themes/KIMIA-Smart.yaml` dans `/config/themes/KIMIA-Smart.yaml`.
3. Pour activer les entités de démonstration, copier `packages/kimia_demo.yaml` dans `/config/packages/kimia_demo.yaml`.
4. Ajouter ou fusionner dans `/config/configuration.yaml` les sections ci-dessous, **sans créer de deuxième clé** `frontend`, `homeassistant` ou `lovelace` si elles existent déjà.

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

5. Vérifier la configuration puis redémarrer Home Assistant. Choisir le thème **KIMIA Smart** dans le profil utilisateur. Ouvrir **KIMIA Smart** dans la barre latérale.

Si tu utilises déjà des packages ou thèmes, conserver ta configuration et fusionner les entrées plutôt que de remplacer les sections.

## Ce qui fonctionne dans le prototype

- Boutons de scènes et commandes de démonstration via `packages/kimia_demo.yaml`.
- Interrupteurs de lumière et de volet *simulés*, consignes de climatisation *simulées*.
- Journal court éditable via `input_text.kimia_brief`. Les vraies actualités/RSS seront reliées ultérieurement.
- Météo : adapter `weather.forecast_home` à l'entité disponible dans la VM ; sinon sa carte sera indisponible.
- Musique : les lecteurs Cast, la file MP3 et le réveil réel restent à configurer et valider.

## À ne pas confondre avec une installation client

Cette version **n'est pas un package prêt à déployer chez un client**. Les helpers `input_boolean` et `input_number` sont des simulations. Ils seront remplacés par de véritables entités `light`, `cover`, `climate`, etc. Les liens réseau de la page Paramètres sont des exemples.

**Aucune connexion Cloudflare, intégration Matter, synchronisation MP3 ou flux RSS n'est configurée automatiquement par ces fichiers.**

## Sécurité et maintenance

Le dépôt GitHub est actuellement public. Ne jamais y placer de mots de passe, clés API, jetons Cloudflare, identifiants d'un client, adresses personnelles ou fichiers `secrets.yaml`.

Conception : cartes natives Home Assistant en priorité, aucune dépendance HACS obligatoire, fonctionnement local pour les fonctions domotiques, cloud uniquement pour les services concernés.
