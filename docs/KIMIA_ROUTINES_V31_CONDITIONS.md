# KIMIA Routines V3.1 — conditions plus riches pour scénarios et automatisations

## Périmètre strict
- Développement isolé depuis Routines V3 validé en tests.
- **Un seul composant d'interface remplacé** : `www/kimia-routines-v3-card.js`. Le nom original est conservé pour remplacer la ressource de test existante.
- Aucun changement au moteur `kimia-routine-engine-v16.js`, aux dashboards, thèmes, maquettes, paramètres, utilisateurs, profils ou autres composants.
- Pas d'installation automatique sur la VM KIMIA 210. VM personnelle 100 intouchable.

## Conditions dans les deux types de routines
Même panneau **SI…** pour :
- scénarios / scripts : conditions sous forme de blocs `condition` HA avant les actions (si la condition échoue, le script s'arrête sans exécuter la suite) ;
- automatisations : tableau natif `conditions` de Home Assistant avant les actions.

Choix visuels : état d'appareil, valeur capteur, présence/localisation d'une personne (état `person.*` ou `device_tracker.*`, y compris zones connues), météo (état `weather.*`), créneau horaire, jours de semaine, soleil, combinaisons ET / OU / NON à un niveau. Le moteur V1.6 natif déjà installé convertit les choix en `state`, `numeric_state`, `time`, `sun`, `and`, `or`, `not` sans nouvelle API. Les déclencheurs état peuvent exiger une durée (sans état source explicite). Tous les blocs restent validés avant ajout et sauvegardés par HA.

Limites : météo = état fourni par l'entité météo (ce n'est pas une prévision météo), présence = état d'entité correspondant à une zone (ce n'est pas une permission d'accès). Les groupes imbriqués plus profondément, combinaisons HA atypiques et autres options non représentables ouvrent toujours HA natif plutôt que risquer une modification avec perte. Les durées dans les **conditions** d'état, calendriers, logique de seuil évoluée et certains types déclencheurs restent à traiter ultérieurement ; seuls les déclencheurs d'état peuvent déjà avoir un champ durée. Les événements spéciaux, templates et blueprints restent en natif HA.

## Installation sur VM210 uniquement, après CI et validation
1. Conserver la sauvegarde Proxmox et un exemplaire du fichier `/config/www/kimia-routines-v3-card.js` actuellement installé.
2. Télécharger **seulement** `www/kimia-routines-v3-card.js` depuis la branche V3.1 ou l'artefact GitHub `KIMIA-Routines-V31-Conditions-Test`.
3. Remplacer ce **seul** fichier dans `/config/www/`. Le moteur V1.6 déjà installé ne bouge pas.
4. Dans les Ressources Lovelace, modifier uniquement la ressource existante `/local/kimia-routines-v3-card.js?v=300` en `/local/kimia-routines-v3-card.js?v=310` (type Module JavaScript). **Ne pas ajouter de doublon.**
5. Rafraîchir complètement le navigateur. Ouvrir la **carte de test Studio V2 existante**, sans toucher à la configuration YAML.
6. Créer un script de test et une automatisation de test avec condition de présence, météo ou jours ; ne tester l'exécution que volontairement avec une lampe non dangereuse.
7. Tester modification d'une routine existante ; si HA propose l'éditeur natif pour une routine avancée, laisser intacte la configuration.
8. Aucun redémarrage HA, aucune synchronisation globale KIMIA, aucun réimport du dashboard.

## Annuler
Restaurer l'ancien fichier V3 puis remettre la ressource à `?v=300` et rafraîchir le navigateur. Les scripts/automatisations créés volontairement sont des objets HA réels et ne seront pas supprimés lors du retour arrière.
