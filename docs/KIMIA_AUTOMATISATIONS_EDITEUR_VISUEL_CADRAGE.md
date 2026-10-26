# KIMIA Smart — futur éditeur d'automatisations et de scénarios
Date : 26 octobre 2026
Statut : **REMARQUE PRODUIT À ÉTUDIER — NON DÉVELOPPÉE**.
Branche de référence du projet : `feat/kimia-v15-profils-utilisateurs-20261026`.
**Ne modifier ni le composant actuel, ni la VM210, ni les dashboards à cette étape.**

## Observation de la revue
Capture du module admin « Créer un scénario » : champ nom et boutons « Ajouter une action », « Ajouter une attente », « Créer le scénario ».
Le module existant `www/kimia-script-builder-v14-card.js` enregistre un **script HA** via `config/script/config/<id>`. Il ne crée **pas** une automatisation HA : aucun déclencheur, aucune condition, aucune logique ET/OU, aucun branchement, aucun changement d'ordre des cartes/actions, aucune édition des scripts existants.
Le module `www/kimia-scenarios-v1-card.js` permet d'affecter des scripts existants aux raccourcis KIMIA (Réveil, Départ, etc.). Ces fonctionnalités doivent continuer à fonctionner.

## Décision de conception — deux types distincts
- **Scénario** : une séquence d'actions déclenchée volontairement (raccourci KIMIA), avec si nécessaire des attentes, conditions et branches.
- **Automatisation** : au moins un déclencheur « Quand », zéro ou plusieurs conditions « Si », puis des actions « Alors ». L'éditeur doit créer une vraie `automation` HA, pas simplement un script renommé.
- Proposer dans KIMIA Configuration deux entrées lisibles : « Scénarios » et « Automatisations », ou un écran « Mes routines » avec distinction nette et filtrage. Conserver les raccourcis historiques.

## 1. Déclencheurs « Quand »
Première couverture sans YAML :
- Heure précise, jours de semaine, horaires répétitifs.
- Lever/coucher du soleil avec décalage.
- Changement d'état d'un appareil : porte, présence/mouvement, éclairage, volet, interrupteur, alarme.
- Seuils numériques : température, humidité, luminosité, consommation/puissance, batterie, etc. ; comparateurs et durée de maintien si HA le permet.
- Entrée/sortie d'une zone, présence de personne, activation d'un bouton ou événement exposé par HA.
- **Plusieurs déclencheurs** : par défaut chacun peut démarrer l'automatisation (« OU »). Ne pas donner à croire qu'ils doivent tous se produire ensemble ; proposer les conditions appropriées pour cela.
- Le choix commence par la **pièce**, puis l'appareil/entité, puis l'événement ; recherche intégrée pour les grandes installations.

## 2. Conditions « Si »
- Facultatives, avec états et valeurs (est allumé/éteint, seuil numérique, température, luminosité, présence, ouverture), heure, jours, soleil, position, statut d'un mode/booléen KIMIA.
- Groupes logiques **ET / OU / NON**, y compris les groupes imbriqués au besoin.
- Durée/temporisation quand elle a un sens, en distinguant une condition actuelle d'un déclencheur de changement.
- Conditions dans les actions : « Si / Alors / Sinon », choix de branches multiples « Selon le cas ».
- Messages clairs : « Cette automatisation s'exécutera lorsque X se produit, mais seulement si Y et Z sont vrais. »

## 3. Actions « Alors »
- Allumer/éteindre, intensité, couleur, régler une température, piloter volet, prise, musique ; lancer un script/scénario ; notifications et autres services HA compatibles.
- Ajouter attente fixe, attente jusqu'à un état avec délai maximum, répétition lorsque utile, interrompre, exécuter plusieurs actions en séquence ou en parallèle selon besoin.
- **Réorganiser** tous les blocs compatibles : glisser-déposer avec poignée sur desktop, boutons Monter / Descendre utilisables au clavier/tactile ; déplacer également au sein des branches.
- Chaque bloc doit pouvoir être **dupliqué, supprimé, désactivé sans être effacé, réduit/déplié**, avec titre humain lisible. Demander confirmation avant destruction d'une branche entière.
- Ne jamais réinitialiser les valeurs d'un bloc lors d'un changement d'ordre.

## 4. Interface et ergonomie
Proposition de structure, sans maquette graphique à développer maintenant :
1. Nom, icône, courte description et choix Scénario / Automatisation.
2. Trois sections verticales bien lisibles : **QUAND / SI / ALORS** ; seules les deux dernières existent dans le cas d'un scénario.
3. Gros boutons « + Ajouter un déclencheur », « + Ajouter une condition », « + Ajouter une action / attente / choix ».
4. Blocs repositionnables, numérotés lorsque l'ordre influe sur l'exécution, avec aperçu simple en français.
5. Écran de récapitulatif avant validation ; messages explicites pour équipements indisponibles, références supprimées, étapes incomplètes.
6. Version smartphone/tablette entièrement utilisable au doigt et sans glisser-déposer obligatoire ; palette et typographie **KIMIA existantes**, pas de nouveau design imposé.
7. Pas de YAML demandé au client pour les cas courants ; un éventuel « mode expert » peut donner accès à l'éditeur HA natif, sans prétendre représenter visuellement les fonctions non gérées.

## 5. Gestion du cycle de vie
- Lister les automatisations KIMIA avec leur nom, statut activé/désactivé, résumé des déclencheurs et dernière exécution si donnée disponible.
- **Créer, rouvrir, modifier, renommer, dupliquer, activer/désactiver**, supprimer avec confirmation.
- Un clic pour exécuter un scénario manuellement ; pour une automatisation, proposer « Tester les actions » avec avertissement que ce test peut contourner déclencheurs/conditions selon l'API utilisée.
- Accès administrateur pour modifier la configuration ; visibilité/exécution utilisateur selon les droits produits à étudier. L'affichage masqué par pièce n'est pas une barrière de sécurité.
- Préserver les automatisations HA existantes non créées par KIMIA : pas d'écrasement implicite. Au début, édition uniquement des éléments connus créés par KIMIA ; ouverture des autres dans l'éditeur HA natif.
- Écriture HA fiable : ID stable, validation des paramètres, détection de conflits si un autre utilisateur modifie la même automatisation, message de sauvegarde, rechargement approprié.

## 6. Comportements importants avant livraison
- Mode d'exécution HA : `single`, `restart`, `queued`, `parallel` ; version simplifiée puis réglages avancés. Expliquer l'effet en cas de déclenchements répétés.
- Traces HA et diagnostic : « Qu'est-ce qui a déclenché ? Quelle condition a bloqué ? Quelle action a échoué ? » ; lien vers la trace native lorsqu'elle est disponible.
- Ne pas faire d'exécution incontrôlée : protections contre les boucles, déclenchements très fréquents, actions dangereuses non anticipées et appareils indisponibles.
- Prévoir gestion des délais de déclenchement, fuseau horaire local, seuils, comportements hors ligne, temps d'attente, coupure/redémarrage HA, détection de références supprimées.
- Distinguer « Enregistrer la routine » de « Lancer maintenant » ; ne jamais démarrer un script en le créant.

## Exemple fonctionnel minimal
**Automatisation « Lumière terrasse »**
- QUAND : mouvement détecté sur la terrasse.
- SI : soleil couché **ET** luminosité sous un seuil.
- ALORS : allumer les lumières Terrasse, attendre 2 minutes, **SI** aucun mouvement n'est détecté **ALORS** éteindre (ou attendre la fin de présence plutôt qu'un simple délai : comportement à choisir explicitement).
- L'utilisateur doit pouvoir déplacer les actions, en ajouter une ou modifier le seuil sans refaire le formulaire.

## Ordre conseillé de développement
**Lot A — fondations** : différenciation script / automation, vraie création HA, déclencheurs simples, conditions simples, actions, réordonnancement flèches et desktop, création/édition KIMIA uniquement.
**Lot B — logique** : blocs ET/OU/NON, Si/Sinon, attentes avec état, multi-déclencheurs, duplication, désactivation de blocs, tests fonctionnels.
**Lot C — avancé** : choix de branches, répétitions, mode d'exécution, historique/trace, modèles de routines, import raisonné d'automatisations HA.
**Non inclus maintenant** : restrictions d'accès réelles par pièce et filtrage de la Maquette.

## Critères de validation
1. Une véritable automation HA créée depuis KIMIA se déclenche au bon événement, évalue ses conditions, puis exécute ses actions dans l'ordre.
2. Inverser deux actions dans l'interface inverse réellement leur ordre enregistré et n'altère pas leurs paramètres.
3. Un enfant/non-admin ne peut pas modifier une automatisation via l'interface KIMIA.
4. Une automatisation HA personnalisée et étrangère à KIMIA reste totalement intacte.
5. Une modification ultérieure ne duplique pas la routine ni ses déclencheurs.
6. À la réouverture, tous les déclencheurs/conditions/actions sont fidèlement restitués.
7. La Maquette, la navbar, le thème, les scénarios existants et les automatismes déjà installés continuent de fonctionner.

## Sources techniques
- Documentation HA « Automation triggers » : https://www.home-assistant.io/docs/automation/trigger/
- Documentation HA « Automation conditions » : https://www.home-assistant.io/docs/automation/condition/
- Documentation HA « Automations in YAML » : https://www.home-assistant.io/docs/automation/yaml/
- Documentation HA « Automation modes » : https://www.home-assistant.io/docs/automation/modes/
