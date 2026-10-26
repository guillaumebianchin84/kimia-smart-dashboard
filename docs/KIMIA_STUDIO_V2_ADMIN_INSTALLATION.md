# KIMIA Studio V2 — interface administration (prototype testable)
Date : 26 octobre 2026 · Branche isolée `feat/kimia-studio-v2-admin-interface-20261026`.

## Périmètre de ce lot
Nouvelle carte Lovelace `custom:kimia-studio-v2-admin-card` **autonome**. Aucun ancien fichier runtime n'est remplacé. Aucun dashboard existant n'est modifié automatiquement. Le moteur V1.6 de Home Assistant reste utilisé pour enregistrer les scripts et automatisations.

### Bibliothèque de routines
- Présente **tous les scripts et automatisations de Home Assistant**, pas uniquement ceux de KIMIA ; recherche, onglets et filtres par statut.
- Lancer un script uniquement après confirmation, activer/désactiver une automatisation.
- Édition des routines externes via l'éditeur HA natif ; routines KIMIA via atelier V1.6 avancé existant. Aucune écriture destructrice lors de la lecture.

### Création guidée
- Parcours visuel : modèle → appareils par pièce HA → actions → conditions/déclencheurs → récapitulatif.
- Modèles : scénario libre, Bonne nuit, Départ, Retour, automatisation libre, Éclairage du soir, Réveil, Confort & énergie.
- Zones et équipements issus du registre HA du client, sans coordonnées de Maquette ni noms de pièces fixés dans le code.
- Commandes prises en charge par le moteur V1.6 : lumière, prise, volet, clim, multimédia, scène, scripts ; délais, attentes ; triggers heure, soleil, état et seuil ; conditions état, seuil, heure, soleil.
- Enregistrement de véritables scripts et automations HA via les API de configuration HA ; pas d'exécution pendant création.
- L'éditeur avancé V1.6 existant est accessible depuis le Studio ; pour les fonctions non représentables, HA natif.

### Ce qui reste à développer AVANT produit client
Ce premier lot **ne prétend pas couvrir toutes les fonctions avancées en interface V2**. Le moteur V1.6 avancé garde plusieurs limites : templates Jinja, blueprints, variables, choose multiples, cibles multi-zones, MQTT/webhooks et certains services spécifiques aux intégrations. Le cahier des charges exhaustif est dans `docs/KIMIA_STUDIO_V2_SPEC_FONCTIONNELLE_20261026.md`. À terme : catalogue par pièces/étiquettes, groupe ET/OU/NON en V2, blocs natifs sans perte, traces HA intégrées, previews/annulations et permissions serveur.

## Installation non destructive — VM210 KIMIA uniquement
1. Conserver la sauvegarde Proxmox V1.6.3 et les anciennes cartes V1.6/V1.7.
2. Copier **un seul nouveau fichier** : `www/kimia-studio-v2-admin-card.js` → `/config/www/kimia-studio-v2-admin-card.js`.
3. Vérifier l'existence (déjà installées en V1.6) et l'ordre des ressources JavaScript de HA :
   - `/local/kimia-routine-engine-v16.js?v=160` — existante, doit être avant Studio V2.
   - `/local/kimia-routine-editor-v16-card.js?v=160` — existante, pour le mode avancé.
   - **Ajouter** `/local/kimia-studio-v2-admin-card.js?v=200` — type **Module JavaScript**.
4. Sur le dashboard **`kimia-admin-next` seulement**, créer une vue de test facultative intitulée **Studio V2** (sans supprimer l'onglet Scénarios existant), puis ajouter une carte manuelle :

```yaml
type: custom:kimia-studio-v2-admin-card
grid_options:
  columns: full
  rows: auto
```

5. Recharger le navigateur avec `Ctrl + F5` ; vérifier l'affichage sur PC, smartphone et tablette.
6. Tester d'abord la bibliothèque et la création d'un script simple utilisant une entité sans risque (ex. une lampe fictive/test), puis un horaire automatique, sans démarrer une action dangereuse.
7. Tester avec un compte non-admin : l'interface d'édition doit rester inaccessible.
8. **Ne pas cliquer sur « Actualiser ma maison » pour installer ce prototype** : la carte est isolée de la synchronisation. Pas de redémarrage HA.

## Retour arrière
Supprimer seulement la vue de test et la ressource V2, puis éventuellement le nouveau fichier. Tous les scripts, dashboards, profils, scènes, plans, thèmes et appareils préexistants restent inchangés par l'installation. Attention : **les routines nouvellement créées pendant les essais sont de vrais objets HA**, elles ne seront pas supprimées automatiquement avec la carte.

## Contraintes techniques et validations
- Aucune commande d'équipement n'est déclenchée pendant le parcours de création. « Lancer » une routine existante demande confirmation.
- Un compte HA non-administrateur ne peut pas utiliser le créateur V2.
- Les API `config/script/config/{id}` et `config/automation/config/{id}` sont des endpoints frontend HA internes : à vérifier après les mises à jour Home Assistant.
- CI vérifie les scripts, les zones dynamiques, les permissions et l'absence de mutations des tableaux de bord.
- L'interface est un prototype **non encore validé visuellement sur la VM210** ; son installation ne signifie pas qu'elle est prête à déployer chez un client.
