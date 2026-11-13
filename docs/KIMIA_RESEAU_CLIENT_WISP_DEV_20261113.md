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

## Inventaire des appareils connectés

La page Réseau comprend maintenant **Appareils connectés au Cudy** (nom + IP), en lecture seule. Lorsque le registre des entités est accessible à un administrateur HA, la carte ne sélectionne que les capteurs IP de la plateforme `cudy_router` associés aux clients du routeur. Les clients déconnectés, dont le capteur indique `unavailable`, ne sont pas présentés comme connectés.

**Important pour afficher tous les clients :** dans **Paramètres → Appareils et services → Cudy Router → Configurer**, activer **Automatically add connected devices / Ajouter automatiquement les appareils connectés** (désactivé par défaut dans l'intégration). Sinon, Home Assistant peut ne disposer que du compteur d'appareils et ne pas connaître les IP individuelles.

Pour les comptes Home Assistant non-administrateurs sans accès au registre, un repli indicatif peut reconnaître des capteurs dont le nom se termine par « IP address ». L'interface prévient alors que la liste n'est **pas certifiée exhaustive**. Un futur contrôle serveur KIMIA sera nécessaire pour un inventaire fiable et un accès par utilisateur sécurisé.

L'IP locale Home Assistant est tentée via la lecture seule `supervisor/api /network/info` sur les comptes administrateurs, avec priorité à l'interface principale et aux adresses LAN privées. Pour les autres comptes, la carte conserve ses sources `ha_ip` / `ha_ip_entity`, capteurs existants ou URL interne si elle contient déjà une IP. Aucune IP fixe n'est inventée ni intégrée au code. Avec Cloudflare, l'URL publique seule ne permet pas de retrouver automatiquement l'IP locale.

**Clé Zigbee :** lorsqu'elle n'est pas connectée en Ethernet et qu'aucune IP fiable n'est détectée, afficher « Non détectée sur le réseau ». Elle apparaîtra aussi dans l'inventaire Cudy si la connexion Ethernet est établie et que l'intégration remonte son IP.

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
