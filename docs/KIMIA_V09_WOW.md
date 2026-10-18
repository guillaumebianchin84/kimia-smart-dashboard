# KIMIA Smart V0.9 — Accueil « Ma maison » (cartes indépendantes)

**Statut : V0.9 corrigée sur GitHub après retour « erreur de configuration » ; rendu non encore testé dans la VM Home Assistant KIMIA.**
Cette branche découle de `feat/tablette-maquette-v08`. Ne pas fusionner avant essai tablette.

## Ce qui change

- La **signature KIMIA Smart by PROMAINT** est à gauche dans un bandeau discret turquoise.
- Le bandeau KIMIA porte le titre **Ma maison**, et la carte Maquette n'affiche pas de second titre. La forme des cinq pièces, portes, fenêtres, six lampes décoratives,
  le calque, ses coordonnées 1499×1049 et son URL `/api/image/serve/ff117c7cfa8067ef6fc7005b20d1d041/original` **n'ont pas été modifiés**.
- Le calque garde exactement la même position et les mêmes dimensions ; la transparence du sol des pièces passe de 0,6 à **0,18** pour voir plus clairement les meubles et couleurs du PNG.
- La page utilise désormais **les sections natives Home Assistant** (`type: sections`, `max_columns: 3`) : une première section pleine largeur pour la marque, une section sur deux colonnes pour la carte Maquette, une dernière pour les cartes météo / scènes / actualités. **Plus de `custom:layout-card`**.
- **Météo :** `custom:clock-weather-card`, grandes icônes colorées animées, 4 jours de prévision,
  alimentée directement par **`weather.forecast_lbv`**. Ce composant n'attend plus
  `sensor.kimia_temperature_libreville`.
- **Scènes :** 4 vrais boutons 2×2 via `script.kimia_au_lit`, `script.kimia_depart`,
  `script.kimia_retour`, `script.kimia_reveil` ; toujours dépendants des helpers et
  scripts façade définis dans `packages/kimia_tablette_v08.yaml`.
- **Actualités :** petite carte `custom:rss-news-card` (3 articles, images), utilisant
  directement `sensor.rss_gabon_actu` et `sensor.rss_gabonreview`. Les autres flux
  Afrique/Monde demeurent dans l'onglet Actualités.
- Le choix **Gris Premium / Clair / Sombre / Signature** demeure ; couleurs turquoise, ciel, or en accents.
- Les onglets détaillés Lumières, Volets, Climatisation, Musique, Sécurité, Prises, Actualités et Paramètres restent en place.

## Prérequis HACS — météo et cartes

Maquette, Button Card, Card Mod, RSS News Card et **Clock Weather Card** sont requis.
- **Clock Weather Card** : https://github.com/pkissling/clock-weather-card
- **Layout Card n'est plus utilisée**. L'utilisateur l'a installée, mais le nouveau YAML repose uniquement sur les **sections natives Home Assistant** et n'en a pas besoin.

Actualiser le navigateur pour charger les ressources frontend après installation HACS.
Les options météo suivent la syntaxe historique de Clock Weather Card V2 ; vérifier la version HACS installée si une erreur persiste (l'API de la V3 peut différer).

## Ce qui ne marche pas sans le package / capteurs

La météo **ne nécessite aucun capteur `sensor.kimia_*`**, mais exige
`weather.forecast_lbv` avec des prévisions quotidiennes fonctionnelles.

Les scripts façade attendent `/config/packages/kimia_tablette_v08.yaml`,
Home Assistant configuré pour charger les packages, suivi d'un redémarrage Core.
Sans script cible configuré, ils publient seulement une notification.

La carte RSS attend les capteurs **`sensor.rss_gabon_actu`** et
**`sensor.rss_gabonreview`** dotés de l'attribut `articles` (liste).
Ils nécessitent `packages/kimia_rss_sources.yaml` et
`kimia/rss_reader.py` sous `/config/`.
Ils n'ont pas besoin des capteurs de résumé `sensor.kimia_flash_*`.

Pour dépanner : Outils de développement → États : contrôler l'état de
`weather.forecast_lbv`, `sensor.rss_gabon_actu`, `sensor.rss_gabonreview`,
`script.kimia_au_lit`. Inspecter l'attribut `articles` des RSS.

## Météo-France et Gabon

Selon https://www.home-assistant.io/integrations/meteo_france/ ,
**l'intégration annonce des prévisions météo pour n'importe quel lieu au monde**,
avec un focus sur la France et une prévision sur 5 jours.
On peut tenter une deuxième instance pour Libreville dans Home Assistant.
Ne pas remplacer `weather.forecast_lbv` **tant que l'entité Météo-France n'est
pas créée et vérifiée**. Autre solution mondiale : Open-Meteo.
Le fichier V0.9 conserve l'entité Met.no déjà fonctionnelle.

## Installation sécurisée — une seule étape à la fois

1. **Sauvegarder le dashboard HA courant** : copier l'intégralité du YAML brut
   dans un fichier local avant remplacement ; faire aussi une sauvegarde Home Assistant.
2. Vérifier dans HACS que **Clock Weather Card** est installée et que sa ressource est chargée (Layout Card n'est pas nécessaire).
3. Vérifier les entités nécessaires (voir plus haut) ; installer le package si absent.
4. Ouvrir `dashboard-ui-import.yaml` de la branche `feat/accueil-v09-wow` et copier son **Raw**.
5. Coller dans KIMIA Smart → Modifier dashboard → Éditeur de configuration brute et sauvegarder.
6. Capturer l'accueil sur **la vraie tablette 11 pouces paysage** :
   plan cadré, boutons utilisables, 4 prévisions présentes, RSS avec images,
   aucun défilement vertical de **page**.
7. Tester une taille téléphone et les 4 thèmes. Adapter taille de cartes
   si l'écran est trop petit : ne pas rogner la zone du plan.
8. En cas de problème, restaurer le YAML copié à l'étape 1.

### Limites et précautions

- Cette mise en page en **sections natives** est un **prototype** : dimension exacte et comportement sans défilement
  vertical restent à vérifier sur la tablette (zoom, barre du navigateur/HA,
  navigation Android, densité des prévisions).
- L'URL du calque est **hébergée dans Home Assistant** ; elle n'est pas un fichier
  PNG versionné sur GitHub. Une autre VM ne la retrouvera pas.
- Toute modification dans l'éditeur Maquette faite après la copie brute sera
  **écrasée si l'on importe ultérieurement une autre version complète**.
  Toujours exporter le YAML avant import.
- Une carte météo Home Assistant ne peut pas être directement insérée dans
  le panneau interne de Maquette : la météo, les boutons et les actualités sont désormais
  des **cartes Lovelace séparées dans une section HA native**.
- Les contenus RSS et météo requièrent une connexion Internet ; les commandes
  HA locales peuvent rester fonctionnelles sans Internet.


## Navbar KIMIA — bandeau gauche natif Navbar Card

**Révision après test utilisateur.** La précédente configuration était `desktop.mode: floating`
avec des routes définies dans un modèle partagé. Elle a été remplacée **sur les neuf vues** :

```yaml
- type: custom:navbar-card
  desktop:
    mode: docked
    position: left
    min_width: 768
    show_labels: false
  mobile:
    mode: docked
    show_labels: false
    safe_area: true
  layout:
    auto_padding:
      enabled: true
      desktop_px: 80
      mobile_px: 70
  routes:
    - url: /kimia-smart/accueil
      icon: mdi:home-variant
      label: Accueil
    # … huit autres routes (inline, dans chaque vue)
```

Cette fois, chaque carte Navbar est **autonome** : `routes`, `desktop`, `mobile`
figurent directement dans `custom:navbar-card`. Le bloc racine
`navbar-templates` a été retiré. Aucune surcharge CSS de positionnement.

- **Tablette/PC** : `docked + left` = barre verticale collée au bord gauche,
  sans texte, tout en conservant un espace de 80 px autour du contenu.
- **Téléphone** : barre fixe en bas avec 4 raccourcis et `Plus`, pour les
  5 rubriques secondaires.
- La carte Navbar est ajoutée dans les neuf vues en `type: sections`.
- **En mode édition Home Assistant, Navbar Card se dessine volontairement comme
  une carte normale dans la grille**, et PAS en position fixe (comportement confirmé
  dans le code de Navbar Card `.navbar.edit-mode { position: relative !important; }`).
  **Quitter le mode édition pour observer le bandeau gauche**.
- Des espaces réservés par les sections peuvent rester visibles : test sur la
  tablette indispensable avant validation du mode sans défilement.

**Attention** : pour masquer l'en-tête et le volet natifs Home Assistant sur
le compte utilisateur non-administrateur, le dashboard conserve :
```yaml
kiosk_mode:
  non_admin_settings:
    hide_sidebar: true
    hide_header: true
```
Kiosk Mode doit être installé depuis HACS, et ce n'est **qu'un masquage visuel**,
pas une restriction des droits HA. Les comptes administrateurs gardent les menus
natifs pendant la maintenance.

Dépannage Kiosk Mode : ajouter `?disable_km` à l'URL pour retrouver
temporairement les menus, puis quitter le mode édition pour évaluer la Navbar.

Documentation officielle Navbar Card :
https://joseluis9595.github.io/lovelace-navbar-card/docs/configuration/desktop/

