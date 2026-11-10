# KIMIA Smart — 10 scènes lumineuses IA fixes

**Statut : prototype à tester sur l'Odroid. Non installé automatiquement dans Home Assistant.**

## Fonctionnement
- Dans **KIMIA Configuration → Scénarios**, une carte permet de choisir les ampoules, l'entité AI Task (Gemini), puis de décrire les ambiances souhaitées.
- KIMIA demande à Gemini **exactement dix scènes fixes**, sans animation ni horaire, au format JSON.
- Le navigateur valide la quantité, l'unicité des noms, l'identité de chaque ampoule, puis convertit les couleurs et les intensités selon les capacités des entités `light.*`.
- Les scènes sont sauvegardées par l'API de configuration Home Assistant (`POST /api/config/scene/config/<id>`), puis rechargées.
- Identifiants réservés : `kimia_ambiance_01` à `kimia_ambiance_10`. Seules les scènes KIMIA occupant ces IDs sont remplaçables. Une scène externe du même ID bloque la génération.
- KIMIA essaye d'exposer les dix scènes à l'assistant `conversation` (Assist/Gemini). Si cela échoue, un message invite à vérifier l'exposition manuellement.
- Dans **KIMIA → Lumières**, un bloc « Mes ambiances » affiche jusqu'à 10 boutons basés sur les scènes enregistrées. Chaque bouton appelle `scene.turn_on`.
- **Internet nécessaire pour générer avec Gemini, mais pas pour appliquer les scènes sauvegardées.**

## Prérequis
- **Home Assistant** avec la configuration `scene: !include scenes.yaml` habituelle et des scènes éditables.
- Entité **AI Task Google Gemini** présente dans Home Assistant (`ai_task.*`). Une entité conversation Gemini seule ne suffit pas à ce générateur.
- Le contrôle d'appareils dans l'agent conversationnel Gemini doit être activé pour les commandes vocales.
- Les dashboards `kimia-next` et `kimia-admin-next` en mode **Interface / Storage**.
- Compte administrateur pour générer les scènes.

## Installation de test (deux JavaScript)
1. Faire une sauvegarde native de Home Assistant et exporter les deux dashboards.
2. Depuis la branche `feat/kimia-scenes-ia-20261110`, télécharger **Raw** :
   - `www/kimia-smart-core-v1.js`
   - `www/kimia-ai-scenes-v1-card.js`
3. Remplacer le moteur existant sous `/config/www/kimia-smart-core-v1.js`, après copie de sauvegarde. Ajouter le nouveau fichier `/config/www/kimia-ai-scenes-v1-card.js`.
4. Dans **Paramètres → Tableaux de bord → Ressources** :
   - Modifier l'URL du moteur existant en `/local/kimia-smart-core-v1.js?v=20261110-scenesia` (pas de doublon).
   - Ajouter `/local/kimia-ai-scenes-v1-card.js?v=20261110-scenesia`, **module JavaScript**.
5. Recharger complètement le navigateur (Ctrl+F5).
6. Dans **KIMIA Configuration → Démarrer → Actualiser ma maison**, synchroniser les cartes. Les cartes de scènes sont ajoutées sans retirer les routines ou les tuiles lumineuses existantes.
7. Dans **KIMIA Configuration → Scénarios**, sélectionner une ou plusieurs ampoules, choisir le modèle AI Task, et générer les scènes.
8. Contrôler les dix boutons dans **KIMIA → Lumières**, la commande `scene.turn_on` et l'activation par Assist. Vérifier ensuite la persistance après un redémarrage HA et l'application des scènes hors Internet.

## Limites et précautions
- **Ne pas tester immédiatement sur l'installation de production** : la présence de l'API scène, la réponse Gemini et la capacité de sauvegarde restent à vérifier sur l'Odroid.
- L'enregistrement des dix scènes est séquentiel, **pas transactionnel**. En cas d'erreur après quelques scènes, le générateur l'indique sans annuler celles qui ont déjà été enregistrées.
- Les entités lumineuses exposent des capacités différentes ; les modes `hs`, `xy`, `rgb` et `color_temp` sont pris en charge. Les appareils limités aux modes `onoff` ou `brightness` n'obtiendront pas artificiellement de couleur.
- L'accès direct aux deux ressources JavaScript ne crée pas les scènes : il faut explicitement demander la génération après sélection des ampoules.
- Si l'agent Gemini n'a accès qu'aux conversations et pas au contrôle de la maison, les boutons HA fonctionneront mais pas nécessairement les commandes vocales.
- Les scènes générées dans HA portent un préfixe `KIMIA ·` et des IDs fixes. La régénération peut changer leurs noms et leurs couleurs.
- Ne pas publier de clé API, de fichier `secrets.yaml` ni d'identifiant sensible sur GitHub.
