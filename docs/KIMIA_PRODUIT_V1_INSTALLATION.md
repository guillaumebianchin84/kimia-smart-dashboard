# KIMIA Smart by PROMAINT — Produit V1 (prototype isolé)

**Statut : CANDIDAT DE TEST — NE PAS LIVRER AU CLIENT AVANT ESSAI RÉEL.**
Branche `feat/kimia-produit-v1-20261025`. Ne modifie pas la branche active, les anciennes VM ni les dashboards `kimia-smart`, `kimia-test` et `kimia-admin-test`.

## Une maison, pas un Home Assistant à programmer

Le client n'utilise ni éditeur YAML ni identifiants d'entité. L'administrateur propriétaire ouvre **KIMIA Configuration** :
1. **Démarrer** : assistant visuel, progression et actualisation des cartes.
2. **Pièces** : création, renommage, affectation des appareils directement dans KIMIA.
3. **Appareils** : appairage via ZHA sur demande, nommage, affectation à une pièce.
4. **Apparence** : choix des onglets à afficher ; thèmes toujours proposés dans le dashboard client.
5. **Scénarios** : liste déroulante de scripts réels au lieu de champs `script.xxx`.

Après une création de pièce ou une affectation par les deux cartes d'administration **V1**, le moteur **KIMIA Smart Core** tente automatiquement d'ajouter dans `kimia-next` des **cartes natives indépendantes** :
- Accueil : une carte Zone (Area) par pièce, sous la maquette, météo et actualités conservées.
- Pièces : une section par pièce, avec carte Zone et cartes Tuile (Tile) des appareils reconnus.
- Lumières, Volets, Climatisation, Prises, Musique, Sécurité : chaque appareil réel, regroupé par pièce, sans boutons de démonstration.

Les cartes sont de vrais objets du dashboard Home Assistant en mode Interface (Storage), éditables et déplaçables indépendamment. Le moteur **n'efface pas** les cartes déjà créées ou déplacées, et **ne crée pas de doublons** sur une seconde synchronisation. Les rubriques existantes continuent à utiliser la Navbar ; la page Pièces est accessible sur l'Accueil, sans dixième icône sur téléphone.

## Préparer KIMIA VM 210 (installateur uniquement)

**Avant toute modification : effectuer une sauvegarde Home Assistant et exporter les YAML existants.**

### Fichiers nécessaires
Depuis le répertoire `www/` de cette branche, copier **ces 5 fichiers** dans le `/config/www/` de la VM 210 :

| Fichier | Usage |
| --- | --- |
| `kimia-smart-core-v1.js` | Moteur natif / synchronisation |
| `kimia-setup-v1-card.js` | Assistant de première installation |
| `kimia-room-manager-v1-card.js` | Création/affectation des pièces |
| `kimia-zigbee-manager-v1-card.js` | Ajout et affectation des appareils Zigbee |
| `kimia-scenarios-v1-card.js` | Choix des routines en langage courant |

Ces fichiers V1 sont **nouveaux**. Ne pas remplacer les fichiers `kimia-room-manager-card.js` et `kimia-zigbee-manager-card.js` utilisés par les anciens dashboards.

Dans **Home Assistant → Paramètres → Tableaux de bord → Ressources**, ajouter ces **5 ressources** en **Module JavaScript** :
```
/local/kimia-smart-core-v1.js?v=100
/local/kimia-setup-v1-card.js?v=100
/local/kimia-room-manager-v1-card.js?v=100
/local/kimia-zigbee-manager-v1-card.js?v=100
/local/kimia-scenarios-v1-card.js?v=100
```
Si `www` vient d'être créé, un redémarrage de HA peut être nécessaire. Rafraîchir ensuite le navigateur. Augmenter `?v=` quand un fichier JS change pour forcer son rechargement.

### Nouveaux dashboards (mode Interface / Storage OBLIGATOIRE)

| Nom affiché | Chemin URL obligatoire | Fichier d'import | Sécurité |
| --- | --- | --- | --- |
| **KIMIA Nouvelle génération** | `kimia-next` | `dashboard-kimia-next-ui-import.yaml` | Habitants |
| **KIMIA Configuration** | `kimia-admin-next` | `kimia-admin-next-ui-import.yaml` | **Administrateurs uniquement** |

Créer chaque dashboard via Paramètres → Tableaux de bord → Ajouter un tableau de bord à partir de zéro, **en mode Interface**. Pour le second, cocher **Administrateur uniquement**. Ouvrir son édition → Éditeur de configuration brute → coller **l'intégralité du YAML** correspondant, puis enregistrer.

**Ne jamais importer ces fichiers dans le dashboard `kimia-smart` en production.** Les chemins automatiques sont verrouillés sur `kimia-next`. Si tu choisis un autre chemin URL, le moteur refusera d'écrire.

### Prérequis déjà prévus sur la VM prototype

- Navbar Card, Maquette Card, Clock Weather Card, RSS News Card (HACS / ressources existantes).
- Coordonnateur Zigbee/ZHA installé pour l'appairage. Aucun équipement n'est créé fictivement.
- Pour le choix des scénarios : package `packages/kimia_tablette_v08.yaml` (helpers et scripts façade) déjà présent **une seule fois**.
- Pour les thèmes : `packages/kimia_client_theme.yaml`, 8 thèmes YAML déjà installés.
- Pour masquer la navbar : `packages/kimia_admin_navigation.yaml`.
- Vérifier une seule inclusion `homeassistant.packages: !include_dir_named packages` dans `configuration.yaml`.

### Parcours d'essai recommandé

1. Connecté en admin, ouvrir `/kimia-admin-next/demarrer` et vérifier que la page affiche le nombre de pièces, appareils et équipements pilotables.
2. Ouvrir **Pièces**, créer « Salon Essai ». Le moteur doit automatiquement ajouter une carte **Zone** sur l'Accueil et la page Pièces. Si besoin, utiliser le bouton **Actualiser ma maison** depuis Démarrer.
3. Retourner sur **Accueil** : une carte Zone apparaît. Dans l'éditeur visuel, la déplacer individuellement.
4. Depuis **Appareils**, utiliser ZHA pour un appareil compatible, puis choisir Salon Essai. Après sauvegarde, une carte **Tuile** doit apparaître dans Pièces et dans sa rubrique (Lumières, Prises, etc.).
5. Depuis **Apparence**, masquer puis afficher la rubrique Musique ; vérifier Navbar sur PC et téléphone.
6. Depuis **Scénarios**, choisir une vraie routine existante dans une liste. Les scripts KIMIA refusent une cible non configurée et les références à eux-mêmes.
7. Depuis la page Réglages de KIMIA Nouvelle génération, changer de thème avec un **compte habitant** non administrateur.
8. Recliquer **Actualiser ma maison** : aucune carte dupliquée et aucun changement aux cartes précédemment déplacées.
9. Vérifier que `kimia-smart` et `kimia-test` sont toujours inchangés.

### Points de vigilance

- **Aucune écriture sur un dashboard YAML ou sur la production** : moteur verrouillé à `kimia-next`, dashboard Storage uniquement, admin uniquement.
- Le moteur compare le dashboard juste avant sauvegarde, mais **n'offre pas de verrou transactionnel HA** : éviter l'éditeur du même dashboard dans un autre onglet pendant une synchronisation.
- Les ressources et cartes sont chargées par Home Assistant. La **VM 210 réelle n'a pas encore validé** cette version.
- Le moteur est **additif** : il ne supprime pas automatiquement les cartes des appareils retirés ou pièces supprimées. Cette gestion devra être sécurisée ultérieurement.
- Une pièce créée dans KIMIA puis un appareil affecté dans KIMIA déclenchent la synchronisation lorsque le moteur JS est chargé. Les modifications réalisées depuis des interfaces externes peuvent nécessiter **Actualiser ma maison**.
- Tous les types d'appareils ne sont pas intégrés : V1 couvre éclairages, volets, thermostats, ventilateurs, prises, lecteurs audio et un sous-ensemble des alertes/sécurité. Les équipements non classés dans une pièce ne sont pas affichés dans les rubriques automatiques.
- La maquette actuelle reste le plan **de démonstration** à personnaliser par l'installateur. Ce n'est pas un plan automatiquement redessiné à partir des pièces.
- Le client ne voit pas de code KIMIA pour les tâches courantes. L'interface technique de HA reste disponible à l'administrateur de l'appareil ; cette V1 n'est pas une redistribution en marque blanche du backend Home Assistant.
- L'activation d'un scénario commande de vrais appareils si une routine réelle y est associée. Tester prudemment.

## Validation automatisée

Le workflow `.github/workflows/kimia-v1-checks.yml` vérifie :
- Syntaxe des 5 scripts JavaScript (`node --check`).
- Tests du moteur avec registres simulés (`node tests/kimia_v1.test.cjs`) : ajout, absence de doublons, isolation du dashboard, sauvegarde de cartes personnalisées, restrictions administrateur.
- YAML des deux dashboards (`python tests/validate_kimia_yaml.py` via PyYAML).

Ces tests **ne remplacent pas** les essais sur une VM Home Assistant complète, son interface et un vrai réseau Zigbee.
