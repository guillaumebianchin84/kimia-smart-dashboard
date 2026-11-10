# KIMIA Smart — Tuiles HA natives pleine largeur et scènes lumineuses

**Version de test** — le moteur de cette branche remplace uniquement `www/kimia-smart-core-v1.js`.
Les dix scènes et le générateur Gemini existants sont conservés.

## Règle de présentation

- Chaque équipement client (ampoule, prise, volet, capteur, climatisation, etc.) reste une **vraie carte `tile` Home Assistant**, placée seule dans une **`vertical-stack` native**.
- Aucune carte `tile` générée ni son conteneur n'a de `grid_options` imposé. La pile occupe naturellement la largeur d'un emplacement HA (visée : 12 colonnes dans le tableau de bord KIMIA).
- Les cartes de pièce `area` conservent leur apparence native, leurs commandes générales désactivées et n'ont plus de `grid_options` imposé.
- Dans **Lumières**, la section **Scènes lumineuses** présente à gauche un bloc natif non cliquable et à droite une pile verticale contenant les dix cartes `tile` natives des scènes, chacune cliquable.
- La carte personnalisée `custom:kimia-ai-scenes-shortcuts-card` est remplacée automatiquement sur la page client, sans supprimer les scènes.
- La synchronisation reconnaît les cartes KIMIA auto générées aux anciens formats 12x1, 6x1 et 12x2, ainsi que les anciens wrappers. Les cartes manuellement personnalisées sont préservées.

## Installation (TEST)

1. **Sauvegarder** le fichier `/config/www/kimia-smart-core-v1.js` et exporter les dashboards `kimia-next` / `kimia-admin-next`.
2. Depuis la branche `feat/kimia-native-scene-light-tiles-20261110`, télécharger le **Raw** du seul fichier `www/kimia-smart-core-v1.js` et remplacer `/config/www/kimia-smart-core-v1.js`.
3. Dans les **Ressources** Home Assistant, modifier l'URL de ressource existante : `/local/kimia-smart-core-v1.js?v=4` (type **Module JavaScript**). Ne pas créer de doublon ; ne pas toucher à la ressource `kimia-ai-scenes-v1-card.js`.
4. Recharger l'interface avec Ctrl+F5.
5. Depuis **KIMIA Configuration → Démarrer**, exécuter **Actualiser ma maison**.
6. Vérifier **Lumières**, **Prises**, **Volets**, **Sécurité** et une commande d'ampoule. Les dix scènes se mettent à jour lors de la synchronisation, pas instantanément après chaque génération.
7. Si l'affichage ne convient pas, restaurer le JS et la ressource sauvegardés puis le dashboard exporté si nécessaire.

## Tests

- Syntaxe JavaScript validée.
- Tests de `tests/kimia_v1.test.cjs` mis à jour et exécutés en simulation, **réussis** : aucun `grid_options` sur `tile`, piles natives, scènes, migration historique, équipement déplacé, suppression et personnalisation conservée.
- **L'agencement visuel à 12 colonnes doit être confirmé sur le vrai tableau de bord sections de Home Assistant**. Une pile `vertical-stack` est native mais son emplacement final est géré par HA.
- Aucune commande n'a été exécutée sur les appareils réels ; la synchronisation déclenche des changements du dashboard, pas d'action Zigbee.
