# KIMIA Smart — Inventaire et gestion des affectations (V1.1)

**Branche :** `feat/kimia-inventaire-v1-20261026` (prototype de test). Les anciennes versions et le dashboard de production `kimia-smart` ne sont pas modifiés.

## Résultat dans KIMIA Configuration

### Nouvel onglet Inventaire
- Liste des **appareils HA enregistrés**, Zigbee ou non : nom, pièce, intégration détectée, fabricant/modèle si disponibles.
- À l'intérieur d'un appareil : ses fonctions (commandes, mesures, capteurs, etc.).
- Recherche et filtres : Tous, Prêts, Sans pièce, Zigbee, Commandes, Capteurs.
- Les commandes sans appareil du registre (par ex. entité virtuelle) sont distinguées des appareils.
- L'inventaire est **en lecture seule** et réservé à l'administrateur.

**Attention au chiffre d'accueil :** « Appareils » = lignes du registre des appareils HA (physiques ou logiques) ; « Équipements pilotables » = nombre d'entités actives de domaines `light`, `switch`, `cover`, `climate`, `fan` et `media_player`. Ce ne sont pas forcément 10 appareils physiques différents.

### Dans Pièces > sélectionner une pièce
- Nouvelle rubrique **Appareils de cette pièce** avec liste de ses appareils directement associés.
- Bouton **Retirer de la pièce** en regard de chaque appareil : confirmation explicite ; effectue **uniquement** `config/device_registry/update` avec `area_id: null`.
- Aucun appel de suppression d'appareil (ni désappairage Zigbee).
- L'appareil peut ensuite être réaffecté à une autre pièce depuis **Ajouter ou déplacer un appareil**.

### Cartes générées dans KIMIA Nouvelle génération
- Le moteur V1.1 retire les **anciennes cartes Tuile natives restées exactement identiques à la version générée** si leur entité n'appartient plus à la pièce ou catégorie.
- Une carte éditée manuellement n'est **pas supprimée**. Il peut donc rester des cartes modifiées que l'administrateur retirera manuellement au besoin.
- Les **cartes de pièces Area restent en place** lorsque l'appareil s'en va (la pièce existe toujours).
- Les en-têtes de rubrique/sections vides ne sont pas tous nettoyés automatiquement : prudence pour préserver les modifications du client.
- Le moteur peut ajouter des tuiles aux nouvelles pièces. Il refuse d'écrire sur un autre dashboard que `kimia-next`.

## Installation sans casser KIMIA

1. Sauvegarder Home Assistant et **exporter le YAML actuel du dashboard KIMIA Configuration** avant de changer.
2. Copier dans `/config/www/` :
   - **Remplacer** `kimia-smart-core-v1.js` par la version V1.1.
   - **Remplacer** `kimia-room-manager-v1-card.js` par la version V1.1.
   - **Ajouter** `kimia-inventory-v1-card.js`.
   Les anciens fichiers `kimia-room-manager-card.js` et `kimia-zigbee-manager-card.js` ne changent pas.
3. Dans Paramètres → Tableaux de bord → Ressources (type **Module JavaScript**), **modifier les deux entrées déjà présentes**, ne pas les dupliquer :
   - `/local/kimia-smart-core-v1.js?v=101`
   - `/local/kimia-room-manager-v1-card.js?v=101`
   Ajouter :
   - `/local/kimia-inventory-v1-card.js?v=101`
4. Depuis `kimia-admin-next` existant (administrateur uniquement), importer `kimia-admin-next-ui-import.yaml` de cette branche dans l'éditeur de configuration brute. Ce fichier **contient toutes les pages**, avec un sixième onglet « Inventaire ».
5. Fermer / rouvrir le navigateur Home Assistant et recharger la page.
6. Tester **KIMIA Configuration → Inventaire** ; puis **Pièces**, sélectionner une chambre, utiliser **Retirer de la pièce** sur un appareil de test. Le retirer **ne le désinstalle pas** de Home Assistant.
7. Aller dans KIMIA Nouvelle génération, et vérifier l'ancienne catégorie de l'appareil. Si nécessaire, cliquer « Actualiser ma maison » dans KIMIA Configuration → Démarrer.

## Protection et limites

- L'inventaire et les modifications d'affectation nécessitent des droits admin.
- Les fonctionnalités de gestion de pièce ne sont pas un mécanisme de droits d'accès : un utilisateur Home Assistant peut avoir des permissions plus larges.
- Les entités attribuées **directement à une pièce** dans le registre des entités, sans affectation directe de leur appareil, ne figurent pas encore dans la liste d'appareils du gestionnaire. Elles sont visibles dans l'inventaire.
- Les child devices peuvent hériter de la pièce de leur parent. Retirer leur affectation directe n'enlève pas cet héritage. La liste d'appareils de la pièce présente uniquement ceux dont `device.area_id` correspond directement à la pièce.
- Les cartes Zone natives sont dynamiques et reflètent la pièce via le registre Home Assistant.
- La suppression d'un appareil **de Home Assistant lui-même** n'est pas implémentée dans cette interface ; elle est différente de « Retirer de la pièce ».
- La V1.1 a été vérifiée avec tests JavaScript et YAML sur des données simulées. **Un essai sur la VM 210 avec un vrai appareil reste nécessaire.**
