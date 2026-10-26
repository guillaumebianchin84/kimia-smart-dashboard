# KIMIA Smart — cadrage V1.5, utilisateurs et affichage
Date : 26 octobre 2026. **Phase de développement**, base : V1.4 validée sur installation démo par le responsable produit. Ne jamais assimiler tests GitHub à une validation VM réelle.

## Références et priorité
- V1.4 stable de travail : `feat/kimia-v14-carte-listes-scenarios-20261026` (commit `e820877`, GitHub Actions OK).
- Travail V1.5 isolé : `feat/kimia-v15-profils-utilisateurs-20261026`.
- VM HA KIMIA **210** uniquement. VM HA maison **100** et dashboard historique `kimia-smart` intouchables.
- Mode installation : étape par étape, pas de réimport complet du dashboard client existant.
- Priorité produit : interface simple sans YAML pour la famille ; nouvelles versions ne doivent pas effacer les cartes manuellement personnalisées.

## Décisions explicites tirées des échanges produit
1. Chaque membre utilise son **compte Home Assistant** ; les préférences KIMIA doivent le suivre sur ses appareils.
2. L'administrateur attribue les **pièces affichées** à chaque utilisateur. L'utilisateur ne peut pas réactiver une pièce masquée par l'administrateur.
3. Une pièce masquée disparaît de la vue **Pièces**, des équipements par catégorie (**Lumières, Volets, Climatisation, Prises, Musique, Sécurité**) et des liens/raccourcis pertinents dans **Accueil**. La maquette interactive nécessite un filtrage spécifique avant activation.
4. **Masquage visuel uniquement** en V1.5 : il ne retire ni appareils ni zones Home Assistant et ne crée **aucune véritable restriction d'accès**. Pas de promesse de sécurité ni de confidentialité, notamment si des utilisateurs accèdent aux API/entités HA par un autre chemin.
5. Navbar commune, quel que soit l'utilisateur ; le contenu filtré dépend du compte connecté.
6. Partager **un modèle KIMIA** entre utilisateurs est préférable à multiplier des YAML indépendants ; des tableaux de bord individuels ne sont pas une obligation.
7. **Listes To-do : option B**, jusqu'à **3 listes** visibles simultanément, empilées verticalement. Listes familiales, personnelles et tâches attribuées envisagées ; le caractère réellement privé dépend d'une gestion d'accès future.
8. Carte : l'administrateur peut créer/éditer les zones HA ; l'affichage peut sélectionner plusieurs zones et appareils explicitement autorisés, aucun téléphone suivi par défaut. L'UI de sélection doit être agréable sur mobile.
9. Paramètres devient à terme un **portail** : Utilisateurs / Affichage / Localisation / Listes / Apparence, écrans spécifiques avec lien Retour.

## Architecture recommandée pour le premier lot multi-utilisateurs
- **Identité** : ID stable de l'utilisateur HA connecté (ne pas dépendre d'un nom affiché ou du `person` associé).
- **Préférences centralisées** : stockage côté serveur KIMIA à définir avant écriture. Pas de `localStorage` comme source d'autorité ni de secrets exposés dans un dashboard public.
- **Valeur par défaut** : tant qu'aucun profil KIMIA n'a été défini, garder toutes les pièces existantes visibles pour conserver le comportement V1.4 (y compris après ajout d'un compte).
- **Administration** : carte/écran réservé admin pour choisir l'utilisateur et les pièces visibles. Ne jamais exposer d'ID HA brut aux clients.
- **Rendu** : utiliser les conditions native HA par utilisateur lorsque cela préserve les cartes modifiables. Toute carte Area / Tile doit rester un objet natif ; une fonction de visibilité ne doit pas casser sa personnalisation.
- **Synchronisation** : idempotente, avec vérification de configuration avant sauvegarde, ne modifier que les éléments standard reconnus. Vérifier sur VM les vues Sections, le mode édition, le rendu tablette et mobile.
- **Sécurité** : la carte masquée peut encore être accessible autrement dans HA ; informer explicitement. Aucune permission réelle promise.
- **Tests fonctionnels** : (a) admin voit tout (b) enfant cache Chambre parents (c) Pièces + Musique + Lumières cohérents (d) favoris Accueil sans fuite (e) autre téléphone du même compte garde la préférence (f) nouveau profil sans préférence conserve V1.4 (g) aucune carte personnalisée supprimée.

## Première modification déjà préparée sur cette branche
**Synchronisation additive des nouveaux contrôles dans `kimia-admin-next`**, sans remplacement YAML :
- ajoute si manquantes uniquement les tuiles Carte et Listes dans `Apparence → Mes rubriques`,
- ajoute si absente la carte `custom:kimia-services-v14-card` dans Apparence,
- ajoute si absente `custom:kimia-script-builder-v14-card` dans Scénarios,
- vérifie que le dashboard admin est `storage`, que rien n'a été modifié en parallèle, sauvegarde et revérifie,
- n'efface jamais une section/card de l'admin ; ne double pas les cartes et préserve les personnalisations.
- **Cette première modification ne gère pas encore les profils par utilisateur** : le module identités/préférences/visibilité reste la prochaine étape.

## Suite, par livraisons courtes
**V1.5a :** socle de synchronisation de l'administration (ci-dessus), tests GitHub + essais isolés, aucune installation automatique.
**V1.5b :** stockage centralisé des profils et éditeur admin de visibilité des pièces ; test 2 comptes distincts.
**V1.5c :** filtre des zones et équipements dans toutes les catégories, y compris maquette/Accueil ; invariants de personnalisation.
**V1.5d :** Paramètres-portail, écrans Carte / Listes (3 listes maximum), paramétrage par compte, tests multi-appareils.
**Ultérieurement :** véritable contrôle d'accès, listes réellement privées, tâches assignées, scénarios éditables, zones créées via carte.

## Déploiement
Aucune écriture dans la VM 210 par les commits GitHub. N'installer la V1.5 qu'après la réussite CI et les tests de conformité de la mise à jour. Ne pas supprimer ni écraser la V1.4 validée. Les trois cartes administrateur du lot V1.5a étaient déjà installées manuellement sur certaines démos ; dans ce cas la synchronisation doit ne rien changer.
