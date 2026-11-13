# KIMIA — Liste réelle des appareils Cudy (DEV)

## Objectif

Afficher dans **KIMIA client → Paramètres → Réseau** les **appareils
connus par la liste active du routeur Cudy**, sans les reconstruire à partir
des entités HA individuellement.

L'intégration communautaire \`ha-cudy-router\` conserve les appareils dans
\`hass.data["cudy_router"][entry_id].data["devices"]["device_list"]\`.
Chaque entrée comprend, lorsque le Cudy les fournit :
\`hostname\`, \`ip\`, \`mac\`, \`connection_type\`.

Une simple carte JavaScript Home Assistant ne peut pas consulter directement
\`hass.data\` côté serveur. Le composant KIMIA
\`kimia_cudy_clients\` ajoute **une commande WebSocket strictement en lecture
seule** \`kimia_cudy_clients/list\`, qui renvoie ces quatre champs sanitizés.
Il n'utilise pas les identifiants du Cudy, ne change pas le routeur et ne
fournit aucune action d'écriture.

## Installation sur l'ODROID de test

**Ne pas installer sur le Home Assistant personnel. Sauvegarder l'ODROID
avant intervention.**

1. Vérifier que l'intégration **Cudy Router** fonctionne déjà dans l'ODROID :
   le WISP actuel apparaît dans KIMIA.
2. Dans File Editor, créer **exactement** le dossier
   \`/config/custom_components/kimia_cudy_clients/\`.
3. Y copier les **deux fichiers** du dépôt :
   - \`custom_components/kimia_cudy_clients/__init__.py\`
   - \`custom_components/kimia_cudy_clients/manifest.json\`
4. Dans \`/config/configuration.yaml\`, ajouter une seule fois au niveau racine :

   \`\`\`yaml
   kimia_cudy_clients:
   \`\`\`

5. Vérifier la configuration Home Assistant, puis redémarrer **Home Assistant
   Core** (pas de réinitialisation du routeur).
6. Remplacer **uniquement**
   \`/config/www/kimia-client-network-v1-card.js\` par le fichier GitHub
   correspondant, et modifier sa ressource Lovelace **existante** en remplaçant
   \`?v=4\` par \`?v=5\` (ne pas ajouter un doublon).
7. Dans **Paramètres → Réseau**, appuyer sur **Actualiser les appareils**.
   Les appareils détectés par le Cudy devraient apparaître avec nom, IP,
   MAC et type de liaison.

Ne réimporter **aucun** dashboard client. La partie WISP est conservée.

## Données disponibles et limites

- L'inventaire reflète **la dernière collecte Cudy par l'intégration**,
  pas un scan réseau effectué dans le navigateur. Une erreur de rafraîchissement
  est signalée. L'action Actualiser affiche le cache courant ; elle n'impose
  pas à elle seule un nouveau scan réseau au Cudy.
- Contrairement à l'ancienne version, il n'est **pas nécessaire** que Cudy
  crée une entité HA par appareil : l'inventaire lit directement
  \`device_list\` du coordinateur. On peut donc obtenir nom, IP et MAC même
  si l'option d'ajout automatique d'entités est désactivée.
- Si le Cudy annonce des clients mais retourne une liste vide, vérifier
  **Paramètres → Appareils et services → Cudy Router** et la version de
  l'intégration : certains firmwares peuvent présenter une page non
  analysée par le parseur. Le module KIMIA ne prétend pas les détecter
  autrement.
- Les champs \`ip_assignment\` des **autres** appareils sont volontairement
  \`unknown\` : la table de clients ne prouve pas DHCP, IP statique locale
  ou réservation DHCP du routeur. Sur l'ODROID HA, le mode IP est identifié
  indépendamment via l'API réseau de HA OS.
- Une adresse Zigbee connue dans le registre HA mais absente de la liste
  Cudy est « IP enregistrée, connexion non vérifiée », **pas connectée**.
- La liste est plafonnée à 300 appareils et ne renvoie aucune clé de
  connexion, aucun mot de passe et aucun paramètre d'administration Cudy.
- Une connexion Wi-Fi client KIMIA reste une opération distincte : la
  carte conserve \`WISP scan/network/password/connect\`.

## Contrôle d'accès — limite importante

Le serveur bloque la commande si l'interrupteur existant
\`input_boolean.kimia_onglet_parametres\` est désactivé, sauf pour les admins HA.
**Cette bascule KIMIA est globale : elle ne constitue pas une autorisation
individuelle sécurisée**. Un utilisateur pouvant appeler les services HA
directement peut potentiellement la réactiver. Avant vente avec des droits
par personne, ajouter un contrôle serveur réellement individualisé.

## Tests après installation

- Ouvrir le panneau Cudy natif et relever **nom, IP et MAC** des clients ;
  comparer à KIMIA. Ne pas déduire l'identité depuis un compteur seul.
- Débrancher un appareil de test, attendre l'actualisation du Cudy, puis
  vérifier sa disparition de la liste.
- Tester un utilisateur standard avec accès Paramètres activé, puis
  désactivé ; vérifier le filtrage dans KIMIA.
- Ne pas modifier le Wi-Fi WISP pendant le contrôle de l'inventaire.
