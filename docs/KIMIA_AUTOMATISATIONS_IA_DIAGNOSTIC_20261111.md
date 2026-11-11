# KIMIA Smart — Atelier Automatisations IA et diagnostic HA

**Statut : prototype fonctionnel testé en simulation, à valider sur l'ODROID Home Assistant.**

Cette évolution se situe **exclusivement dans le dashboard administrateur** \`kimia-admin-next\`.
La création manuelle dans \`Scénarios\` est conservée.

## 1. Navigation

- Nouveau véritable onglet admin **Automatisations IA** (\`/kimia-admin-next/automatisations-ia\`).
- Raccourci **Automatisations IA KIMIA** ajouté à l'onglet manuel **Scénarios**.
- Dans le nouvel onglet : bouton « Création manuelle » pour revenir aux scénarios habituels ; deux cartes KIMIA : atelier IA et diagnostic HA.
- La synchronisation est additive et ne remplace pas les cartes de scénarios déjà présentes.

## 2. Atelier d'automatisations et de scripts avec Gemini

Le client administrateur :
1. choisit **Automatisation** ou **Script** et l'entité **Google AI Task** ;
2. décrit son besoin en français ;
3. clique sur **Proposer avec Gemini** ;
4. voit un aperçu du JSON HA réellement calculé par KIMIA ;
5. clique volontairement sur **Enregistrer après validation** puis confirme l'opération.

**Aucune proposition n'est enregistrée automatiquement.**

### Périmètre V1 volontairement restreint

- Déclencheurs d'automatisation : heure fixe ou passage \`on/off\` d'un capteur binaire \`motion\`, \`occupancy\` ou \`presence\`.
- Une condition possible : plage horaire \`after/before\`.
- Actions : \`light.turn_on\`, \`light.turn_off\` avec intensité facultative (1–100 %), \`scene.turn_on\`, pause de 1 à 300 secondes.
- Au plus 6 actions. L'IA n'émet pas directement du YAML exécutable ; KIMIA reconstruit une configuration de composants **strictement autorisés**.
- Refus : autres appareils, prises, chauffage, volets, serrures, alarmes, commandes système, template Jinja, scripts imbriqués, séquences complexes.
- Les identifiants d'entités sont vérifiés contre les entités effectivement accessibles dans Home Assistant.
- Les scripts sont enregistrés et **ne se lancent pas tout seuls**.
- Les automatisations sont enregistrées avec \`initial_state: false\`, donc **désactivées** (y compris après un redémarrage). L'administrateur doit relire, tester, puis, pour une activation permanente, retirer \`initial_state: false\` via l'éditeur YAML natif Home Assistant et activer l'automatisation.
- L'enregistrement utilise les API de configuration officielles via la session Home Assistant, et recharge les scripts/automatisations ; aucune clé API Gemini n'est placée dans le JavaScript.

### Limites à tester en situation réelle

- Validation de l'API \`config/automation/config/{id}\` et \`config/script/config/{id}\` sur la version de Home Assistant de l'ODROID.
- Reconnaissance, par Gemini, des entités de l'installation (données transmises : noms et IDs des lumières/scènes/capteurs de présence, **pas de secrets**).
- Respect du format JSON proposé ; tout écart est refusé avant sauvegarde.
- Les scripts exposés à Assist peuvent être activés à la voix après exposition manuelle dans HA.

## 3. Diagnostic Home Assistant

Le bouton **Vérifier mon Home Assistant** produit un rapport **à la demande** :
- état du cœur HA, version et migration Recorder éventuelle ;
- contrôle officiel \`POST /api/config/core/check_config\` de \`configuration.yaml\` ;
- compte des entités \`unavailable\` et \`unknown\` (avec un échantillon d'identifiants) ;
- nombre de scripts et d'automatisations, dont automatisations désactivées ;
- nombre d'appareils, entités enregistrées ou désactivées, composants chargés ;
- nombre de lignes ERROR/CRITICAL/WARNING dans les 3 000 dernières lignes du journal HA.

Le rapport **ne répare rien**, n'active aucun appareil et ne redémarre pas Home Assistant. Le contrôle YAML peut générer une notification persistante en cas d'erreur, comme dans HA natif. En cas d'API inaccessible, le rapport précise les contrôles non disponibles et reste partiel.

**Ce n'est pas un « examen complet » des performances, de la qualité de chaque liaison Zigbee, du réseau Wi-Fi, des batteries, de la sécurité Internet, de la cohérence exhaustive des automatismes ou de la santé de tous les équipements.** Une évolution pourra ajouter des tests spécifiques KIMIA, mais chaque test doit rester clairement défini.

## 4. Installation sur l'ODROID

**Sauvegarder le dashboard admin \`kimia-admin-next\`, le dashboard client et les JS avant tout essai.**

À partir de la branche GitHub :
\`feat/kimia-ai-automation-diagnostics-20261111\`

1. **Remplacer uniquement le moteur existant** :
   \`/config/www/kimia-smart-core-v1.js\`
2. **Ajouter le nouveau fichier JavaScript** :
   \`/config/www/kimia-ai-automation-studio-v1-card.js\`
3. Home Assistant → Paramètres → Tableaux de bord → Ressources :
   - Modifier la ressource du moteur existant en \`/local/kimia-smart-core-v1.js?v=7\`, **Module JavaScript**.
   - Ajouter la nouvelle ressource \`/local/kimia-ai-automation-studio-v1-card.js?v=1\`, **Module JavaScript**.
   - Ne pas créer de deuxième ressource pour le moteur.
4. Recharger entièrement HA (Ctrl + F5).
5. KIMIA Configuration → **Démarrer → Actualiser ma maison**. Cette étape ajoute le nouvel onglet dans \`kimia-admin-next\`.
6. Vérifier l'onglet manuel **Scénarios** intact, puis **Automatisations IA** et **Vérifier mon Home Assistant**.
7. Commencer par un script non critique allumant une lampe, puis tester une automatisation horaire **désactivée**.
8. En cas de problème, restaurer le JS et le dashboard sauvegardés.

**Ne pas toucher à \`kimia-ai-scenes-v1-card.js\`** : les dix scènes lumineuses Gemini existantes ne sont pas modifiées.

## 5. Tests exécutés

- Syntaxe des fichiers JavaScript : OK.
- \`tests/kimia_v1.test.cjs\` : OK (cartes client, anciens scénarios, onglet admin dédié, conservation du manuel, synchronisation idempotente).
- \`tests/kimia_ai_automation.test.cjs\` : OK (automatisations de présence et d'heure, scripts, rejet chauffage/serrures/commandes inconnues, demande de confirmation, enregistrement désactivé, diagnostic non destructif).

**Aucun test sur le matériel réel, aucune écriture sur l'ODROID de production.**
