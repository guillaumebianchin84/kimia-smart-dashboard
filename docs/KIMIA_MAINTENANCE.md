# Maintenance du système KIMIA

Ouvrir **Paramètres client → Paramètres avancés → Maintenance du système**.
Le code des paramètres déverrouille la page pour dix minutes d’inactivité.
Les comptes Home Assistant standard peuvent utiliser les deux commandes de
maintenance depuis KIMIA. Chaque commande demande une confirmation. Le serveur
applique un délai de 90 secondes entre deux commandes, y compris après un
redémarrage de Home Assistant. Les commandes KIMIA passent par le WebSocket
des paramètres et sont absentes des outils Assist et Gemini.

- **Redémarrer Home Assistant** appelle `homeassistant.restart`. Seul Home
  Assistant redémarre. La page se reconnecte automatiquement et redemande
  le code quand la nouvelle instance est prête.
- **Redémarrer Zigbee** appelle le bouton officiel de la puce Zigbee de la
  SLZB-06U via `button.press`. KIMIA retrouve ce bouton dans le registre
  même si son identifiant d’entité a été renommé. Le message confirme
  l’envoi de la commande à la clé.
- **Recharger Zigbee (ZHA)** est proposé si le bouton SMLIGHT est indisponible
  et qu’un seul coordinateur ZHA actif sur USB permet le rechargement. L’action
  relance l’intégration ZHA. Elle n’envoie pas de redémarrage physique à la puce.
  Si aucune méthode compatible n’est disponible, le bouton Zigbee est inactif
  et la page en explique la raison.

Le bouton officiel SMLIGHT est une entité de configuration, exclue de
l’exposition automatique. S’il a déjà été exposé manuellement, retirer son
exposition dans **Paramètres → Assistants vocaux → Exposer**.

## Installer sur l’ODROID

1. Mettre à jour `custom_components/kimia_cudy_clients/settings.py` et ajouter
   `custom_components/kimia_cudy_clients/maintenance.py` dans `/config`.
   Le PIN et la configuration de l’intégration existante sont réutilisés.
2. Mettre à jour les ressources `www/kimia-settings-lock-v1-card.js` et
   `www/kimia-smart-core-v1.js` dans `/config`. Si le moteur KIMIA a reçu des
   adaptations locales, reporter uniquement les blocs de la modification.
   Incrémenter le suffixe `?v=` des deux ressources dans Lovelace.
3. Redémarrer Home Assistant une fois, au moment choisi, pour enregistrer la
   nouvelle commande WebSocket. L’ODROID reste allumé.
4. Recharger KIMIA, puis utiliser **Actualiser ma maison** avec un compte
   administrateur pour ajouter la page **Paramètres avancés**. Ouvrir la
   maintenance, vérifier le nom des boutons et annuler les confirmations
   pour contrôler l’interface sans interrompre l’installation.
