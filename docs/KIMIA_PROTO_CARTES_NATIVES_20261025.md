# KIMIA Smart — prototype de simplicité : cartes Zone natives indépendantes
25 octobre 2026 · Branche d'essai, **ne rien fusionner et ne pas remplacer le dashboard KIMIA actif sans validation.**

## Objectif
Conserver les deux configurateurs JavaScript KIMIA (pièces + Zigbee) qui évitent de passer dans les menus Home Assistant, tout en rendant le dashboard utilisateur vraiment personnalisable carte par carte.

## Ce qui a réellement changé

- **Accueil KIMIA Test** : en-tête et quatre raccourcis scénarios natifs en cartes indépendantes, **plus aucune carte Grille qui regroupe les quatre scénarios**.
- **Maquette, Clock Weather, RSS News et Navbar** : inchangés et conservés. Aucun script des scénarios n'a été modifié.
- **Mes pièces** : nouvelle vue sur /kimia-test/pieces, initialement vide ; comporte une section native identifiable.
- **Administration de test** : nos deux gestionnaires existants restent inchangés ; un **troisième petit outil uniquement admin** ajoute les cartes Zone native manquantes par un clic. Il ne supprime jamais les cartes ni ne réorganise celles éditées.
- **Thèmes et interrupteurs d'onglets** : inchangés et toujours accessibles comme précédemment.

## Installation sans casser le dashboard existant

1. Conserver les dashboards actuels. Utiliser les deux dashboards **KIMIA Test** (URL : `kimia-test`) et **KIMIA Admin Test** (URL : `kimia-admin-test`), tous deux en mode Interface / Storage. Si besoin, les créer.
2. Installer (ou réimporter) la version **`dashboard-test-ui-import.yaml`** dans l'éditeur de configuration brute de **KIMIA Test** (sauvegarder préalablement son YAML actuel).
3. Copier `www/kimia-dashboard-sync-card.js` de cette branche dans `/config/www/kimia-dashboard-sync-card.js` de la VM **210 KIMIA**. Ne copier ni token ni secret dans `www`.
4. Dans **Paramètres > Tableaux de bord > ⋮ > Ressources**, enregistrer l'URL `/local/kimia-dashboard-sync-card.js?v=1` en **Module JavaScript**. Si le dossier `www` n'existait pas avant, un redémarrage de HA peut être nécessaire ; sinon actualiser le navigateur.
5. Réimporter `kimia-admin-test-ui-import.yaml` dans **KIMIA Admin Test** (sauvegarder avant).
6. En **administrateur KIMIA**, ouvrir **KIMIA Admin Test > Pièces**, puis « Ajouter les pièces manquantes ». Lire le détail de la confirmation avant de poursuivre.
7. Ouvrir **KIMIA Test > Accueil > Mes pièces** : une véritable **carte Zone native indépendante** est ajoutée pour chaque pièce créée dans KIMIA ; déplacer, redimensionner ou éditer une de ces cartes dans HA comme toute autre carte normale.
8. Ajouter un nouveau dispositif Zigbee via **KIMIA Admin Test > Appareils** et lui affecter une pièce. Son contrôle pourra apparaître dans la carte Zone selon le domaine et les fonctionnalités gérées par Home Assistant.
9. Recliquer « Ajouter les pièces manquantes » ne doit **créer aucun doublon**. Renommer une pièce garde son ID : les cartes Zone continuent de pointer vers la bonne pièce.

## Limites V1 expérimentale

- **La synchronisation est volontairement déclenchée par un clic de l'administrateur**, pas par une automatisation au démarrage. Une étape automatique lors de la création de pièce sera ajoutée seulement après validation en conditions réelles.
- C'est une **écriture complète du dashboard** via WebSocket `lovelace/config/save` : l'outil lit d'abord le dashboard, vérifie son identité `kimia-test`, refuse une configuration non Storage, compare la dernière lecture, effectue un ajout seulement, puis relit pour vérifier. **Faire quand même un export/backup avant le premier essai** : l'API n'a pas de verrou de concurrence et une édition simultanée est à éviter.
- Le gestionnaire n'ajoute aucune carte sur `kimia-smart` ni sur `kimia-admin-test` : seule la cible `kimia-test`, vue `pieces`, est programmée dans l'import d'essai.
- Les pièces supprimées dans le registre HA **ne sont pas supprimées du dashboard** automatiquement pour ne pas effacer une disposition personnalisée. Une carte orpheline se retire manuellement.
- Le format des **cartes Zone** dépend de la version de HA et du type d'équipement. Les commandes, notamment de l'éclairage, peuvent nécessiter une personnalisation des fonctions de la carte.
- La navbar continue de présenter les neuf raccourcis habituels. « Mes pièces » se trouve dans l'Accueil pour ne pas ajouter une dixième icône sur les téléphones.
- Ni l'affichage ni le moteur WebSocket n'ont été validés en direct dans la VM 210. Test à faire d'abord sur le dashboard de test.
- Les scripts de scénario et les helpers sont partagés par les deux versions du dashboard de test/prod : **toucher un scénario peut activer des appareils réels** lorsque des cibles sont configurées.

## Après validation, étape V2
- Déclencher la synchronisation de manière **non destructive** après création d'une pièce dans Room Manager ; continuer de ne jamais supprimer les cartes déplacées.
- Ajouter un lien clair depuis le client vers les pages de pièces sans exposer les menus techniques ; conserver le thème client et ses droits.
- Réduire les boutons statiques des autres rubriques et utiliser les vrais appareils via cartes Tuile, Volet, Thermostat, Média ; carte Maquette/RSS/Navbar restent des exceptions assumées.
- Réviser la disposition du dashboard sur tablette et téléphone avec de vraies pièces et de vrais équipements, puis décider si la version remplace le modèle actuel.

## Fichiers
- `dashboard-test-ui-import.yaml` (Accueil + Mes pièces, navbar préservée)
- `kimia-admin-test-ui-import.yaml` (gestionnaires préservés + synchronisation)
- `www/kimia-dashboard-sync-card.js` (fonction administrateur : cartes Zone native)
