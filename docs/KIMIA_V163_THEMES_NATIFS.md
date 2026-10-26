# KIMIA V1.6.3 — Retour des cartes natives de thèmes, correctif strictement visuel

## Portée du changement
La seule ressource logicielle modifiée est `www/kimia-local-theme-v16-card.js`.
- Les huit choix de thème KIMIA sont affichés par de **vraies cartes Home Assistant natives `type: button`** créées avec `window.loadCardHelpers().createCardElement`. Même nom, icône et **nom de couleur HA** que les tuiles de la V1.5.
- Les cartes natives émettent l'événement `hass-action`. La carte KIMIA le capture et lance uniquement sa fonction `select` de thème **local**, puis empêche l'action de remonter vers HA : ni `frontend.set_theme`, ni `input_select.kimia_theme_global` ne sont appelés.
- La préférence reste dans le `localStorage` de chaque navigateur/compte, sans action sur les autres sessions.
- La V1.6.2 reste inchangée pour l'administration, le mode Kiosk, les utilisateurs, pièces, scénarios, automatisations, autres dashboards et tous les packages.
- Le support de création des cartes natives dépend du frontend Home Assistant. Le code affiche un message si le helper natif n'est pas disponible au lieu de basculer en silence vers une interface différente.

## Installation ciblée sur VM210
1. Vérifier la sauvegarde ou point de retour en arrière de KIMIA V1.6.2.
2. Remplacer **un seul fichier** : `/config/www/kimia-local-theme-v16-card.js`.
3. Dans Ressources Lovelace, modifier seulement son URL existante :
   `/local/kimia-local-theme-v16-card.js?v=163` — type **Module JavaScript**.
4. Recharge forcée du navigateur avec Ctrl+F5. **Ne pas** cliquer sur « Actualiser ma maison » : le type de carte KIMIA et le YAML du dashboard **n'ont pas changé**. Pas de redémarrage HA requis.
5. Dans **KIMIA → Paramètres → Apparence**, vérifier huit boutons natifs avec couleurs/icons HA ; choisir deux thèmes différents depuis deux navigateurs pour vérifier l'isolation locale.
6. Vérifier rapidement bandeau HA admin, maquette, pièces, listes et atelier routines inchangés. Quand tout est validé, effectuer la sauvegarde Proxmox de la VM de référence.

## Test automatique
La CI vérifie l'existence de huit cartes `hui-button-card`, leurs couleurs et icônes, l'événement d'action intercepté et l'absence de modification de l'autre utilisateur, ainsi que les suites régressives précédentes. Une vérification visuelle réelle dans HA reste nécessaire.
