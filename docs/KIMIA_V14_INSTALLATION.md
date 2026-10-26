# KIMIA Smart V1.4 — développement et installation prudente

## État
Branche de développement créée à partir de `feat/kimia-refonte-client-20261026`. **Ne pas importer les modèles YAML complets sur la VM 210 existante.** Le dashboard historique `kimia-smart` et la VM 100 doivent rester intacts.

## Évolutions (première passe)
- Pages client `/kimia-next/carte` et `/kimia-next/listes`, générées par `KimiaSmartCore.sync()`.
- Cartes natives Home Assistant `map` et `todo-list`, sans surveillance globale `show_all` ; seulement `zone.home` initialement.
- Barre KIMIA cohérente sur les pages (nouvelles entrées ajoutées sans remplacer les routes historiques). Les interrupteurs `input_boolean.kimia_onglet_carte` et `input_boolean.kimia_onglet_listes` commandent leur visibilité.
- `custom:kimia-services-v14-card` : choix des positions explicitement autorisées et de la liste To-do, sauvegardé dans **KIMIA Next uniquement**. Les autres options des cartes natives sont conservées.
- `custom:kimia-script-builder-v14-card` : créateur visuel de scripts (lumières, prises, volets, lecteurs multimédia, température de clim et attentes). Création REST officielle HA via `hass.callApi`, authentification de l'administrateur. Aucun script existant n'est modifié ni supprimé ; les noms sont préfixés `ks_` pour ne pas entrer en conflit avec les scripts internes `kimia_`. Les scripts deviennent sélectionnables dans **Mes scénarios** après chargement dans HA.

## Correctif Carte (26 octobre 2026)
- La carte native générée dans la vue Sections doit avoir `grid_options: {columns: 12, rows: 6}`, avec `auto_fit: true` et `default_zoom: 12`. Une hauteur `rows: auto` pouvait faire apparaître une simple ligne.
- Le modèle d'installation V1.4 contient ces paramètres.
- La synchronisation V1.4 corrige **uniquement** les cartes `map` qui correspondent à l'ancien modèle KIMIA exact (zone.home seule, hauteur auto, aucun réglage manuel ajouté).
- Une carte géographique déjà modifiée par l'installateur, notamment sa hauteur ou ses entités, est préservée. Un deuxième passage ne doit effectuer aucune modification.
- Pour la VM 210 : une correction manuelle de la carte existante est suffisante, sans réimporter le dashboard ; un nouveau moteur JS n'est nécessaire que pour profiter de la migration automatique future. Un commit GitHub ne déploie rien sur Home Assistant.

## Limites de cette première passe
- Pas encore d'éditeur/suppression visuel des scripts existants. Leur édition reste accessible depuis Home Assistant.
- Pas de déclencheurs/conditions : il s'agit de scripts exécutés depuis les boutons, non d'automatisations.
- La carte et le choix de liste doivent être activés/configurés par l'administrateur. Une liste To-do nécessite une intégration `todo` (Shopping list, Todoist, etc.). Si absente, la vue affiche un message d'attente.
- Le maintien des personnalisations a été conçu dans le code mais doit être **validé réellement** sur VM 210 après tests simulés.
- Les positions des personnes ne sont **jamais** affichées par défaut. L'installateur doit sélectionner chaque élément explicitement.
- Aucun déploiement automatique n'est réalisé par GitHub.

## Déploiement sur KIMIA existante (après validation GitHub Actions)
1. Faire une **sauvegarde HA de la VM 210** et exporter le YAML des dashboards `kimia-next` et `kimia-admin-next`.
2. Copier **et charger** `packages/kimia_admin_navigation.yaml` dans la configuration HA existante en mettant à jour sa version, **sans supprimer les états restaurés**. Vérifier la syntaxe puis redémarrer HA si nécessaire pour créer les 2 nouveaux `input_boolean`. Sur une installation existante, ils peuvent être initialement désactivés car le marqueur d'initialisation de la navigation est déjà actif.
3. Copier dans `/config/www/` :
   - `www/kimia-smart-core-v1.js` (remplace uniquement l'ancien moteur)
   - `www/kimia-services-v14-card.js` (nouveau)
   - `www/kimia-script-builder-v14-card.js` (nouveau)
4. Dans **Paramètres → Tableaux de bord → Ressources**, modifier l'unique ressource moteur en `/local/kimia-smart-core-v1.js?v=105` type **Module JavaScript**. Ajouter une seule ressource pour chacun des nouveaux fichiers :
   - `/local/kimia-services-v14-card.js?v=140`
   - `/local/kimia-script-builder-v14-card.js?v=140`
5. **Ne pas remplacer les dashboards avec `*-ui-import.yaml`.** Dans KIMIA Configuration → Apparence, ajouter manuellement deux cartes Tile pour `input_boolean.kimia_onglet_carte` et `input_boolean.kimia_onglet_listes`, ainsi qu'une carte `custom:kimia-services-v14-card`. Dans la vue Scénarios, ajouter une carte `custom:kimia-script-builder-v14-card` sans retirer `custom:kimia-scenarios-v1-card`. Les modèles GitHub servent de référence.
6. Fermer et rouvrir complètement le navigateur/l'application HA. Dans **KIMIA Configuration → Démarrer**, cliquer **Actualiser ma maison** : la synchronisation crée les deux vues et met à jour la navbar uniquement dans `kimia-next`.
7. Dans Apparence, activer Carte et Listes, configurer les éléments de la carte et la liste du foyer. Vérifier PC/téléphone/tablette, compte admin/client, droits d'accès, Accueil, Pièces et Musique. Tester le créateur de scénario d'abord avec une lampe de démo sans conséquence.
8. Une deuxième synchronisation doit afficher **Rien à modifier** et ne pas créer de doublon.

## Retour arrière
- Restaurer le moteur V1.3 dans `/config/www/` puis repasser la ressource en `?v=104` et recharger l'application.
- Le retour du fichier JS ne supprime **pas** les deux vues ajoutées en V1.4 : restaurer le YAML `kimia-next` exporté à l'étape 1 si une restauration complète est voulue.
- Les scripts créés via l'éditeur sont de véritables scripts Home Assistant et ne disparaissent pas par un retour à la V1.3.
- Ne pas toucher au dashboard historique `kimia-smart`, à la VM 100 ou aux branches précédentes.

## Vérifications à mener
- Vérifier le passage `?v=104` → `?v=105` et l'absence d'erreur JavaScript.
- Vérifier le comportement de `navbar-card` sur la version installée (prise en compte de `hidden`).
- Vérifier `hass.callApi` et l'API de création de script contre **la version de HA effectivement installée**.
- Tester la création d'un script, l'association via « Mes scénarios » et son exécution sur un appareil de démonstration seulement.
- Vérifier la sauvegarde concurrente, la conservation des cartes modifiées et les permissions de tous les comptes.

**La V1.4 reste une version de développement tant que ces essais sur VM 210 ne sont pas terminés.**
