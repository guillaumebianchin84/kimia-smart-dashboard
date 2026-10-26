# KIMIA Smart V1.6.2 — CORRECTIF ciblé sans régression
26 octobre 2026 — Branche `fix/kimia-v162-admin-header-20261026`.

## Objet
Corriger deux régressions constatées sur KIMIA V1.6.1 sur VM210 **sans réimportation des dashboards**.

### 1. Compte administrateur — interface Home Assistant visible
L'ancienne migration V1.6.1 installait `kiosk_mode.kiosk` **à la racine** : la valeur était appliquée aux administrateurs aussi, cachant leur menu.
- Le moteur V1.6.2 retire le mode global **uniquement** s'il porte la signature historique KIMIA (`kimia_bandeau_ha_` + `localStorage.getItem`).
- Il replace le réglage dans `kiosk_mode.non_admin_settings.kiosk`, avec retour booléen explicite.
- Il ne touche pas aux autres paramètres Kiosk personnalisés.
- Le bouton d'affichage du bandeau redevient **non-admin seulement** ; pour l'admin, le bandeau HA reste toujours visible. Pour les utilisateurs standards, il est réversible et le bouton recharge la page courante, sans redirection vers une autre origine.
- La sauvegarde / migration s'effectue lorsque l'administrateur clique sur **Actualiser ma maison**. **La mise à jour du fichier JS seule ne peut pas changer un dashboard déjà enregistré.**

### 2. Thèmes — retrouver le design d'origine sans changement global
- Le module `kimia-local-theme-v16-card.js` conserve les huit thèmes historiques : Gris Premium, Clair, Sombre, Signature, Vert Sauge, Violet Nuit, Sable Doré, Terracotta.
- Les boutons V1.6.1 sans icônes sont remplacés par de grandes tuiles affichant les icônes Material Design **comme les boutons KIMIA d'origine**, avec leurs couleurs caractéristiques et indication de sélection. Retour « Thème HA par défaut » conservé.
- Le fonctionnement local est préservé : l'utilisateur et le navigateur choisissent leur thème grâce à localStorage/CSS, **sans aucun appel à `frontend.set_theme`**.
- Le package `packages/kimia_client_theme.yaml` de V1.6.1 **reste inchangé** : il a déjà supprimé l'automatisation qui modifiait le thème global.

### 3. Ce qui ne change pas
Éditeur V1.6 Scénarios/Automatisations, Pièces, Utilisateurs, Carte, Listes, présentation du dashboard, navigation KIMIA, autres ressources et packages. Aucun grand dashboard YAML ne doit être importé.

## Installation sur VM210 (si V1.6.1 déjà installé)
1. Préférer une sauvegarde VM210 et une copie du YAML brut de `kimia-next`.
2. Depuis le pack V1.6.2 GitHub Actions, remplacer **seulement** les trois fichiers dans `/config/www/` :
   - `kimia-smart-core-v1.js`
   - `kimia-header-toggle-v1-card.js`
   - `kimia-local-theme-v16-card.js`
   Rien à modifier dans `/config/packages/` si le package de thèmes **V1.6.1** est déjà présent.
3. Dans Ressources Lovelace, changer les trois entrées existantes (Module JavaScript) vers :
   - `/local/kimia-smart-core-v1.js?v=162`
   - `/local/kimia-header-toggle-v1-card.js?v=162`
   - `/local/kimia-local-theme-v16-card.js?v=162`
   Ne pas ajouter d'entrées en double ni modifier les deux modules V1.6 de l'éditeur.
4. Recharge complète navigateur, puis **KIMIA Configuration → Démarrer → Actualiser ma maison**. C'est l'opération nécessaire à la migration de `kiosk_mode` enregistré.
5. Dans le code brut du dashboard `kimia-next`, vérifier :
   ```yaml
   kiosk_mode:
     non_admin_settings:
       kiosk: >-
         [[[ return window.localStorage.getItem("kimia_bandeau_ha_" + user_name) !== "visible"; ]]]
   ```
   Il **ne doit plus y avoir de `kiosk:` à la racine de `kiosk_mode`**.
6. Tester admin sur PC : onglets/bandeau HA visibles ; tester un compte standard sur téléphone : bandeau masqué puis affiché via KIMIA, toujours sur la même adresse. Sur deux appareils simultanés : Gris Premium sur A et Sable Doré sur B, les couleurs ne doivent pas se synchroniser.
7. Vérifier les raccourcis, scripts, cartes/listes et thèmes, et relancer la synchro une seconde fois : aucun changement ni doublon attendu.

## Dépannage (uniquement si les onglets restent cachés)
L'éditeur Kiosk Mode documente `?disable_km` dans l'URL du dashboard :
`https://demo.domo-pilote.fr/kimia-next/accueil?disable_km`
Cela désactive temporairement Kiosk Mode sur ce navigateur et permet d'ouvrir le code brut.
Si une configuration Kiosk personnalisée empêche la migration (par exemple un autre `kiosk` global non reconnu), ne pas l'écraser automatiquement : la revoir manuellement.

## Vérifications
Tests Node.js pour le bandeau et les tuiles : état local, admin, non-admin, deux navigateurs, huit icônes, désactivation de l'ancienne API globale ; migration depuis la mauvaise configuration globale V1.6.1 et cohérence YAML ; tous les anciens tests KIMIA (V1.3–V1.6).
**Validation CI ne remplace pas les vérifications visuelles sur VM210.**
