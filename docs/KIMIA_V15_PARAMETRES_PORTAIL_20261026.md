# KIMIA Smart — Paramètres V1.5 : refonte non destructive
26 octobre 2026. Branche de développement feat/kimia-v15-profils-utilisateurs-20261026.

## Exigence de compatibilité
La V1.4 fonctionne sur la VM 210. Aucune modification n'a été déployée sur cette VM. Le plan Maquette, les restrictions réelles par pièce et les composants personnels HA ne sont pas touchés.

## Réalisation
Le moteur KimiaSmartCore.sync modifie uniquement les dashboards storage KIMIA. Dans le dashboard client kimia-next :
- Ajout de cinq raccourcis dans Paramètres, juste après le bandeau existant : Utilisateurs, Affichage, Zones et carte, Mes listes et Apparence.
- Création de cinq sous-vues dédiées : reglages-utilisateurs, reglages-affichage, reglages-localisation, reglages-listes et reglages-apparence. Chaque sous-vue conserve le bandeau KIMIA, la navbar existante et possède un bouton Retour aux paramètres. Le paramètre subview:true empêche l'ajout de cinq onglets dans la navigation HA.
- Déplacement, sans réécriture ni conversion, des sections déjà présentes Affichage de l'application (bouton bandeau HA) et Mes thèmes (boutons existants et input_select du thème) dans leurs nouvelles sous-vues. Les cartes et leurs options/couleurs sont inchangées. Tout contenu personnalisé non reconnu reste en place dans Paramètres.
- Les pages existantes et les réglages sont préservés, ainsi que les cartes Accueil, Maquette, météo, scénarios, les autres onglets et la navbar.
- Zones et carte : ouvrir la carte KIMIA existante, accéder aux réglages de positions dans l'administration et ouvrir le gestionnaire de zones HA via /config/zone (nécessite les droits HA). Le créateur KIMIA de zones sur carte n'est pas encore réalisé.
- Mes listes : accès à la liste existante. L'affichage simultané de trois listes To-do n'est pas encore réalisé.
- Utilisateurs : accès à la configuration admin des pièces par compte ; ce choix n'est qu'un masquage visuel, pas un contrôle d'accès.

## Fonctionnement / limites
- Idempotence : pas de subview ou de bouton en double lors des synchronisations répétées.
- La fonction qui masque/affiche le bandeau HA reste inchangée. Après le basculement, elle redirige toujours vers Paramètres ; c'est normal.
- Si une section a été renommée manuellement, elle reste dans Paramètres au lieu d'être déplacée au risque d'altérer une carte personnalisée.
- L'édition réelle de zones dans KIMIA, les cases à cocher des positions sur la carte, les trois listes verticales et le réglage par compte des onglets sont des évolutions ultérieures.
- La VM 100 et le dashboard historique kimia-smart restent exclus.

## Vérifications avant installation
1. Tests GitHub Actions : compatibilité V1.3/V1.4, profils V1.5 et tests supplémentaires du portail.
2. Sauvegarder le YAML du dashboard client et VM210 avant installation.
3. Mettre à jour le moteur JS et son cache côté HA dans une étape explicite ; installer la ressource JS du module Utilisateurs avant la synchro si elle n'est pas déjà installée.
4. Depuis l'administration, utiliser Actualiser ma maison ; vérifier les cinq raccourcis et sous-vues, le bouton Retour, les thèmes et l'affichage du bandeau HA depuis un compte non-admin.
5. Répéter la synchro : zéro doublon et aucune écriture supplémentaire attendue.
6. Si anomalie, restaurer le moteur/YAML précédents ; ne pas réimporter un modèle complet sur le dashboard vivant.

Tests spécifiques : tests/kimia_v15_settings.test.cjs

## Revue UX du 26 octobre — quatre corrections intégrées

1. **Carte :** le menu admin Carte et listes utilise désormais des cases à cocher explicites pour zones, personnes et trackers, limitées à 15 positions, avec suivi personnel désactivé par défaut.
2. **Listes :** création réelle de listes `Local to-do` depuis l'administration KIMIA via le flux officiel HA. Affichage des listes sélectionnées dans `kimia-next/listes`, **3 cartes `todo-list` maximum**, l'une sous l'autre (option B). Les anciennes listes et les tâches sont conservées. Une carte Todo personnalisée non reconnue bloque un retrait automatique pour éviter toute perte de présentation. Renommer/supprimer une intégration reste accessible depuis HA, non automatisé dans ce lot.
3. **Utilisateurs :** ajout d'un récapitulatif des pièces visibles/masquées **enregistrées** pour le compte sélectionné, distinct des cases modifiées non enregistrées. Formulaire `Créer un utilisateur` : nom, identifiant, mot de passe, groupe standard HA `system-users`. Création via `config/auth/create` puis `config/auth_provider/homeassistant/create`, réservée admin. Si les identifiants échouent après création du compte, KIMIA explique de terminer dans la gestion HA, sans supprimer automatiquement le compte. La préférence de visibilité peut être attribuée ensuite.
4. **Pièces :** ajout de `input_boolean.kimia_onglet_pieces` dans la configuration de navigation, initialisation **une seule fois**, tuile Pièces en Apparence et route Pièces dans toutes les navbars, immédiatement après Accueil. Les liens directs existants restent disponibles même quand l'icône est masquée.

## Déploiement correctif (version cache 151)
- Ne pas réimporter les grands YAML client/admin : synchronisation additive.
- Remplacer trois JS dans `/config/www/` : `kimia-smart-core-v1.js`, `kimia-services-v14-card.js`, `kimia-user-visibility-v15-card.js`.
- Mettre à jour `/config/packages/kimia_admin_navigation.yaml` avec la version du dépôt. **Vérifier la configuration et redémarrer la VM HA KIMIA 210** pour déclarer les nouveaux helpers (`input_boolean.kimia_onglet_pieces`, `...pieces_initialise`) ; l'automatisation active Pièces une seule fois.
- Modifier les **ressources existantes** pour leurs URL `/local/kimia-smart-core-v1.js?v=151`, `/local/kimia-services-v14-card.js?v=151`, `/local/kimia-user-visibility-v15-card.js?v=151` (type Module JavaScript). Ne pas dupliquer les entrées.
- Recharge complète navigateur. Dans KIMIA Configuration → Démarrer, cliquer `Actualiser ma maison` une fois. Vérifier Pièces dans la navbar et dans Apparence, puis le sélecteur Carte/Listes et le module Utilisateurs.
- Contrôles de non-régression : Accueil, Maquette, thèmes, bouton bandeau HA, navbar mobile/tablette, appareil affecté à pièce, scénarios ; répéter la synchronisation et vérifier l'absence de doublons.
- Pack GitHub Actions nommé `KIMIA-V15-Revue-Corrections` (3 JS + YAML navigation + guide). GitHub n'installe rien automatiquement dans la VM.

## Limites et prudence
- Un compte nouvellement créé obtient le groupe standard, **pas** des permissions HA strictes par pièce. Le masquage KIMIA reste visuel uniquement.
- Pour la création de listes, l'intégration `Local to-do` doit être disponible et l'authentification administrateur appropriée. Une liste créée peut apparaître après un court délai : le bouton `Actualiser les listes` permet de rafraîchir les choix.
- La création des zones géographiques sur la carte directement dans KIMIA, l'édition de listes et le filtrage de la Maquette par compte restent reportés.
- Tests CI en simulation : ils ne prouvent pas encore l'ergonomie ou toutes les permissions de la VM 210 réelle.
