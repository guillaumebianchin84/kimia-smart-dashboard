# KIMIA Smart V1.7 — Maquette et pièces par utilisateur

Dans **KIMIA Configuration → Utilisateurs**, sélectionnez le compte, cochez les pièces à afficher, puis enregistrez. KIMIA synchronise le tableau de bord client et Maquette à partir des mêmes préférences, enregistrées sous `hidden_areas_by_user`. La Maquette associe chaque pièce dessinée à une zone Home Assistant par son ID (`rooms[].area` ou `floors[].rooms[].area`). Plusieurs pièces peuvent partager une zone.

- Pour les administrateurs et les comptes sans restriction, Maquette reçoit le plan complet. L’éditeur officiel reste accessible aux administrateurs selon les réglages du plan.
- Une pièce masquée reste dessinée, avec un cadenas dans son nom. Le client ne peut pas y entrer depuis le plan. Les appareils de sa zone, les valeurs des capteurs, leurs commandes et leurs contributions aux résumés sont retirés. Les murs et les ouvertures restent en place.
- KIMIA relève les affectations actuelles des entités et appareils dans le frontend Home Assistant. Si cette information n’est pas reçue, la dernière synchronisation KIMIA fournit les affectations disponibles. Pour un appareil sans affectation connue, le filtre tient aussi compte de sa position dans le plan.
- Une association absente ou obsolète est signalée sous le plan pour les administrateurs. Dans l’éditeur Maquette, associez la pièce à la zone Home Assistant voulue, puis enregistrez le plan.
- Le filtre porte sur l’interface Maquette. Les autres interfaces, l’API, Assist et les règles d’accès du serveur Home Assistant suivent leur propre configuration.

Maquette v0.4.1 peut encore compter une ouverture ou une pastille masquée par un calque dans le résumé. KIMIA applique donc le filtre sur une copie temporaire de la configuration. La carte officielle et son éditeur utilisent le plan d’origine pour les comptes administrateurs. Le dépôt Maquette et ses ressources restent indépendants.

## Déployer la correction sur KIMIA DEV

1. Sur `demo.domo-pilote.fr`, vérifier que **Système → Matériel** affiche **Hardkernel ODROID-M1S**, puis créer une sauvegarde locale des réglages Home Assistant.
2. Conserver une copie de `/config/www/kimia-maquette-acl-v17-card.js` et de l’URL actuelle de sa ressource Lovelace.
3. Remplacer ce fichier par la version de la PR et modifier la ressource Module JavaScript existante en `/local/kimia-maquette-acl-v17-card.js?v=172`.
4. Recharger le navigateur. Si le plan apparaît comme une carte Maquette brute, utiliser **KIMIA Configuration → Démarrer → Actualiser ma maison** pour appliquer l’enveloppe existante. Les dashboards à jour la contiennent déjà. Le déploiement s’effectue sans redémarrage.
5. Vérifier le plan en compte admin et en compte client, puis restaurer la sélection de pièces et l’état des appareils utilisés pour les essais.

Pour revenir en arrière, remettre la copie du fichier JS et l’ancienne URL de ressource ou forcer un nouveau numéro de version, puis recharger le navigateur.

## Tester

```sh
node --check www/kimia-maquette-acl-v17-card.js
node --test tests/kimia_v17_maquette_areas.test.cjs
```

Ces tests couvrent les affectations d’entités, les étages et pièces multiples, les comptes, les changements d’affectation, les géométries et capteurs, les groupes, les résumés et les commandes. Les essais sur Maquette dans Home Assistant se font séparément.
