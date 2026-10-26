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
