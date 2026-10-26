# KIMIA Smart by PROMAINT — POINT DE REPRISE / PASSATION
**Date : 26 octobre 2026 — fin de discussion mobile/PC.**

> **À LIRE EN PREMIER dans la prochaine discussion ChatGPT.** Ce fichier est la source de continuité des travaux KIMIA. Différencier impérativement **ce qui fonctionne déjà sur la VM** de **ce qui n'est que préparé sur GitHub**. Ne pas annoncer la V1.3 comme installée avant le retour du responsable produit.

## 1. Résumé exécutable

- **Produit** : KIMIA Smart by PROMAINT, interface commerciale/domotique sur Home Assistant OS séparé. But : client non technique, zéro YAML dans le parcours client, interface propre et évolutive.
- **Dépôt privé** : `guillaumebianchin84/kimia-smart-dashboard`.
- **Branche de travail à reprendre** : `feat/kimia-refonte-client-20261026` — **KIMIA V1.3, refonte visuelle préparée et tests automatisés réussis**, essai dans HA réel **à faire**.
- **Dernière version réellement validée sur la VM KIMIA** : **V1.1.1** pour les cartes/synchronisation, plus le **bouton utilisateur afficher/masquer bandeau Home Assistant** dans Paramètres (vérifié fonctionnel sur téléphone). L'installation exacte de chaque autre élément non testée ne doit pas être présumée.
- **Ne PAS toucher au dashboard de production historique** `kimia-smart`, au Home Assistant familial personnel **VM 100**, ni aux anciens prototypes. KIMIA est sur VM **210**.
- **Prochaine action côté utilisateur** : essayer la **mise à jour du seul moteur V1.3** sur le dashboard existant, selon le guide ci-dessous ; vérifier l'effet avec les **deux enceintes de test** dans une chambre.
- **Consigne utilisateur** : procéder **pas à pas** pour les installations ; ne pas réimporter un YAML complet sur un dashboard vivant, sous peine de perdre les cartes et personnalisations.

## 2. Environnements et routes

- **VM KIMIA** : HA OS 210 (distinct de la VM personnelle 100).
- **Adresse démo externe** : `https://demo.domo-pilote.fr`.
- **Dashboard client** : `/kimia-next/accueil` ; autres vues `/kimia-next/pieces`, `/kimia-next/musique`, `/kimia-next/lumieres`, etc.
- **Configuration admin** : `/kimia-admin-next/demarrer` avec Pièces, Appareils, Inventaire, Apparence et Scénarios.
- **Ressources HA** : `/config/lovelace/resources`.
- **JS HA** : `/config/www/` (URL navigateur `/local/`).

## 3. CE QUI A ÉTÉ TESTÉ ET APPROUVÉ SUR L'INSTALLATION

1. Création, renommage et affectation de pièces via admin KIMIA.
2. Inventaire des appareils et fonctions, qu'ils soient Zigbee ou non.
3. Réaffectation et retrait d'appareils d'une pièce sans les désinstaller.
4. Synchronisation qui ajoute les cartes de pièces et les équipements reconnus.
5. Suppression d'une pièce et nettoyage de la carte « Pièce non trouvée » après synchronisation (**V1.1.1 validée sur VM**).
6. Utilisation du compte client non administrateur dans l'appli Home Assistant Android.
7. **Kiosk Mode** masque le header et la barre native HA pour le client, la navbar KIMIA en bas reste accessible.
8. **Paramètres client → afficher/masquer le bandeau Home Assistant** : fonctionnalité installée et validée ; préférence locale au téléphone/utilisateur. Admin garde son interface.
9. Identité graphique / thème existant appréciés. Le but est de préserver l'aspect actuel.

## 4. Dernier retour UX / souhaits précis

Sur capture, l'utilisateur a affecté **deux enceintes à une chambre de test** et a constaté une présentation perfectible :
- **La carte de pièce doit prendre toute la largeur disponible** dans la vue Pièces.
- **Les cartes d'équipements doivent apparaître au-dessous**, idéalement deux tuiles par rangée sur une grille de 12.
- **Ne pas répéter le nom « Chambre » au-dessus de la carte Area native**, puisqu'il est déjà inscrit dans la carte : éviter le doublon.
- Les mêmes règles de disposition s'appliquent aux catégories (Musique, Lumières, Prises, etc.).
- Les onglets KIMIA doivent garder un **bandeau de marque cohérent** ; voir le source visuel transmis et conservé.
- L'Accueil doit rester **épuré** : bandeau, plan Maquette, météo, scénarios, **pas de cartes appareils ni de pièces auto-ajoutées sur l'Accueil**.
- Ne pas remplacer les tuiles natives facilement modifiables par une grosse carte propriétaire figée.
- Ne pas casser la navbar KIMIA, le bouton Kiosk, les thèmes, ni l'admin.
- **Prochain gros essai** : coordinateur et appareils Zigbee physiques, leurs affectations et l'esthétique de chaque catégorie ; pas encore validé.

## 5. CE QUI EST PRÊT SUR GITHUB (V1.3) MAIS NON VALIDÉ SUR LA VM

**Fichiers de la branche `feat/kimia-refonte-client-20261026` :**

- `www/kimia-smart-core-v1.js` : **moteur v1.3** de mise en page/synchronisation et migration prudente de cartes standards.
- `dashboard-kimia-next-ui-import.yaml` : **modèle initial pour NOUVEAU dashboard**, même design ; exclut volontairement les appareils/pièces de démonstration.
- `docs/KIMIA_REFONTE_CLIENT_SOURCE_20261026.yaml` : **copie du YAML transmis depuis le PC**, avec cartes et pièces de test. Conserver comme référence visuelle, **ne pas importer directement en production**.
- `docs/KIMIA_REFONTE_CLIENT_V13_INSTALLATION.md` : instructions d'installation et limites.

**Comportement prévu de V1.3 :**
- Bannières KIMIA par onglet ; nom de l'onglet au centre, y compris « Accueil ».
- Vue Pièces, vues par catégories : sections pleine largeur (12/12), Area pleine largeur (12/12), tuiles équipements en dessous (6/12), pas de titre de pièce redondant.
- L'Accueil ne reçoit plus de cartes Areas auto-créées ; maquette, météo et scénarios préservés.
- Gestion des ajouts/suppressions/déplacements et idempotence ; **conservation des tuiles personnalisées manuellement**.
- Kiosk Mode / bouton affichage bandeau conservés.
- Aucun changement au dashboard historique ou aux HA personnels.

**Tests** : GitHub Actions du dernier commit de développement `dc8974205a0b40a23fa797d78534304e1729a460`, workflow `40316455109`, **success** sur données simulées. **Ce n'est pas une validation HA réelle avec appareil Zigbee.**

## 6. PROCEDURE RECOMMANDEE POUR PROCHAIN ESSAI (UNE ÉTAPE À LA FOIS)

1. **Sauvegarder impérativement** le YAML actuel de `kimia-next` (et idéalement snapshot VM HA) avant essai, pour pouvoir revenir en arrière. La V1.1.1 actuelle est appréciée de l'utilisateur.
2. Depuis la branche V1.3 ci-dessus, récupérer `www/kimia-smart-core-v1.js`.
3. **Remplacer uniquement** `/config/www/kimia-smart-core-v1.js` sur **KIMIA VM210**.
4. Dans les ressources Lovelace, **modifier l'entrée existante** vers `/local/kimia-smart-core-v1.js?v=104`. **Ne pas en ajouter un doublon**. Garder les autres ressources, notamment `kimia-header-toggle-v1-card.js`.
5. Fermer/réouvrir l'application HA ou recharger complètement le front-end.
6. Sur `/kimia-admin-next/demarrer`, compte **administrateur**, bouton **Actualiser ma maison**.
7. **Tester l'affichage** : Accueil, Pièces, Chambre avec deux enceintes, Musique, catégories ; envoyer des captures, noter les cartes personnalisées et les incohérences.
8. Vérifier le **compte non admin sur téléphone** (mode kiosque, navbar, thèmes, bouton bandeau).
9. En cas de défaut : **ne pas réimporter le YAML de modèle** pour « réparer ». Examiner l'erreur exacte et revenir si besoin au moteur V1.1.1 (copie de secours + version de ressource précédente).

**Ne pas présumer que les étapes ci-dessus ont déjà été appliquées !** À la rédaction du checkpoint, le seul moteur confirmé sur VM est la V1.1.1.

## 7. Points de vigilance / dette produit

- Tester les vrais appareils Zigbee à réception du coordinateur : association, affectation, commandes effectives et esthétique mobile/tablette.
- Tester les déplacements/retraits et la suppression de pièce **avec V1.3**, plus particulièrement l'absence de cartes orphelines et doublons.
- Ne jamais supprimer automatiquement un composant volontairement personnalisé par le client ; en cas d'ambiguïté demander validation.
- Les capteurs doivent à terme avoir un affichage dédié (température, humidité, batterie).
- Le plan Maquette (et certaines images) ainsi que `weather.forecast_lbv` sont propres à la maison démo de Libreville et devront être rendus configurables pour chaque client.
- Le mode kiosque est une **présentation UI**, pas un vrai contrôle d'accès / verrouillage de sécurité ; maintenir les rôles et restrictions HA.
- Pour les clients, pas d'exposition inutile des identifiants techniques ni YAML dans l'interface.
- Les modifications GitHub sont **distinctes** des changements effectués dans HA : toujours vérifier les deux états.
- Conserver les mises à jour dans la branche de travail et les documenter ; éviter les modifications directes sur branche stable sans validation.

## 8. Liens et prompt de reprise

- Branche de travail : https://github.com/guillaumebianchin84/kimia-smart-dashboard/tree/feat/kimia-refonte-client-20261026
- Guide V1.3 : https://github.com/guillaumebianchin84/kimia-smart-dashboard/blob/feat/kimia-refonte-client-20261026/docs/KIMIA_REFONTE_CLIENT_V13_INSTALLATION.md
- Modèle client : https://github.com/guillaumebianchin84/kimia-smart-dashboard/blob/feat/kimia-refonte-client-20261026/dashboard-kimia-next-ui-import.yaml
- Référence graphique source PC : https://github.com/guillaumebianchin84/kimia-smart-dashboard/blob/feat/kimia-refonte-client-20261026/docs/KIMIA_REFONTE_CLIENT_SOURCE_20261026.yaml
- Moteur V1.3 : https://github.com/guillaumebianchin84/kimia-smart-dashboard/blob/feat/kimia-refonte-client-20261026/www/kimia-smart-core-v1.js
- Vérification CI préalable : https://github.com/guillaumebianchin84/kimia-smart-dashboard/actions/runs/40316455109

**Texte à coller au début d'une nouvelle discussion :**

> On reprend KIMIA Smart by PROMAINT. Lis d'abord le fichier `REPRISE_KIMIA_20261026.md` à la racine de la branche `feat/kimia-refonte-client-20261026` dans mon dépôt `guillaumebianchin84/kimia-smart-dashboard`, puis le guide V1.3. La V1.1.1 fonctionne sur HA KIMIA VM210, mais la V1.3 n'est pas encore testée sur la VM. On avance étape par étape sans remplacer le YAML du dashboard vivant. Notre prochain test est le moteur V1.3 avec les deux enceintes de la chambre.

**Checkpoint :** ce document décrit un état à date, pas une migration déjà réalisée.
