# KIMIA Smart — Énergie, Eau, Secours et Caméras · Installation intégrée

**Cible exclusivement : KIMIA VM210 (prototype). Ne jamais modifier VM100.**
**Partir du dashboard actuellement utilisé, ne jamais réimporter un ancien YAML.**

## Ce que l'utilisateur obtient après « Actualiser ma maison »
- Une **sous-vue Énergie**, ouverte depuis le nouveau raccourci natif placé sur **Accueil**, sans ajouter de route à la navbar.
- **Électricité** : un seul bloc natif par compteur physique, W et kWh regroupés dans une seule carte `entities` s'ils appartiennent au même device_id ; historique global de la puissance sur 24 heures `history-graph` et raccourci vers le dashboard Énergie Home Assistant pour bilans journaliers et mensuels (à configurer dans HA).
- **Eau** : pression et demande de commande du surpresseur, si les entités réelles sont configurées par l'administrateur.
- **Secours** : état du réseau public, demande de démarrage du contrôleur de groupe, état « groupe en marche », si les entités réelles sont configurées.
- **Sécurité existante** : ajoute une `picture-entity` native par caméra physique HA (`camera.*`), conserve les capteurs de portes et alarmes **intacts**. Les caméras temporairement indisponibles restent visibles.
- **Configuration admin** : nouveau raccourci **Configurer Énergie, Eau et Secours** dans Démarrer, vers une **sous-vue** native avec cinq champs configurables.
- Les anciennes cartes, bandeaux, icônes, navbar, thèmes, maquette, profils, scénarios, et réglages ne sont pas remplacés. Aucun nouvel élément `custom:*` n'est créé par l'extension.

## Contenu du ZIP
1. `www/kimia-smart-core-v1.js` : cœur KIMIA existant + point d'appel facultatif minimal de l'extension sur le bouton de synchronisation.
2. `www/kimia-native-extension-v1.js` : générateur des cartes natives uniquement ; n'effectue **aucune** modification spontanément.
3. `packages/kimia_energie_eau_secours_v1.yaml` : cinq `input_text` natifs, sans script, sans automation, sans action.

## Installation (une fois, VM210)
1. Sauvegarder KIMIA / VM210 et exporter l'état actuel des dashboards (Storage).
2. Remplacer **seulement** `/config/www/kimia-smart-core-v1.js` et `/config/www/kimia-native-extension-v1.js` par les deux fichiers fournis. Ne toucher à aucun autre JS existant.
3. Copier **sans écraser** `kimia_energie_eau_secours_v1.yaml` dans `/config/packages/`. La VM KIMIA utilise déjà les packages pour sa navigation ; si ce n'est pas le cas sur une autre VM, configurer packages via la méthode HA habituelle et vérifier avant redémarrage.
4. Vérifier la configuration YAML de HA, puis **redémarrer une fois Home Assistant VM210** pour charger les cinq nouveaux helpers (uniquement en cas de première installation du package).
5. Dans **Paramètres → Tableaux de bord → Ressources**, modifier les ressources **déjà existantes**, sans créer de doublon :
   - `/local/kimia-smart-core-v1.js?v=200`
   - `/local/kimia-native-extension-v1.js?v=200` (celle chargée précédemment en `?v=100`)
   Choisir **Module JavaScript**. Ne pas modifier la ressource Routines V3.1 ni les autres ressources.
6. Recharger complètement la page. Dans **KIMIA Configuration → Démarrer**, cliquer **Actualiser ma maison** **une fois**.
7. Accueil KIMIA : nouveau raccourci natif « Suivi Énergie, Eau et Secours ». La barre/navbar actuelle reste identique. Dans Sécurité, les caméras détectées s'ajoutent sans toucher aux capteurs historiques.
8. **KIMIA Configuration → Démarrer → Configurer Énergie, Eau et Secours** : renseigner dans les cinq helpers ci-dessous les identifiants HA complets des capteurs/commandes réels, puis cliquer à nouveau **Actualiser ma maison**. Sans matériel connecté, laisser les champs vides : aucun appareil fictif n'est créé.

## Correspondance des cinq helpers (admin)
| Champ visible | Helper Home Assistant | Type réel requis |
|---|---|---|
| Capteur pression d'eau | `input_text.kimia_eau_pression_entite` | `sensor.xxx` |
| Commande surpresseur | `input_text.kimia_eau_surpresseur_entite` | `switch.xxx` : **contact de demande sur contrôleur protégé**, pas démarrage direct d'une pompe sans protection |
| Présence réseau électrique | `input_text.kimia_secours_reseau_entite` | `binary_sensor.xxx` (on = secteur présent, off = coupure, selon configuration réelle) |
| Demande démarrage du contrôleur | `input_text.kimia_secours_demande_groupe_entite` | `switch.xxx` : **commande du contrôleur**, jamais contacteur de puissance/ATS |
| Retour groupe en marche | `input_text.kimia_secours_groupe_marche_entite` | `binary_sensor.xxx` |

L'admin saisit les entités à partir de leur identifiant dans **Paramètres → Appareils et services → Entités**. Chaque champ natif reste utilisable sur mobile/tablette et garde sa valeur entre les synchronisations.

## Sécurité, limites V1 et validations
- **AUCUNE automatisation n'est créée ni activée.** La V1 affiche les retours et propose des commandes manuelles uniquement si l'administrateur les a renseignées.
- Les futurs automatismes de pression ou de coupure devront agir uniquement sur des entrées de commande dédiées, avec sécurités matérielles autonomes et validation par l'installateur : anti-marche à sec, inverseur ATS interverrouillé, temporisations, régulation autonome, absence de couplage réseau/groupe.
- Un `switch` HA exposé dans le dashboard reste une commande réelle : **ne pas renseigner de relais directement sur une pompe, un contacteur réseau/groupe ou un ATS**.
- Une caméra Wi-Fi doit d'abord être intégrée dans HA (ONVIF/RTSP ou intégration fabricant) ; aucun mot de passe/URL RTSP n'est saisi dans les cartes KIMIA. Avant un déploiement commercial, contrôler les permissions et la confidentialité : masquage visuel seul ne protège pas les flux.
- Une seule carte par équipement est préservée pour les compteurs W+kWh et pour les dispositifs commandés/regroupés sous le même device_id. Le graphe historique commun est une carte de synthèse et ne duplique pas les cartes individuelles.
- Le package n'ajoute aucun automate ; les boutons **Routines V3.1** existants ne sont pas modifiés. Plus tard, les nouveaux capteurs deviennent sélectionnables selon les fonctions supportées par Routines.
- Au deuxième clic sur « Actualiser ma maison », aucune duplication et aucune nouvelle sauvegarde si rien n'a changé, vérifié sur une simulation de l'import client+admin.
- Le coût FCFA ne se calcule pas sans tarif et compteur d'index fiables ; la configuration des coûts est à traiter ensuite via le dashboard Énergie HA.

## Rollback
Restaurer les deux fichiers JS précédents et leur paramètre de cache `?v=`, supprimer si nécessaire la ressource de l'extension, puis restaurer la sauvegarde des dashboards si l'essai avait déjà créé les nouvelles vues. Ne pas réimporter un YAML ancien en guise de restauration automatique. Le package d'entrée de configuration peut rester en place : il ne pilote rien.
