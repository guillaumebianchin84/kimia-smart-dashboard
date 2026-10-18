> **État au 18 octobre — correctif de navigation :** la Navbar dynamique avec interrupteurs rendait les raccourcis inutilisables sur la VM. Pour rétablir l'accès aux vues, `dashboard-ui-import.yaml`, `dashboard.yaml` et `views/*.yaml` ont été restaurés à la version de Navbar qui fonctionnait avant cette fonction. **Les huit interrupteurs du dashboard KIMIA Administration existent, mais ils ne modifient plus la navigation pour l'instant.** Ne pas utiliser les étapes de validation ci-dessous comme preuve de fonctionnement ; une implémentation séparée, testée progressivement, reste à réaliser. Les vues et l'Accueil sont préservés.

# KIMIA Administration — afficher et masquer les onglets

## Principe
Créer un second dashboard **géré par l'interface Home Assistant (storage/UI)**, nommé **KIMIA Administration**, avec l'option **réservé aux administrateurs**. Importer le fichier `kimia-admin-ui-import.yaml` dans son éditeur de configuration brute.

Ce dashboard contient **8 interrupteurs natifs** et un compteur d'onglets actifs.

- `input_boolean.kimia_onglet_lumieres`
- `input_boolean.kimia_onglet_volets`
- `input_boolean.kimia_onglet_climatisation`
- `input_boolean.kimia_onglet_musique`
- `input_boolean.kimia_onglet_securite`
- `input_boolean.kimia_onglet_prises`
- `input_boolean.kimia_onglet_actualites`
- `input_boolean.kimia_onglet_parametres`

**Accueil reste toujours affiché.**

Un bouton OFF masque la route correspondante dans **Navbar Card**, y compris dans le menu « Plus » du téléphone. Un bouton ON la réaffiche.

**Important :** les huit vues restent visibles dans les **onglets natifs Home Assistant**. Les interrupteurs ne masquent que les boutons de la **Navbar Card** et les entrées du menu « Plus ». L'option `visible: false`, initialement utilisée, supprimait tous les onglets secondaires de la barre native et a donc été retirée. Home Assistant ne permet pas de relier directement la visibilité des onglets natifs aux `input_boolean`. Pour une expérience de navigation uniquement via Navbar, il faut masquer la barre d'onglets native séparément via l'interface/Kiosk Mode, après validation de Navbar. Une URL directe reste accessible.

Le bandeau de l'Accueil, la maquette, la météo et les équipements n'ont pas été modifiés pour cette fonctionnalité. Seule sa Navbar Card lit maintenant les interrupteurs.

## Installation (dans cet ordre)

1. **Sauvegarder** les deux dashboards et la configuration Home Assistant.
2. Copier `packages/kimia_admin_navigation.yaml` dans `/config/packages/kimia_admin_navigation.yaml`. Il définit les interrupteurs, plus une automatisation de première installation qui les active **une seule fois** et marque l'initialisation comme terminée. Ensuite leurs états restent mémorisés après les redémarrages.
3. Vérifier que `configuration.yaml` contient déjà l'inclusion `homeassistant.packages: !include_dir_named packages` **sans en créer une seconde**. Contrôler la configuration, puis redémarrer HA.
4. Dans **Outils de développement > États**, vérifier qu'existent les 8 `input_boolean.kimia_onglet_*` et qu'ils sont activés au premier démarrage.
5. Dans **Paramètres > Tableaux de bord**, créer un nouveau dashboard **KIMIA Administration**. Cocher **Admin uniquement** (ou « Visible uniquement pour les administrateurs » selon la version). Il est préférable de le masquer de la barre latérale des comptes non administrateurs. Le créer en mode **interface** pour conserver le déplacement et le redimensionnement des cartes.
6. Ouvrir **KIMIA Administration > Modifier > Éditeur de configuration brute**. Coller `kimia-admin-ui-import.yaml` au complet, puis enregistrer. Le chemin d'accès est celui attribué par HA lors de la création.
7. Dans le dashboard KIMIA Smart existant, sauvegarder l'ancien YAML puis importer le nouveau `dashboard-ui-import.yaml`. Ne pas le coller dans une seule carte.
8. Tester sur PC et sur téléphone : désactiver **Musique**, vérifier son absence dans la Navbar latérale et dans le popup « Plus » sur mobile ; réactiver **Musique** et vérifier son retour. Tester les autres interrupteurs.
9. Vérifier que les choix persistent après redémarrage Home Assistant.

La branche GitHub ne déploie pas automatiquement ces fichiers sur la VM.

## Sécurité et limites

- Le réglage des onglets masque l'accès dans la navigation, **pas l'URL elle-même**. Il ne bloque pas le pilotage d'entités ni les droits d'accès Home Assistant.
- Le dashboard Administrateur doit être marqué **réservé aux administrateurs** dans les paramètres HA, pas simplement dissimulé dans la navigation.
- Les onglets natifs Home Assistant restent visibles pour garantir l'accès aux vues. Seules les entrées de Navbar Card sont filtrées par les interrupteurs ; les vues elles-mêmes ne sont pas protégées ou désactivées.
- L'interface Android / PC n'a pas encore été testée en direct : valider d'abord sur la VM de test.

## Étape suivante : gestion des pièces

**Recommandation :** utiliser les **Zones (Areas)** et les **Étages (Floors)** natifs Home Assistant comme référentiel unique des pièces.

Parcours proposé pour l'installateur :
1. Créer une zone (ex. Salon, Cuisine, Chambre 1) dans **Paramètres > Zones, étiquettes et étages**.
2. Lui donner un nom, un étage et une icône/photo.
3. Affecter à cette zone les vrais appareils (lumières, volet, climatisation, prises, capteurs).
4. Dans KIMIA, ajouter une **carte Zone (type: area)** par pièce, toujours indépendante, déplaçable et redimensionnable. La carte affiche automatiquement les équipements assignés à la zone, selon les options de la carte.

Cette V1 n'exige ni nouvel add-on ni script personnalisé. Elle demande toutefois de **créer la carte Zone dans le dashboard** lorsqu'on ajoute une nouvelle pièce : Home Assistant ne crée pas automatiquement une carte individuelle dans un dashboard personnalisé.

Pour un futur bouton « Ajouter une pièce » directement depuis KIMIA et une génération automatique de la carte, il faudra développer une intégration/une interface dédiée capable de modifier le registre des Zones et la configuration du dashboard. Ne pas présenter un simple helper `input_text` comme une vraie pièce Home Assistant.

Documentation officielle :
- https://www.home-assistant.io/docs/organizing/areas/
- https://www.home-assistant.io/dashboards/area/
