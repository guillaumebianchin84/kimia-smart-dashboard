# KIMIA Routine Reader — DEV uniquement

Cette petite intégration Home Assistant ajoute la commande WebSocket admin
`kimia_routine_reader/list`. Elle sert exclusivement à expliquer les
automatisations et scripts existants dans l'Atelier IA.

## Installation sur KIMIA DEV

1. Avec File Editor, créer `/config/custom_components/kimia_routine_reader/`.
2. Copier dans ce dossier `manifest.json` et `__init__.py` depuis GitHub.
3. Ajouter dans `/config/configuration.yaml` au niveau racine :

   ```yaml
   kimia_routine_reader:
   ```

4. Vérifier la configuration dans Home Assistant, puis redémarrer Home Assistant
   *après avoir confirmé que la restauration est bien terminée*.
5. Remplacer le fichier `/config/www/kimia-ai-automation-studio-v1-card.js`
   par la version de la branche DEV, puis actualiser l'interface (Ctrl+F5).
6. Tester dans l'Atelier IA : « Explique l'automatisation Appliquer le thème client ».

## Fonctionnement et limites

- Aucun service d'écriture ; WebSocket accessible aux administrateurs uniquement.
- Ne lit que `automations.yaml` et `scripts.yaml` directement dans `/config`.
- N'ouvre ni `configuration.yaml`, ni `secrets.yaml`, ni d'autres chemins.
- Les valeurs `data`, templates, variables et paramètres potentiellement sensibles
  ne sont pas envoyés à Gemini. Les actions qui en dépendent peuvent donc être
  décrites seulement partiellement.
- Les directives HA `!include`, `!secret` et les contenus YAML incompatibles
  avec PyYAML safe_load ne sont pas résolus : une erreur de lecture est remontée.
- Les automatisations définies via packages, `configuration.yaml` ou inclusions
  ne sont pas encore accessibles par ce lecteur.
- Les correspondances se font par ID quand il existe, sinon par nom exact :
  des doublons de noms peuvent produire une association incertaine.
- L'état activé ne prouve jamais une exécution. Les traces seront étudiées dans
  une évolution distincte.

Aucune ressource de dashboard client ni carte native n'a été modifiée.
