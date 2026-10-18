# KIMIA Smart — Administration avec trois onglets (v0.2)

## Nouveautés

1. **Navigation** : inchangé, les huit interrupteurs pour masquer les boutons Navbar KIMIA.
2. **Pièces** : simplification. Créer une véritable Zone Home Assistant avec **le nom de la pièce uniquement**. Les étages et les choix d'icônes sont supprimés du formulaire. Renommer une pièce et associer un appareil déjà installé reste possible. Les étages éventuellement existants dans Home Assistant ne sont **pas** effacés ni modifiés.
3. **Zigbee** : nouvelle carte native KIMIA pour ouvrir l'appairage **ZHA** pendant 60 secondes, lister les appareils enregistrés, les nommer et les rattacher à une pièce. Compatible avec les appareils SONOFF et LEDVANCE **Zigbee pris en charge par ZHA**, si le coordinateur Zigbee est installé. Aucune configuration ou appairage ne démarre automatiquement.

L'accueil et les neuf vues du dashboard **KIMIA Smart public** restent inchangés.

## Installer sur Home Assistant (VM de test)

**1. Mettre à jour la carte Pièces**

- Télécharger **en Raw**, directement depuis GitHub, `www/kimia-room-manager-card.js`.
- Remplacer l'ancien fichier dans `/config/www/kimia-room-manager-card.js`.
- Ne pas garder de suffixe `-2.js` ou `.txt`. Vérifier le nom exact avec File Editor.
- Dans les ressources du dashboard HA, modifier l'URL précédente en **`/local/kimia-room-manager-card.js?v=2`** (type **Module JavaScript**), pour forcer le rechargement du nouveau code.

**2. Installer la nouvelle carte Zigbee**

- Télécharger **en Raw** `www/kimia-zigbee-manager-card.js` depuis GitHub.
- La placer dans `/config/www/kimia-zigbee-manager-card.js`.
- Dans **Paramètres → Tableaux de bord → Ressources**, ajouter :
  - **URL :** `/local/kimia-zigbee-manager-card.js?v=1`
  - **Type :** Module JavaScript.
- Tester chaque URL `/local/...` dans le navigateur : elle doit afficher du JavaScript et **pas** « Introuvable ».

**3. Mettre à jour uniquement le dashboard KIMIA Administration**

- Sauvegarder le YAML actuel du dashboard Administration.
- Remplacer sa configuration brute par **`kimia-admin-ui-import.yaml`**.
- Actualiser entièrement la page, puis ouvrir successivement **Pièces** et **Zigbee**.
- Ne pas importer ce fichier dans le dashboard utilisateur KIMIA Smart.

## Utilisation

### Pièces

- Saisir « Salon » et appuyer sur **Ajouter la pièce** ; elle est créée dans le registre Home Assistant.
- Sélectionner une pièce pour la renommer ou y affecter un appareil déjà installé.
- Vérifier dans **Paramètres → Zones** si nécessaire.

### Zigbee

- Installer/configurer l'intégration **Zigbee Home Automation (ZHA)** dans Home Assistant avec le coordinateur **SMLIGHT SLZB-06U**, connecté au réseau local. **Sans ZHA fonctionnel, la carte affiche « ZHA indisponible » et le bouton de recherche est désactivé.**
- Alimenter la prise SONOFF ou l'ampoule LEDVANCE **Zigbee**, lancer **Lancer la recherche (60 s)** puis mettre l'appareil en mode appairage selon sa notice.
- Home Assistant utilise l'action officielle **`zha.permit`**. La recherche est limitée à 60 s ; le navigateur actualise périodiquement la liste des appareils détectés.
- Sélectionner un appareil Zigbee listé, saisir son nom d'usage et choisir sa pièce, puis enregistrer.
- Pour les modèles non Zigbee et les équipements Wi-Fi, utiliser les intégrations Home Assistant classiques.

## Limites et sécurité

- Les deux cartes utilisent les API WebSocket et l'authentification Home Assistant du compte actif, **sans jeton ajouté**. Les opérations de configuration exigent un compte administrateur.
- Pas de création automatique de cartes dans le dashboard KIMIA client, ni de modification automatique du plan Maquette de l'Accueil.
- Pas de suppression d'appareils ni de pièces depuis ces cartes.
- Pour certains modèles, le jumelage Zigbee peut demander une procédure spécifique ou un code d'installation, non pris en charge dans cette interface v0.1. Ouvrir la configuration native ZHA si nécessaire.
- Le démarrage de l'appairage depuis KIMIA n'est possible que si **ZHA et le coordinateur** sont fonctionnels. Le test réel ne peut être effectué qu'avec ce matériel sur la VM.
- **Validation de syntaxe JavaScript effectuée sur GitHub. Pas encore de validation fonctionnelle réelle sur la VM.**

## Fichiers

- `kimia-admin-ui-import.yaml`
- `www/kimia-room-manager-card.js` (v0.2)
- `www/kimia-zigbee-manager-card.js` (v0.1)
- `docs/KIMIA_ADMIN_PIECES_ZIGBEE_V02.md`

Sources techniques officielles :
- https://www.home-assistant.io/actions/zha.permit/
- https://www.home-assistant.io/integrations/zha/
- https://github.com/home-assistant/core/blob/dev/homeassistant/components/zha/websocket_api.py
