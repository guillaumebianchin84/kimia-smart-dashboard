# KIMIA Smart by PROMAINT — V1.6 Atelier de routines
Date : 26 octobre 2026
État : **développement GitHub, NON installé automatiquement sur HA**.
Branche : `feat/kimia-v16-editeur-routines-20261026`.

## Contenu
- **Scénarios (scripts)** et **Automatisations** depuis une même carte KIMIA.
- Éditeur visuel QUAND / SI / ALORS, déclencheurs état, seuil, heure, lever/coucher du soleil ; conditions état, seuil, horaire/jours, soleil, groupes ET / OU / NON.
- Actions : appareils (lumières, prises, volets, climatisation, multimédia, scripts et scènes), attente, attente capteur avec timeout, condition qui arrête la séquence, Si/Alors/Sinon, répétition limitée à 20.
- Blocs réorganisables par ↑ ↓, glisser-déposer avec poignée sur ordinateur, duplicables et supprimables.
- Création, ouverture, édition, duplication et suppression confirmée des routines reconnues KIMIA ; refus d'ouvrir une routine comportant des actions trop complexes pour garantir un aller-retour sûr.
- Sauvegarde de **vrais** scripts `/api/config/script/config/{id}` et automatisations `/api/config/automation/config/{id}`. Les IDs créés par KIMIA sont préfixés `ks_` ou `kimia_`. Les anciens scripts `ks_` simples V1.4 restent ouvrables.
- Avant toute mise à jour/suppression, le moteur relit la configuration HA et **refuse d'écraser une modification extérieure**.
- Préservation de `custom:kimia-scenarios-v1-card`, des raccourcis, du reste du dashboard et des routines n'appartenant pas à KIMIA.

## Installation VM de démonstration 210, APRÈS validation
1. Copier **deux nouveaux JavaScript** dans `/config/www/` :
   - `kimia-routine-engine-v16.js`
   - `kimia-routine-editor-v16-card.js`
2. Remplacer seulement `/config/www/kimia-smart-core-v1.js` par la version V1.6.
3. Dans Ressources Lovelace, modifier `/local/kimia-smart-core-v1.js?v=151` vers `/local/kimia-smart-core-v1.js?v=160`. Pour les deux modules ci-dessus, **ajouter** dans cet ordre :
   - `/local/kimia-routine-engine-v16.js?v=160` — Module JavaScript
   - `/local/kimia-routine-editor-v16-card.js?v=160` — Module JavaScript
   Ne pas ajouter de doublons. Ne pas désinstaller la ressource V1.4 : la sauvegarde et les raccourcis précédents y font encore référence ailleurs.
4. Rafraîchir complètement le navigateur. Dans `kimia-admin-next/demarrer`, actionner **Actualiser ma maison** une seule fois. L'ancienne carte de création de scénarios `kimia-script-builder-v14-card`, si elle est **strictement standard**, est remplacée par la nouvelle carte dans `kimia-admin-next/scenarios`. Les cartes personnalisées restent intactes ; le nouvel atelier s'ajoute.
5. Vérifier que l'atelier apparaît, que la liste des anciens scénarios est accessible et qu'un nouveau script simple + une automatisation de test sont créés sous HA. Tester sur un **appareil sans danger**, puis valider les traces.
6. Vérifier la navbar, Carte/Listes, Utilisateurs, Pièces, thèmes, Maquette, accès tablette. Ne jamais remplacer manuellement les grands dashboards YAML lors d'une mise à jour.

## Prudence technique
- Il s'agit d'une **nouvelle version à valider sur VM 210**, pas d'une mise à jour de la maison personnelle VM100.
- Le créateur utilise des endpoints internes HA `config/script/config/{id}` et `config/automation/config/{id}`. Ils sont utilisés par le frontend HA mais ne constituent pas une API publique contractuellement stable. Une vérification en conditions réelles après mise à jour de HA reste nécessaire.
- La liste des routines charge depuis les entités HA présentes ; juste après création, cliquer « ↻ Liste » si la nouvelle entité n'est pas encore propagée. Les automatisations sont identifiées par l'attribut `id` HA préfixé `kimia_`, les scripts par l'entity_id préfixé `ks_`.
- Pour éviter les automatismes accidentels, la création **n'exécute pas immédiatement** les actions. Les tests réels doivent être effectués intentionnellement.
- La V1.6 inclut les formes habituelles ; modèles HA avancés, services dynamiques, variables, templates et blueprints complexes restent dans l'éditeur HA natif. Un contenu non représentable est **en lecture refusée** et n'est jamais écrasé.
- Pas encore de répertoire visuel d'attribution des blocs par pièce, ni de traces détaillées intégrées à KIMIA ; les outils natifs HA restent disponibles.
- L'existence d'un onglet visuellement masqué dans KIMIA n'est pas un contrôle de sécurité HA.

## Vérifications CI
- `node --check` pour les nouveaux modules et les modules existants.
- `tests/kimia_v16_routines.test.cjs` pour scripts, automations, sérialisation aller-retour, conditions ET/OU, sous-actions, réordonnancement, création/modification/suppression, conflit.
- Suite de régression V1.3/V1.4/V1.5 + validation YAML.
