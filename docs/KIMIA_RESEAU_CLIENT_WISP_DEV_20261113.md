# KIMIA Smart — Réseau client (DEV)

Date : 13 novembre 2026. Branche : `feat/kimia-admin-ai-assistant-20261111`.

## Fonction
Sous-page **Paramètres → Réseau** du dashboard `kimia-next` (route `/kimia-next/reglages-reseau`).

- IP locale Home Assistant : découverte depuis l'entité `sensor.kimia_ha_ip`, `sensor.local_ip`, `sensor.home_assistant_ip`, ou l'URL interne HA / URL locale de la page. Si non connue, affichage « IP locale indisponible ». **Ne pas confondre IP du tunnel Cloudflare et IP locale.**
- Clé Zigbee SLZB : recherche des capteurs IP contenant « slzb », possibilité de renseigner `zigbee_ip_entity` ou `zigbee_ip`; liaison USB signalée si identifiable.
- SSID WISP courant : capteur `WISP SSID` fourni par Cudy Router, si disponible.
- Changement du Wi-Fi **Internet WISP seulement** : scan, choix SSID, mot de passe masqué, confirmation, connexion. Le mot de passe est envoyé à l'entité Home Assistant `text.*_wisp_password` (écriture seule, en mémoire dans l'intégration Cudy), jamais enregistré dans le code KIMIA.
- Aucun changement du SSID / mot de passe Wi-Fi local du Cudy, du DHCP ni des équipements Zigbee.
- Aucun changement de style, format ou taille des cartes équipements client.

## Installation sur HA DEV uniquement

1. Vérifier que **Cudy Router** est installé et expose : `WISP scan`, `WISP network`, `WISP password`, `WISP connect`. Tester **Scan**, sans lancer une connexion lors de cette étape.
2. Sauvegarder la configuration DEV existante. Copier seulement les fichiers GitHub suivants :
   - `www/kimia-smart-core-v1.js` → `/config/www/kimia-smart-core-v1.js` (remplacer le moteur DEV après sauvegarde).
   - `www/kimia-client-network-v1-card.js` → `/config/www/kimia-client-network-v1-card.js`.
3. Dans les ressources Lovelace, ajouter **une seule fois** `/local/kimia-client-network-v1-card.js?v=1` en **module JavaScript**. Actualiser le cache du moteur `kimia-smart-core-v1.js` existant avec un paramètre `?v=` nouveau, sans créer de doublon.
4. Recharger la page HA. Dans le dashboard **admin KIMIA**, lancer la **synchronisation KIMIA** habituelle. Elle ajoute uniquement la sous-vue et le raccourci « Réseau » au portail Paramètres existant. **Ne pas réimporter intégralement le dashboard client.**
5. Ouvrir `/kimia-next/parametres` puis « Réseau ». Vérifier les IP. Si elles sont indisponibles, ne pas inventer d'adresse : renseigner une entité IP disponible dans la carte ou configurer `ha_ip`/`zigbee_ip` après avoir identifié leur valeur locale réelle.
6. Tester recherche et choix du Wi-Fi, puis, lorsque le test est autorisé, essayer la connexion WISP avec un réseau de test en conservant l'accès local KIMIA.

## Liaison manuelle en cas de noms d'entité modifiés

La carte tente de découvrir les quatre entités Cudy à partir de leur domaine et de leur nom. Si plusieurs Cudy sont présents, préciser les entités exactes dans la configuration de la carte :

```yaml
type: custom:kimia-client-network-v1-card
wisp_scan_entity: button.NOM_REEL_WISP_SCAN
wisp_network_entity: select.NOM_REEL_WISP_NETWORK
wisp_password_entity: text.NOM_REEL_WISP_PASSWORD
wisp_connect_entity: button.NOM_REEL_WISP_CONNECT
wisp_ssid_entity: sensor.NOM_REEL_WISP_SSID
```

## Droits — limite à connaître

Le portail réutilise le **réglage existant** `input_boolean.kimia_onglet_parametres`. Lorsque celui-ci est éteint, les commandes réseau de la carte sont désactivées pour les comptes non administrateurs. Les administrateurs conservent l'accès.

**Important :** ce réglage est un `input_boolean` partagé dans Home Assistant, et non une autorisation réseau individuelle appliquée par le serveur. Le masquage des menus KIMIA et le filtrage JavaScript n'empêchent pas un utilisateur HA qui dispose des droits API nécessaires d'appeler directement les services WISP. La gestion actuelle des profils KIMIA masque les pièces par compte mais ne définit pas une permission serveur WISP par utilisateur.

Avant de promettre une restriction sécurisée par personne à un client final, il faudra une vérification ou un contrôle d'accès côté serveur relié à une véritable permission individuelle.

## Vérifications

- Tests de l'ancien portail Paramètres : `node tests/kimia_v15_settings.test.cjs`.
- Tests réseau isolés : `node tests/kimia_client_network_v1.test.cjs`.
- Les tests ne prouvent ni l'accès au Cudy physique, ni l'étanchéité des droits HA : tests sur les vrais comptes DEV indispensables.
