# KIMIA Smart V0.9 — Accueil « Ma maison » (prototype visuel)

**Statut : code enregistré sur GitHub ; non testé dans la VM Home Assistant KIMIA.**
Cette branche découle de `feat/tablette-maquette-v08`. Ne pas fusionner avant essai tablette.

## Ce qui change

- La **signature KIMIA Smart by PROMAINT** est à gauche dans un bandeau discret turquoise.
- Maquette affiche uniquement le titre **Ma maison**. La forme des cinq pièces, portes, fenêtres, six lampes décoratives,
  le calque, ses coordonnées 1499×1049 et son URL `/api/image/serve/ff117c7cfa8067ef6fc7005b20d1d041/original` **n'ont pas été modifiés**.
- La page est un **panel** avec `custom:layout-card` en grille responsive : plan principal large, colonne droite compacte.
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

## Prérequis HACS — DEUX nouvelles cartes

En plus de Maquette, Button Card, Card Mod et RSS News Card (déjà utilisés en V0.8) :

1. **Layout Card** — https://github.com/thomasloven/lovelace-layout-card
2. **Clock Weather Card** — https://github.com/pkissling/clock-weather-card

Installer via HACS, vérifier les ressources frontend et actualiser Home Assistant dans le navigateur.
L'import d'un dashboard qui référence une carte non installée affichera **« Élément personnalisé introuvable »**.

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
2. Dans HACS, installer **Layout Card** et **Clock Weather Card**.
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

- Ce layout est un **prototype** : dimension exacte et comportement sans défilement
  vertical restent à vérifier sur la tablette (zoom, barre du navigateur/HA,
  navigation Android, densité des prévisions).
- L'URL du calque est **hébergée dans Home Assistant** ; elle n'est pas un fichier
  PNG versionné sur GitHub. Une autre VM ne la retrouvera pas.
- Toute modification dans l'éditeur Maquette faite après la copie brute sera
  **écrasée si l'on importe ultérieurement une autre version complète**.
  Toujours exporter le YAML avant import.
- Une carte météo Home Assistant ne peut pas être directement insérée dans
  le panneau interne de Maquette : la colonne droite est ici une pile Lovelace
  indépendante construite avec Layout Card.
- Les contenus RSS et météo requièrent une connexion Internet ; les commandes
  HA locales peuvent rester fonctionnelles sans Internet.
