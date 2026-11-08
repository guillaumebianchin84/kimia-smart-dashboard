# KIMIA Smart — Fusion « Mes routines » et 4 scénarios personnalisables sur Accueil
Date : 8 novembre 2026
Statut : candidat pour essai sur VM KIMIA ; non déployé automatiquement.

## Fonctionnement

L'ancienne page **Mes habitudes / Scénarios** et l'écran **Mes routines / Studio V2** sont rassemblés dans **Mes routines**, en conservant la présentation en cartes du Studio.

Dans une seule page d'administration :
- **Créer un scénario** ou **Créer une automatisation** (assistant guidé).
- Visualiser, rechercher, lancer, activer/désactiver, modifier et **supprimer** une routine KIMIA avec confirmation et garde-fous.
- **Atelier avancé** : toujours accessible, utilisant le moteur V1.6 existant.
- **Mes habitudes** : choisir et ordonner **jusqu'à quatre scénarios** sur Accueil. Une position peut rester vide et aucun scénario n'est dupliqué.
- Les anciens réglages d'ambiances KIMIA restent accessibles lorsque leurs helpers sont installés ; aucun helper supplémentaire n'est exigé pour les quatre raccourcis Accueil.

## Accueil client

Le moteur KIMIA affiche toujours le **composant de raccourci du dashboard** (`type: shortcut`) : même apparence que les autres boutons du thème, sans nouveau style graphique pour chaque raccourci.

- Les quatre boutons fixes d'origine « Au lit », « Départ », « Retour », « Réveil » sont remplacés **lors du premier Enregistrer sur l'accueil**, uniquement dans la rubrique « Mes scénarios ».
- Le bouton **Parler à Gemini** et les autres raccourcis ne sont pas supprimés.
- Nom et icône suivent le scénario Home Assistant réellement sélectionné.
- Scénario non disponible : bouton désactivé et libellé « Scénario indisponible ».
- La configuration reste **dans `kimia-next`**. Aucun script Home Assistant n'est renommé, recréé ou modifié par le classement.
- Les scénarios utilisés sur Accueil ne sont pas supprimables depuis la bibliothèque avant d'être retirés des raccourcis.
- La configuration requiert des scripts Home Assistant (`script.*`) existants, pas des automatisations (`automation.*`).

## Réunir les deux vues déjà présentes dans HA

La configuration GitHub `kimia-admin-next-ui-import.yaml` comporte désormais une seule carte `custom:kimia-studio-v2-admin-card` dans la vue `scenarios`. **Ne pas réimporter un dashboard entier pour une installation existante personnalisée.**

Après installation, Studio V2 détecte la présence simultanée de la page `/scenarios` (éditeur ancien) et de `/studio-v2` (Studio), et propose **« Réunir les deux pages »**.

L'action :
1. Vérifie que les pages concernées ne possèdent que les cartes connues KIMIA ; sinon refuse la fusion automatique.
2. Demande une confirmation explicite.
3. Relit la configuration avant écriture pour éviter d'écraser une édition concurrente.
4. Place Studio V2 seul dans la vue `scenarios`, renomme cette vue « Mes routines », puis retire la vue `studio-v2` qui faisait doublon.
5. Conserve toutes les autres vues et leurs cartes.

Si le bouton n'est pas proposé ou si la vérification échoue, **ne pas supprimer manuellement les pages au hasard** : comparer d'abord les cartes des deux vues, puis effectuer une migration ciblée. Sauvegarder les deux dashboards avant toute fusion.

## Installation sur la VM de développement KIMIA

**Sauvegarder au préalable :** les dashboards `kimia-next` et `kimia-admin-next`, plus les fichiers JavaScript actuels. Ne pas toucher à VM100.

Deux ressources changent :

| Source de cette branche | Destination HA |
| --- | --- |
| `www/kimia-studio-v2-admin-card.js` | `/config/www/kimia-studio-v2-admin-card.js` |
| `www/kimia-smart-core-v1.js` | `/config/www/kimia-smart-core-v1.js` |

Il faut conserver et charger aussi `kimia-routine-engine-v16.js` et `kimia-routine-editor-v16-card.js`, déjà utilisés par KIMIA V1.6.

Dans **Paramètres → Tableaux de bord → Ressources**, actualiser les ressources **existantes** sans créer de doublons :

- `/local/kimia-studio-v2-admin-card.js?v=20261108-fusion4`
- `/local/kimia-smart-core-v1.js?v=20261108-fusion4`

Faire un rechargement complet (PC et mobile).

1. Ouvrir l'ancienne page **Mes routines** `/kimia-admin-next/studio-v2`.
2. Si proposé, utiliser « Réunir les deux pages », confirmer, puis vérifier la redirection vers `/kimia-admin-next/scenarios`.
3. Depuis **Mes routines**, ouvrir **Mes habitudes**.
4. Associer jusqu'à 4 scénarios existants, laisser éventuellement des positions vides, utiliser les flèches pour changer l'ordre, puis cliquer **Enregistrer sur l'accueil**.
5. Ouvrir **`/kimia-next/accueil`**, puis vérifier visuellement les boutons, leur ordre, l'icône et le bouton indépendant « Parler à Gemini ».
6. Tester un scénario avec un équipement non critique et vérifier qu'il s'exécute réellement.
7. Vérifier les anciennes routines/automatisations, la modification, la suppression et les ambiances déjà présentes.

## Limites

- Les tests automatisés sont des **simulations JavaScript et validations YAML**. Ils ne prouvent pas le rendu sur la version exacte de Home Assistant ni le comportement d'un appareil physique.
- L'interface réellement installée peut contenir des cartes absentes de l'export GitHub. Dans ce cas le bouton de fusion refuse délibérément de supprimer une vue.
- La navigation depuis un onglet `studio-v2` supprimé doit être revue si d'autres raccourcis y renvoient.
- Les scripts protégés de maintenance (notamment « KIMIA - Recherche Internet ») ne sont pas supprimables depuis Studio.

## Réversibilité

En cas d'anomalie, restaurer les deux JS précédents et la configuration des dashboards sauvegardée. Un simple remplacement de JS ne rétablit pas la disposition des vues si une fusion a déjà été enregistrée.

## Tests

- `tests/kimia_studio_v2_fusion.test.cjs` : quatre scénarios, modification d'ordre, emplacement libre, doublon refusé, scénario technique protégé, script externe protégé, absence de suppression quand annulée, fusion admin avec confirmation, sécurité en cas de cartes personnalisées.
- `tests/kimia_home_shortcuts.test.cjs` : rendu des vrais boutons Home Assistant, icône et nom du scénario, disparition/reconnexion, suppression de tous les raccourcis de la liste sans effacer les scripts.
- `tests/validate_kimia_yaml.py` : une seule interface Studio déclarée pour `scenarios`, aucun doublon d'éditeur dans ce modèle de dashboard.
