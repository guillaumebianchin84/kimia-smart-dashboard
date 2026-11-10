# KIMIA Smart — présentation native d'après le YAML utilisateur du 10/11/2026

**Branche de test, non déployée automatiquement sur l'Odroid.** Le générateur IA Gemini et les 10 scènes stockées dans Home Assistant restent inchangés.

## Règles de présentation KIMIA client

Ce document **remplace** la règle précédente « pas de grid_options ». Le YAML réellement validé par l'utilisateur a priorité.

- Les cartes de pièces sont de véritables cartes natives Home Assistant `type: area`, `display_type: compact`, `features: []`, `tap_action: none`, avec `grid_options: {columns: 12, rows: 2}`.
- Les ampoules utilisent `type: tile`, **12 colonnes, 2 lignes**, et `features: [{type: light-color}]` pour la couleur et le blanc. Le toucher de la tuile ouvre le panneau Home Assistant natif ; l'icône ON/OFF reste opérationnelle.
- Les prises, volets, ventilateurs, climatisations, enceintes et autres équipements sont des tuiles `type: tile` natives, **12 colonnes** (1 ligne par défaut). Leurs commandes sont adaptées à la catégorie : une climatisation sur prise ne coupe jamais le secteur au simple toucher.
- Les détecteurs binaires de sécurité peuvent conserver une `type: vertical-stack` native, contenant une vraie tuile `type: tile`, comme dans le YAML fourni.
- Les icônes sont des **MDI natives** : lampe `mdi:lightbulb-variant`, prise `mdi:power-socket-eu`, volet `mdi:window-shutter`, ventilateur `mdi:fan`, climatisation `mdi:air-conditioner`, présence `mdi:motion-sensor`, enceinte `mdi:speaker`, etc. Les icônes choisies manuellement restent prioritaires.
- Dans **Lumières**, les dix scènes générées par Gemini sont des `type: tile` natives, cliquables (`scene.turn_on`), avec des icônes différentes selon leur nom (Détente, Cinéma, Lecture, Romance, etc.).
- Le bloc « Scènes lumineuses » est placé à gauche et les dix scènes à droite dans une `vertical-stack` HA. Si l'utilisateur a déjà fabriqué **son propre cartouche `area` sans zone associée** (« Scenes lumineuse »), KIMIA **le préserve** et ne le duplique pas. Pour les installations neuves, on emploie un `type: button` natif non cliquable, car une carte `area` doit normalement référencer une vraie zone HA.
- Les vues client gardent leur organisation et les réglages spécifiques existants (bandeau, navigation, maquette, droit d'accès).

## Migration et sécurité
- KIMIA ne remplace que les signatures exactes de cartes produites par ses versions précédentes (formats 6 et 12 colonnes, wrapper `kimia-safe-tile`).
- Les cartes personnalisées par l'habitant, dont les tuiles Innr et le bloc scènes du YAML fourni, sont conservées.
- La synchro n'ajoute pas de doublons et respecte les entités déjà présentes, y compris dans les différentes catégories.
- Aucun scénario ou appareil Zigbee n'est activé par le correctif lui-même.

## Installation test
1. Effectuer une **sauvegarde Home Assistant** et exporter les dashboards `kimia-next` / `kimia-admin-next`. Copier l'ancien fichier `/config/www/kimia-smart-core-v1.js`.
2. Depuis la branche `feat/kimia-native-scene-light-tiles-20261110`, télécharger en **Raw** le seul fichier `www/kimia-smart-core-v1.js` et remplacer `/config/www/kimia-smart-core-v1.js`.
3. Dans **Paramètres → Tableaux de bord → Ressources**, modifier l'URL déjà existante du moteur en `/local/kimia-smart-core-v1.js?v=5` (type **Module JavaScript**). Ne pas créer de deuxième ressource pour le même fichier ; ne pas modifier `kimia-ai-scenes-v1-card.js`.
4. Actualiser avec **Ctrl+F5**, puis utiliser **KIMIA Configuration → Démarrer → Actualiser ma maison**.
5. Contrôler d'abord **Lumières**, **Prises** et **Sécurité**. Si l'affichage ne convient pas, restaurer la sauvegarde JS et le dashboard.

## Validation
- Syntaxe JavaScript vérifiée.
- Simulation du moteur `tests/kimia_v1.test.cjs` **réussie** : tuiles 12 colonnes, icônes MDI, générateur de section de scènes, anciennes cartes migrées, personnalisation préservée et synchro idempotente.
- Test explicite : le bloc `type: area` « Scenes lumineuse » fourni par l'utilisateur et les dix scènes `vertical-stack` restent présents après synchronisation.
- **L'aspect final en navigation Home Assistant et l'alignement visuel réel sur l'Odroid restent à confirmer.**
