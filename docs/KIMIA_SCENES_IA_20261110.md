# KIMIA Smart — Ambiances lumineuses IA

Dans **KIMIA Configuration → Scénarios**, sélectionner les ampoules et l’entité
**Google AI Task**, puis décrire les ambiances souhaitées. La réponse Gemini est
validée avant toute écriture. La génération attend exactement 20 ambiances
distinctes compatibles avec les ampoules. Une erreur ou une perte de liaison
avant l’écriture conserve les scènes en place.

## Scènes et affichage

- Les scènes sont stockées dans Home Assistant, avec les identifiants réservés
  `kimia_ambiance_01` à `kimia_ambiance_20` et le préfixe `KIMIA · `. Les
  noms équivalents retrouvent leurs identifiants lors d’une régénération.
- Cocher jusqu’à dix scènes dans **Gérer mes scènes KIMIA**. La sélection est
  enregistrée avec le tableau de bord HA et peut être vide. Les widgets
  **Lumières** restent des tuiles natives qui appellent `scene.turn_on`.
- Le bouton **Supprimer** agit sur les scènes KIMIA sélectionnées. La
  régénération ne commence à écrire qu’après validation et contrôle des
  collisions. Le navigateur enregistre le point de retour en local
  (`kimia-ai-scenes-backup-v1`). En cas d’échec pendant les écritures, KIMIA
  tente de restaurer les scènes touchées et signale une restauration
  incomplète. Faire aussi une sauvegarde Home Assistant avant la migration.

## Assist et Gemini

- **Actualiser le script vocal** importe les scènes KIMIA déjà enregistrées
  sans relancer Google AI Task. Les descriptions des anciennes scènes sont
  déduites des réglages enregistrés. La génération ou la suppression actualise
  ensuite automatiquement le catalogue.
- Le script `kimia_ambiances_lumineuses` fournit à Assist des identifiants
  autorisés, des noms et des descriptions, y compris pour les scènes non
  cochées. Il vérifie que la demande concerne l’éclairage, que la scène et ses
  ampoules sont disponibles et que la pièce demandée est compatible.
- KIMIA vérifie l’exposition par l’API Assist. Si l’API refuse l’opération,
  ouvrir **Paramètres → Assistants vocaux → Exposer**, exposer
  **KIMIA - Ambiances lumineuses** et retirer uniquement les scènes IA KIMIA
  de la liste Assist. Vérifier que l’agent Gemini utilise l’API Assist et
  permet le contrôle de Home Assistant.
- Internet est nécessaire pour générer les ambiances ou interpréter une demande
  via Gemini. Les scènes déjà enregistrées restent utilisables en local avec
  des ampoules pilotables sans cloud.

## Déploiement sur l’ODROID

1. Faire une sauvegarde Home Assistant qui inclut la configuration et les
   tableaux de bord.
2. Mettre à jour `www/kimia-ai-scenes-v1-card.js` et
   `www/kimia-smart-core-v1.js`, en conservant les adaptations locales
   éventuelles du moteur hors du bloc des scènes.
3. Incrémenter le paramètre `?v=` de ces deux ressources Lovelace et recharger
   KIMIA. Vérifier que `scenes.yaml` et `scripts.yaml` sont chargés dans la
   configuration Home Assistant.
4. Depuis Scénarios avec un compte admin, cliquer **Actualiser le script vocal**
   pour reprendre le catalogue existant. Quand les ampoules répondent, lancer
   la génération de 20 scènes, puis vérifier **Lumières** et Assist.
