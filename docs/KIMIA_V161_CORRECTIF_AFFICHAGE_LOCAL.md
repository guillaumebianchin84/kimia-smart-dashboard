# KIMIA V1.6.1 — Correctif thèmes et bandeau par appareil
Date : 26 octobre 2026
Statut : branche de correctif `fix/kimia-v16-affichage-local-20261026`. **Pas déployée automatiquement sur VM 210.**

## Bugs et causes confirmés dans le dépôt
1. Les huit boutons Mes thèmes utilisaient `input_select.select_option` sur `input_select.kimia_theme_global`. Une automatisation dans `packages/kimia_client_theme.yaml` appelait `frontend.set_theme`, qui change le thème HA **global**. C'était explicitement le mécanisme historique depuis les 8 thèmes V1.4 et non une régression introduite par l'éditeur V1.6.
2. La carte Bandeau HA écrivait une préférence localStorage mais appelait `location.assign("/kimia-next/parametres")`, c'est-à-dire une navigation complète vers un chemin absolu et non un simple rechargement de l'adresse active. La carte interdisait en outre la bascule aux administrateurs. L'ancien modèle Kiosk plaçait l'expression seulement sous `non_admin_settings` et sans `return` explicite.

## Modifications
- Carte `custom:kimia-local-theme-v16-card` proposant les **8 thèmes KIMIA** + « Thème HA par défaut ». Le choix est enregistré dans le **localStorage du navigateur** sous une clé comprenant l'identifiant HA, non dans le profil ou une entité serveur. Le navigateur ajoute une feuille CSS locale avec les variables fournies par `hass.themes.themes`, sans commande `frontend.set_theme`. L'écran ne modifie pas les autres navigateurs, appareils ou comptes. Le rendu doit être validé sur Android et desktop, notamment les thèmes sombres seuls, la persistance après navigation et la compatibilité des cartes HACS.
- Le moteur de synchronisation remplace uniquement les **boutons standards** `Mes thèmes` appelant le helper global, et l'ancienne carte `Mon ambiance actuelle` de cette même section ; il conserve les autres cartes de l'écran. Il ajoute le sélecteur KIMIA local et ne refait ni dashboard, ni sections externes.
- Le package `kimia_client_theme.yaml` garde `input_select.kimia_theme_global` pour les anciens usages, **mais retire l'automatisation globale `kimia_appliquer_theme_global`**. Ce changement exige vérification YAML puis redémarrage de Home Assistant VM210. Il ne rétablit pas automatiquement le thème HA global précédemment choisi. Si souhaité, l'administrateur peut sélectionner `default` manuellement via les actions HA **une seule fois**, en sachant que cela modifie le défaut de toute l'installation.
- Le bouton HA utilise maintenant `location.reload()` (même origine, même chemin et paramètres) ; il n'ouvre plus un autre serveur. La carte ne bloque plus les administrateurs. La configuration Kiosk standard est migrée vers `kiosk: '[[[ return window.localStorage... ]]]'` pour tous les profils. Une personnalisation Kiosk non standard n'est pas écrasée.
- Testé automatiquement en simulation avec les anciennes suites KIMIA. **À vérifier réellement sur VM210** : Kiosk Mode installé en version compatible avec HA (depuis HA 2026.10.1, version Kiosk Mode 15+ recommandée par son éditeur) ; état de `kiosk_mode` dans la config storage ; thèmes chargés côté navigateur.

## Installation sur VM 210 exclusivement
**Avant :** ne pas relancer un ancien package YAML ou une importation complète de dashboards. Utiliser le nouveau pack GitHub Actions après réussite de tous les tests.

1. Remplacer dans `/config/www/` :
   - `kimia-smart-core-v1.js`
   - `kimia-header-toggle-v1-card.js`
2. Ajouter dans `/config/www/` :
   - `kimia-local-theme-v16-card.js`
3. Remplacer dans `/config/packages/` :
   - `kimia_client_theme.yaml` (ce n'est **pas** `kimia_admin_navigation.yaml`).
4. Vérifier la configuration Home Assistant, puis redémarrer **VM210 uniquement**, pour supprimer l'automatisation globale. Vérifier dans Automatisations que l'ancienne automatisation « KIMIA - Appliquer le thème client » n'est plus active.
5. Dans **Ressources** Lovelace, modifier les URL existantes, sans doublons :
   - `/local/kimia-smart-core-v1.js?v=161` (Module JavaScript)
   - `/local/kimia-header-toggle-v1-card.js?v=161` (Module JavaScript)
   Et ajouter `/local/kimia-local-theme-v16-card.js?v=161` (Module JavaScript). Conserver `?v=160` pour les deux modules d'automatisation ainsi que `?v=151` pour Carte/Listes et Utilisateurs.
6. Actualiser entièrement le navigateur (Ctrl+F5), puis dans **KIMIA Configuration → Démarrer**, cliquer **Actualiser ma maison** pour migrer *uniquement* les commandes standards et la configuration Kiosk. **Ne pas réimporter** `dashboard-kimia-next-ui-import.yaml` dans le dashboard réel.
7. Tester depuis deux appareils : choisir Gris Premium sur A ; B ne doit pas changer. Choisir Clair sur B ; A ne doit pas changer. Sur A, afficher puis masquer le bandeau : même origine et même page après rechargement, B inchangé. Tester également sur compte administrateur. Test de persistance après fermeture/réouverture de la session navigateur.
8. En cas de dysfonctionnement Kiosk, les versions récentes de Kiosk Mode proposent la sortie temporaire `?disable_km` ajoutée à l'URL existante, **uniquement pour le dépannage**. Cela ne change pas le thème global ni les comptes.

## Notes
- L'ancien helper `input_select.kimia_theme_global` peut rester renseigné à l'ancienne valeur, sans effet tant que rien d'autre ne l'utilise pour appeler `frontend.set_theme`.
- Certaines cartes tierces ne suivent pas forcément toutes les variables CSS et peuvent nécessiter un correctif séparé. Ne pas inventer un test VM si seuls les tests GitHub ont été exécutés.
- Le stockage local au navigateur peut être effacé lors d'une suppression des données de site. La configuration du navigateur/app HA et son origine (locale/HTTPS) déterminent le périmètre de stockage ; une adresse HTTPS et une adresse IP locale ont **deux stockages différents**, même sur le même téléphone.
- Le bandeau KIMIA est distinct du header natif HA. Le bouton Kiosk agit uniquement sur le header/sidebar natifs.
