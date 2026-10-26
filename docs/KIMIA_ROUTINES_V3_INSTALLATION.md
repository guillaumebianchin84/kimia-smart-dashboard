# KIMIA Routines V3 — éditeur simple Quand / Si / Alors

**26 octobre 2026 — version isolée d'essai pour VM210**. Le prototype est destiné au dashboard `kimia-admin-next`, dans sa vue de test `Studio V2` (elle peut conserver son nom pendant les essais). La V1.6.3 Proxmox et le code KIMIA V1.7 restent intacts.

## Ce qui change
- Une seule page de création, sans assistant à cinq étapes : script = **Actions** (+ conditions facultatives) ; automatisation = **Quand / Si / Alors**.
- Cartes de déclencheurs, conditions et actions directement modifiables ; nouvelles entrées uniquement après clic « Ajouter » ; choix d'un type puis des équipements par pièce.
- Appareils courants en premier : lumières, volets, prises, chauffage/clim, ventilation, TV/multimédia ; heures, soleil, état et seuil, attente simple.
- Une recherche d'équipement et un filtre de pièce lisibles, noms issus de HA et non des identifiants techniques.
- Accès natif HA toujours présent dans l'éditeur et sur l'accueil. Routines HA complexes automatiquement dirigées vers leur édition native ; aucun bloc inconnu ne sera réécrit.
- Routines de maintenance internes KIMIA (thèmes, initialisation pièces, onglets) masquées dans la liste grand public **mais conservées, actives et visibles dans Home Assistant**.
- Actions de sauvegarde sans exécution réelle. Bouton Lancer pour scénario existant après confirmation. Activation/désactivation pour automatisation existante.

## Installation sans toucher au reste
1. Copier **uniquement le nouveau fichier** `www/kimia-routines-v3-card.js` vers `/config/www/kimia-routines-v3-card.js`. Ne remplacer aucun autre JavaScript.
2. Vérifier que la ressource déjà installée `/local/kimia-routine-engine-v16.js?v=160` existe. Si elle manque, utiliser le fichier V1.6 présent dans le dépôt, déclaré **avant** la V3.
3. Ajouter une ressource de type **Module JavaScript** : `/local/kimia-routines-v3-card.js?v=300`.
4. Dans la **vue de test** `Studio V2` de `kimia-admin-next`, remplacer uniquement la carte manuelle `custom:kimia-studio-v2-admin-card` par cette nouvelle carte :

```yaml
type: custom:kimia-routines-v3-card
grid_options:
  columns: full
  rows: auto
```

5. Enregistrer et rafraîchir la page avec `Ctrl+F5`. **Ne pas réimporter le dashboard complet, ne pas cliquer sur « Actualiser ma maison » pour cette installation, ne pas redémarrer HA.**
6. Vérifier d'abord l'interface et une petite routine de test sur un **appareil de test sans risque**. Tester ensuite l'édition native d'une automatisation avancée : elle doit ouvrir HA sans être modifiée.

## Limites explicites à ne pas confondre avec la version cible
- V3 = vraie première interface simple à tester, **pas** un clone complet des fonctions avancées HA. Les modèles Jinja, blueprints, MQTT, webhooks, boucles et actions multi-branches avancées utilisent l'éditeur natif HA.
- Les appels de configuration scripts/automations utilisent toujours les endpoints internes exploités par le moteur V1.6 ; vérifier la compatibilité après changement de version HA.
- La V3 est une interface administrateur. Les actions « Lancer » ou « Activer/Désactiver » commandent réellement HA : tester prudemment. Les comptes non administrateurs ne peuvent pas utiliser les fonctions de création et d'édition.
- Certains `input_boolean` et autres helpers techniques sont volontairement absents des actions grand public ; les utilisateurs avancés peuvent continuer dans HA natif.
- Les scripts HA stockés uniquement dans des fichiers YAML externes peuvent ne pas être éditables par API configuration : dans ce cas ouvrir HA natif, sans tentative de migration.
- Un script/automation comportant une commande répétée sur la même entité ou des blocs non reconnus est ouvert dans HA natif afin de ne jamais être réécrit partiellement.
- Le bouton natif HA pour une **nouvelle** routine ouvre le tableau de bord HA de la catégorie correspondante. Pour une routine existante reconnue, ouvre son éditeur.

## Retour arrière (sans risque pour le socle)
Replacer l'ancienne carte `custom:kimia-studio-v2-admin-card` dans la seule vue de test, ou supprimer cette vue. La ressource V3 peut être désactivée ; aucun des fichiers existants de KIMIA n'a été remplacé. Les routines créées volontairement pendant les essais sont de vrais objets Home Assistant et subsistent après retrait de l'interface.

## Intégrité et validation
La branche ne doit contenir que ce nouveau JavaScript, son test, cette documentation et le workflow GitHub CI (pas de modification de `kimia-smart-core-v1.js`, des dashboards, Maquette, thèmes ou profils). Les tests GitHub contrôlent la liste des routines, la séparation des automatismes internes, les cibles par pièce, les écritures sans exécution, la fidélité de lecture/écriture et la redirection vers HA pour les cas complexes.
