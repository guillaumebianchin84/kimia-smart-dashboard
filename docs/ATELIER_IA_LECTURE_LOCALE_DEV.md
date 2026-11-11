# KIMIA Routine Reader — DEV uniquement

**État : nouvelle lecture des packages ajoutée sur la branche DEV. Home Assistant a été relancé par l'utilisateur sans erreur de configuration ; le comportement du nouveau lecteur de packages reste à vérifier en conditions réelles.**


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
- Lit `automations.yaml` et `scripts.yaml` ainsi que les fichiers `*.yaml` et `*.yml` directement dans `/config/packages/` (sans sous-dossier ni récursion).
- N'ouvre ni `configuration.yaml`, ni `secrets.yaml`, ni de chemins arbitraires. L'accès à `packages/*.yaml` est strictement limité aux fichiers de premier niveau.
- Les valeurs `data`, templates, variables et paramètres potentiellement sensibles
  ne sont pas envoyés à Gemini. Les actions qui en dépendent peuvent donc être
  décrites seulement partiellement.
- Les directives HA `!include`, `!secret` et les contenus YAML incompatibles
  avec PyYAML safe_load ne sont pas résolus : une erreur de lecture est remontée.
- Les automatisations déclarées directement dans les packages sont prises en charge. Celles de `configuration.yaml`, des sous-dossiers ou d'inclusions Home Assistant personnalisées ne le sont pas encore.
- Les correspondances se font par ID quand il existe, sinon par nom exact :
  des doublons de noms peuvent produire une association incertaine.
- L'état activé ne prouve jamais une exécution. Les traces seront étudiées dans
  une évolution distincte.

Aucune ressource de dashboard client ni carte native n'a été modifiée.

## Diagnostic de l'erreur « Integration not found »

Le composant peut être présent dans `/config/custom_components/kimia_routine_reader`
sans être détecté par le processus Home Assistant. Ce message indique un échec
de découverte/chargement, et ne prouve pas à lui seul un problème de syntaxe
Python. Vérifier le journal complet (pas seulement les lignes filtrées par nom),
la configuration effectivement chargée et le rechargement du processus Core.

La première version du lecteur utilisait `voluptuous` pour la définition d'une
commande WebSocket. L'API Home Assistant actuelle utilise `probatio`. Le code
a été corrigé avec le décorateur de permissions administrateur à la bonne place.
Cette correction ne démontre pas la résolution du message « Integration not found ».

Si le lecteur n'est pas installé, **laisser la clé `kimia_routine_reader:` absente**
du `configuration.yaml`. L'Atelier IA continue en mode inventaire/API native.

## Mise à jour du lecteur pour les packages

Si la version précédente est déjà installée et ne produit pas d'erreur au
redémarrage, ne remplacer que `/config/custom_components/kimia_routine_reader/__init__.py`
par la version du dépôt, puis redémarrer Home Assistant Core. Le fichier
`manifest.json`, `configuration.yaml`, le JavaScript et les dashboards n'ont
pas besoin d'être modifiés pour cette mise à jour.

Test utile : demander l'explication de « Initialiser les onglets visibles une seule fois »
qui figure dans `packages/kimia_admin_navigation.yaml` du dépôt. Ne pas utiliser
« Appliquer le thème client » comme preuve de lecture des packages tant que sa
source réelle n'a pas été identifiée.
