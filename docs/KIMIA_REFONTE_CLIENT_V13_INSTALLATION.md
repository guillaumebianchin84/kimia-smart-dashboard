# KIMIA Smart — Refonte client V1.3 (26 octobre 2026)

> **Reprise après conversation PC/téléphone :** voir [`REPRISE_KIMIA_20261026.md`](../REPRISE_KIMIA_20261026.md), état exact des tests, environnement KIMIA VM210, prochaine étape et points de vigilance. **La V1.3 n'est pas encore déclarée installée sur la VM.**

## Principe
Le **YAML transmis par le responsable produit** constitue la référence visuelle. L'original, avec ses pièces et enceintes de test, est conservé ici :
`docs/KIMIA_REFONTE_CLIENT_SOURCE_20261026.yaml`.

Le fichier `dashboard-kimia-next-ui-import.yaml` constitue le **modèle initial pour une nouvelle maison**, avec le même design mais **sans les pièces et appareils de démonstration** : ces derniers seront créés depuis les registres Home Assistant de chaque installation.

Le moteur `www/kimia-smart-core-v1.js` V1.3 applique ces règles lors de `KimiaSmartCore.sync()` :

- **Accueil** : uniquement bandeau de marque, plan Maquette, météo et les quatre scénarios. Aucun appareil ni pièce ajouté automatiquement.
- **Bandeau KIMIA** sur chaque onglet : texte central avec **le titre exact de chaque onglet**, y compris « Accueil ».
- **Pièces et catégories** : une section par pièce (largeur complète de la vue), carte native Area de largeur 12/12 ; cartes Tile des appareils sous Area, deux par rangée (6/12).
- **Aucun titre en double** au-dessus d'une carte Area ; un titre historique standard est retiré lors de la mise à niveau.
- **Filtrage par catégories**, pièces vides omises des onglets d'équipements ; Pièces regroupe les pièces même vides.
- **Création, déplacement, désactivation, suppression** : synchronisation idempotente, seules les anciennes cartes ayant encore exactement la forme générée sont supprimées.
- **Personnalisations** : ne jamais écraser une carte Tile modifiée manuellement.
- **Mode kiosque** : conservé, avec le bouton utilisateur pour réafficher le bandeau HA ; navbar KIMIA inchangée.
- Écriture exclusivement sur `kimia-next` (mode stockage, compte administrateur).

## Installation sur une KIMIA Next existante, dont le YAML a déjà été modifié manuellement

1. **Sauvegarder le YAML du dashboard** (et idéalement faire une sauvegarde Home Assistant).
2. Remplacer **uniquement** `/config/www/kimia-smart-core-v1.js` par le fichier V1.3.
3. Dans les ressources Lovelace, **modifier** sa ressource existante vers `/local/kimia-smart-core-v1.js?v=104` (garder un seul enregistrement).
4. Recharger entièrement le navigateur ou l'application HA.
5. Dans KIMIA Admin Next → Démarrer, appuyer sur **Actualiser ma maison**.
6. Vérifier Accueil, Musique, Pièces, puis les autres catégories.

**Ne pas importer le modèle GitHub complet à la place de la configuration vivante**, cela ferait perdre les cartes personnalisées, les pièces et le contenu généré déjà présents. La mise à jour du moteur adapte les cartes existantes, sans réinitialiser la maison.

## Nouvelle installation

1. Créer `kimia-next` comme dashboard **stockage** dans HA.
2. Importer le `dashboard-kimia-next-ui-import.yaml` de cette branche.
3. Déclarer les ressources HACS nécessaires (maquette-card, clock-weather-card, rss-news-card, navbar-card, button-card, etc.) et le fichier moteur KIMIA.
4. Installer les packages et créer les paramètres KIMIA prévus par les guides précédents.
5. Depuis KIMIA Admin Next, configurer les pièces, Zigbee et les appareils, puis synchroniser.

## Conditions et limites

- Les cartes existantes **personnalisées** ne sont pas effacées ni déplacées automatiquement : KIMIA ne peut deviner l'intention d'un client, une vérification manuelle reste nécessaire.
- Le plan Maquette et `weather.forecast_lbv` contiennent des éléments spécifiques au site de **démonstration de Libreville** (notamment l'image `/api/image/serve/...`). Ils doivent être configurés pour chaque nouvelle maison. Il s'agit pour l'instant d'un **modèle visuel**, pas d'un plan ou d'une image auto-générée pour un nouveau client.
- La synchronisation a été vérifiée via GitHub Actions avec **données simulées**, pas avec un coordinateur Zigbee physique sur VM 210.
- Aucun changement n'est apporté au dashboard de production `kimia-smart` ni à la VM Home Assistant personnelle (100).

Lien modèle : `dashboard-kimia-next-ui-import.yaml`.
