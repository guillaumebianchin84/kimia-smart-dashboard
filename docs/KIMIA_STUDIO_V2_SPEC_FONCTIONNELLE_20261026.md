# KIMIA Smart by PROMAINT — KIMIA Studio V2
## Conception fonctionnelle — scénarios (scripts) et automatisations
Date : 26 octobre 2026 · Statut : **conception, AUCUNE installation ni modification des dashboards en production**.
Base de travail : KIMIA V1.7 sur branche isolée ; sauvegarde Proxmox de référence V1.6.3 conservée. Destinée à la VM210 KIMIA uniquement, pas à la VM100 privée.

## 1. Décision produit
**Un seul studio, trois profondeurs.**
1. **Guidé** : sélectionner un modèle ou partir d'une page simple, choisir la pièce, les équipements et les actions, puis éventuellement « Quand ? » ; résumé en français, validation et sauvegarde.
2. **Avancé visuel** : même routine, dans un canevas WHEN / IF / THEN (automatisation) ou ACTIONS (script), toutes les branches, temporisations et options usuelles disponibles sous cartes dépliables.
3. **Expert / natif HA** : afficher les blocs YAML/HA avancés **sans jamais les écraser** ; éditer dans HA quand la sémantique complète n'est pas couverte. À terme, éditeur de blocs natifs expert dans KIMIA uniquement si aller-retour sans perte garanti.

On ne reconstruit **pas** un moteur d'automatisation propriétaire. Le moteur d'exécution et la source de vérité restent Home Assistant, notamment après redémarrage ou sans Internet.

**Scénario KIMIA = script Home Assistant**, à lancer manuellement depuis KIMIA, une autre automatisation ou Assist. Une **scène Home Assistant** (état instantané des équipements) est un objet distinct, que Studio doit permettre d'activer ou de réutiliser sans le confondre avec un script. Une automatisation combine « déclencheur(s) » + « conditions » + « actions » ; plusieurs déclencheurs ont une logique OU.

## 2. Page d'accueil « Mes routines »
- Deux onglets visibles immédiatement : **Scénarios** / **Automatisations**, plus vue « Toutes ».
- Cartes compactes : icône, nom, courte description en français, pièce(s), catégorie, état actif/inactif, dernier lancement, indicateur d'erreur (si données disponibles).
- Actions : Exécuter (script), Activer/Désactiver (automation), Voir, Modifier, Dupliquer, Organiser, Supprimer avec confirmation et conséquences claires. Historique / traces disponibles par lien ou intégration validée.
- Recherche textuelle ; filtres par **zone HA, étage, appareil, étiquette, type, statut, origine KIMIA ou HA** ; favoris ; tri.
- Le catalogue doit présenter les routines Home Assistant existantes **même quand elles ne viennent pas de KIMIA**. Modifier dans Studio seulement quand la configuration est représentable sans perte ; sinon « Ouvrir dans Home Assistant », sans masquer l'objet ou le désactiver.
- Dans l'administration, possibilité d'afficher les raccourcis « Au lit », « Départ », « Retour », « Réveil », etc. sans casser la carte existante `kimia-scenarios-v1-card` et ses `input_text`.
- Compte non-admin : interface de commande des routines autorisées uniquement. Création/édition réservées admin tant que des permissions serveur ne permettent pas un contrôle d'accès fiable.

## 3. Assistant guidé : 4 questions, pas de jargon
A. **Qu'est-ce que tu veux faire ?** Action manuelle (scénario/script), automatisation, ou modèle « Bonne nuit », « Départ », « Retour », « Réveil », « Éclairage extérieur », « Présence », « Chauffage », « Surveillance », « Économie d'énergie », « Notification », « Multimédia ».
B. **Où / sur quoi ?** Choix par zone HA puis équipements disponibles, ou cible globale étage/étiquette/entité/appareil. Noms et icônes locaux, jamais liste d'entity_id bruts en premier. Afficher le nombre d'équipements réellement concernés.
C. **Quelles actions ?** Cartes action par action, prévisualisation « Éteindre toutes les lumières du salon » ; boutons Ajouter, Dupliquer, Déplacer, Supprimer ; choix conditionnels dépliables.
D. **Quand / à quelle condition ?** Seulement pour les automations : heures, calendrier, lever/coucher du soleil, présence, mouvement, capteur, bouton, énergie ; conditions facultatives visibles sur demande.

Écran final : nom, icône, catégorie, résumé en langage naturel, appareils/cibles impactés, avertissements de sécurité, choix Enregistrer sans exécuter, Tester volontairement, Annuler. Aucune commande réelle pendant la construction.

L'utilisateur peut quitter le parcours guidé et ouvrir **Avancé** à tout instant, puis revenir en simplifié **seulement si** l'ensemble est encore représentable sans perte. Sinon, garder l'éditeur avancé et une lecture synthétique en français.

## 4. Éditeur avancé visuel — canevas universel
- Automatisation : **QUAND** (plusieurs déclencheurs OR), **SI** (conditions AND par défaut, groupes AND/OR/NOT), **ALORS** (séquence ordonnée d'actions).
- Script : **ACTIONS** ordonnées, avec conditions intermédiaires, variables et paramètres d'entrée ; ne pas inventer de faux déclencheur script.
- Tous blocs peuvent être renommés, activés/désactivés si HA le supporte, réduits, dupliqués, déplacés au clavier/tactile, ordonnés, annotés, prévisualisés.
- Vue compacte = description naturelle (« Si quelqu'un arrive après le coucher du soleil, allumer l'entrée »), clic pour détails. Les champs avancés sont pliés par défaut.
- Tactile Android (pas de drag-only), boutons Monter/Descendre, vraie gestion du focus et accessibilité, sauvegarde de brouillons avant navigation.
- Aide contextuelle (« Déclencheur réagit à un changement, condition vérifie si c'est vrai ») avec exemples.
- Affichage par zone et type d'objet alimenté dynamiquement par les registres Home Assistant (`area_id`, `device_id`, `entity_id`, `floor_id`, `label_id`) ; les plans Maquette et coordonnées des clients ne sont jamais impliqués.

## 5. Inventaire des capacités à considérer — disponibilité par famille

### A. Déclencheurs d'automatisation
**Courants guidés :**
- État d'entité/appareil (on, off, ouvert, fermé), durée dans un état, attribut d'entité.
- Valeur/seuil numérique (température, humidité, énergie, batterie, consommation, luminosité), seuil franchi, unité et comparaison.
- Horaire fixe et jours, calendrier/date, répétition par intervalle/périodicité.
- Soleil (lever, coucher, décalage), présence/personne/zone arrivée-départ, détecteur de mouvement/porte.
- Bouton, télécommande, appareil/action d'intégration, tag NFC si présent.

**Avancé / extension :**
- Événement HA, démarrage HA, géolocalisation, MQTT, webhook, notification/événement d'intégration, commandes Assist (« phrase »), modèles Jinja/template.
- Déclencheurs fournis dynamiquement par les intégrations et variantes futures de HA ; ne pas coder une liste figée comme unique source de vérité.
- Identifiant de déclencheur et branchement différent selon celui qui a déclenché ; gestion des cibles multiples (chacun/premier/tous) quand prise en charge.
- Traiter explicitement les différences entre « au changement » et « tant que vrai », les périodes de maintien `for` et le comportement au redémarrage.

### B. Conditions
- État d'une entité, comparaison numérique, heure et jours, soleil, présence/zone, appareil, calendrier/intégration si supportée, template.
- ET / OU / NON à plusieurs niveaux ; groupe de conditions ; condition basée sur l'identifiant du déclencheur.
- Pour script : condition insérée dans le flux = arrêt/branche quand fausse, pas déclencheur.
- Tester une condition sans lancer les actionneurs quand HA le permet.

### C. Actions et cibles
- Lumières : marche/arrêt, variation, luminosité, couleur, température de couleur.
- Volets/ouvrants : ouvrir, fermer, position ; garage/serrure/alarme avec avertissement/confirmation renforcée.
- Thermostats, climatisation, ventilations : mode, consigne, ventilateur, préréglage si exposé.
- Prises, switches, helpers, sélections, nombres, scènes.
- Musique/multimédia : lecture, pause, volume, média, cible audio, TTS ; selon capacités de l'intégration.
- Notifications : mobile, persistantes, vocales ; destinataire(s), message, données adaptées à l'intégration.
- Calendrier, listes, scripts chaînés, automation.trigger, événements, actions d'intégrations spécifiques, appels de service Home Assistant et domaines futurs.
- Cibles multiples par **entité / appareil / zone / étage / étiquette** (support dynamique réel, sans confusion entre entités et appareils). Choix d'action selon les capacités disponibles ; données et champs affichés suivant le schéma HA, sans suppositions.
- Options expertes : templates/variables dans paramètres, réponses de service, contexte, stratégies d'erreur.

### D. Contrôle de flux, temps et concurrence
- Attendre durée / déclencheur / condition-template, expiration, continuer ou non si timeout.
- SI / ALORS / SINON ; CHOISIR plusieurs branches avec défaut ; condition intermédiaire qui interrompt la suite.
- Répéter N fois, **tant que**, **jusqu'à**, **pour chaque** ; limites anti-boucles et aperçu d'exécution.
- Séquences/groupes imbriqués ; exécution **parallèle** avec avertissement sur ordre et variables partagées.
- Variables locales, paramètres d'entrée des scripts (fields), templates, réponse de script, arrêt normal/en erreur, poursuivre après erreur selon HA.
- Modes d'exécution : single / restart / queued / parallel, `max`, surcharge, gestion de plusieurs déclenchements ; rendre cela accessible avec explications simples (« Si déclenché une deuxième fois… »).
- Aucun bloc inconnu ou paramètre additionnel HA ne doit être écarté silencieusement lors de l'ouverture ou de l'enregistrement.

### E. Fonctions connexes
- Import/reconnaissance de scripts et automations HA ; blueprints comme modèles réutilisables (édition native si conversion fidèle non garantie).
- Traces et journal d'exécution, test d'une étape, lecture des erreurs, explication « pourquoi l'automation ne s'est pas déclenchée ».
- Test contrôlé : ne pas exécuter involontairement une scène, ouverture, alarme, chauffage ou script lors de la validation du formulaire.
- Version précédente / annulation / restauration de routine individuelle, duplication et conflits de modifications concurrentes.
- Routines organisées par étiquettes, pièces, catégories et favoris ; garder les anciennes associations de boutons du dashboard.

## 6. Couverture par niveau — contrat de fidélité
| Famille | Guidé | Avancé visuel | Expert/HA |
|---|---|---|---|
| Commandes simples, zones, horaires, soleil | Oui | Oui | Oui |
| Plusieurs déclencheurs, conditions AND/OR/NOT | Assistant si possible | Oui | Oui |
| Actions multi-cibles, scènes, scripts chaînés, notifications | Oui si paramètres reconnus | Oui | Oui |
| Temporisations, attentes, choose, if, repeat, parallel | Modèles simples | Oui | Oui |
| Modèles Jinja, événements spéciaux, MQTT, webhooks | Résumé seulement | Édition ciblée si fiable | Oui |
| Blueprints, custom integrations, YAML atypique | Voir/lancer | Lecture sans transformation destructive | HA natif |
| Script fields/return data, `response_variable`, `continue_on_error` | Si cas guidé | Selon compatibilité validée | Oui |

**Règle absolue de lecture/écriture :** une routine inconnue est **visible**, sa config reste **intacte**, et l'éditeur KIMIA ne permet pas sa réécriture partielle tant qu'il ne sait pas faire un aller-retour exact. Ouvrir dans HA = solution experte, pas un échec silencieux. Les scripts/automations gérés en YAML externe à la config UI HA peuvent nécessiter une édition native ou un mécanisme d'import, sans tentative d'écrasement.

## 7. Architecture recommandée
- **Home Assistant est source de vérité** : création d'objets natifs scripts/automations sans moteur de déclenchement maison.
- **Adapter / introspecter les capacités** du HA connecté (version, registres des zones/étages/étiquettes/appareils, états et capacités des services/actions, modèle natif existant). Pas d'ID ou de code client dans KIMIA.
- **Modèle d'édition par blocs de type AST** : importer/exporter en conservant les attributs non édités ; sérialisation HA contrôlée et validée, sans perte ni réordonnancement sémantique.
- Si une fonction ne peut pas être représentée sans perte dans l'éditeur graphique, afficher un résumé + un avertissement + lien vers l'éditeur officiel ; ne jamais forcer la conversion.
- Écriture backend : préférer des API publiques compatibles quand disponibles ; les endpoints de config utilisés par V1.6 sont internes et exposent un **risque de casse lors d'une mise à jour HA**. Isoler l'adaptateur, valider version/capacités, gérer erreurs, refus, conflits, backups.
- Séparer métadonnées purement KIMIA (favoris, icônes, cartes d'accueil) de la logique réellement exécutée par HA. Réutiliser les automatismes existants sans les renommer/renuméroter.
- Aucun code d'édition sur VM100. La VM210 est le banc de tests ; déploiement ciblé. Les profils de visibilité des pièces dans KIMIA ne constituent **pas des permissions serveur**. Une routine qui commande une zone privée ne doit pas devenir actionnable par un autre compte via une carte KIMIA non protégée.

## 8. Sécurité et tests à prévoir
- Réservation de la création/édition/suppression à l'admin sauf droits serveur explicites ; la visibilité KIMIA ne suffit pas à garantir une vraie ACL.
- Confirmation renforcée sur serrure, portail, alarme, effacement ou actions pouvant être dangereuses ; interdiction de lancer des services pendant le dessin/l'édition ; actions dangereuses testées sur équipement fictif.
- Aperçu des appareils/cibles affectés ; avertissements sur `all`, multi-zones, erreurs de champs, mises en route de chauffage et volumes audio.
- Arrêts/timeout pour attentes et boucles ; avertissements sur répétitions sans limite ; explication de `mode` et du risque de doublon.
- Version de config et lecture avant écriture, validation côté serveur, sauvegarde d'ancien objet et restauration, aucune écriture destructrice en cas de modification externe.
- Simuler et tester : aucun déclencheur, une/plusieurs zones, compte enfant, édition tablette, objets HA existants et non KIMIA, Jinja complexe, blueprint, service non supporté, absence de réseau, mises à jour HA, options inconnues, rollback.
- Suite de non-régression : navigateur (interaction clavier/tactile), CI pure JS (serialize/deserialize sans perte), intégration VM210, consommation mémoire/performance, droits des comptes, scénarios d'alarme non exécutés involontairement.

## 9. Ordre de réalisation — éviter une deuxième usine à gaz
**Étape 1 — Design/prototype** : écran Mes routines, création guidée, éditeur visuel avancé ; 3 parcours de référence « Bonne nuit », « Lumière automatique », « Chauffage si énergie solaire » ; contrôler la lisibilité mobile/tablette avant JS productif.
**Étape 2 — Moteur fiable** : introspection HA, routage scripts/automations, lecture de TOUTES les routines, préservation des blocs non reconnus, sauvegarde non destructive ; tests.
**Étape 3 — Fonctionnel grand public** : commandes essentielles, zones, horaires, états/seuils, conditions, scénarios, automatismes ; gérer/dupliquer/tester/exécuter ; migration additive de l'ancienne V1.6.
**Étape 4 — Fonctions avancées** : choose/if/wait/repeat/parallel, paramètres, variables, modes, traces, services d'intégration et capteurs dynamiques.
**Étape 5 — Expertise/progression** : blueprints, templates, import YAML read-only/fidèle et redirection native HA robuste ; amélioration incrémentale suivant tests clients.

Critères d'acceptation avant déploiement : (1) novice crée « Bonne nuit » sans voir d'ID ni YAML, (2) admin crée une automation à deux triggers et groupes conditionnels, (3) une automation HA complexe reste intacte à l'ouverture, (4) tout plan client et toute zone HA fonctionnent, (5) aucune commande réelle pendant configuration, (6) version Proxmox stable conservée et restauration possible, (7) aucun dashboard ou autre composant KIMIA réécrit.

## 10. Références fonctionnelles Home Assistant (octobre 2026)
- https://www.home-assistant.io/docs/automation/trigger/
- https://www.home-assistant.io/docs/automation/condition/
- https://www.home-assistant.io/docs/automation/action/
- https://www.home-assistant.io/docs/automation/building-blocks/
- https://www.home-assistant.io/docs/automation/targets/
- https://www.home-assistant.io/docs/automation/editor/
- https://www.home-assistant.io/docs/scripts/
- https://www.home-assistant.io/docs/automation/which-tool-to-use/

**Ce document est la spécification cible, pas une affirmation que toutes les options listées sont déjà implémentées dans KIMIA.** La compatibilité effective doit être vérifiée fonction par fonction contre la version HA du client.
