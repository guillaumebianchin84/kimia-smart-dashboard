# KIMIA Smart — plan interactif Maquette Card

## Ce que nous intégrons

Maquette Card de TooMuhtsh est une **carte Lovelace** de plan interactif,
et non une bibliothèque pour embellir automatiquement les cartes existantes.

Source : https://github.com/TooMuhtsh/maquette-card
Documentation FR : https://github.com/TooMuhtsh/maquette-card/wiki/Home-FR
README FR : https://github.com/TooMuhtsh/maquette-card/blob/main/README.fr.md

La page KIMIA `Plan de maison` utilise une vue native `type: panel`
avec **une seule carte** Maquette. Les autres pages KIMIA
conservent une carte par équipement, déplaçable via l'éditeur HA.

## Installation HACS

Version officielle stable vérifiée : **v0.2.0 (9 octobre 2026)**.
La bibliothèque est très récente. Avant un déploiement au Gabon,
la tester sur un Home Assistant témoin.

1. Dans HACS, choisir **Dépôts personnalisés**.
2. Ajouter `https://github.com/TooMuhtsh/maquette-card` (catégorie **Dashboard**).
3. Installer **Maquette** puis recharger l'interface HA.
4. Si installation manuelle, suivre le README auteur : fichier JS de
   release, copie dans `/config/www/` et ressource module JavaScript.

KIMIA ne copie ni ne modifie le code de Maquette (licence MIT).

## Voir un résultat immédiatement : démo SANS action

Importer le fichier `maquette-demo-ui-import.yaml` dans un
nouveau dashboard **de test**, géré par l'interface HA.

Le fichier utilise le mode de démonstration documenté par l'auteur :

```yaml
type: custom:maquette-card
demo: true
title: Appartement de démonstration
language: fr
```

**Tous les états sont simulés**, aucune action réelle ne sera
envoyée à ta maison.

## Créer un vrai plan

La vue réelle est incluse dans `dashboard-ui-import.yaml` à l'adresse
`/kimia-smart/plan` et dans la source `views/10-plan-maison.yaml` :

```yaml
type: custom:maquette-card
id: kimia_plan_maison
title: Plan de ma maison
language: fr
full_page: true
```

Ce plan est **vide au début** : nous n'avons pas de plan coté du client.

Avec un compte Home Assistant **administrateur** :
- ouvrir Plan de maison puis l'éditeur intégré ;
- choisir **Démarrer avec mes pièces** pour préparer les espaces
  depuis les zones HA, ou tracer les pièces, murs et ouvertures ;
- positionner les équipements et lier leurs entités HA ;
- enregistrer dans le dashboard depuis l'éditeur Maquette.

Le projet gère les étages, volets, halos lumineux, ambiance jour/nuit,
widgets, capteurs et une image de plan à décalquer.
**L'éditeur ne devine pas les dimensions ni l'agencement réel**.

Le tableau de bord doit être **géré par l'interface (mode storage)** :
l'éditeur Maquette doit pouvoir sauvegarder la configuration de la carte.
Ne pas faire le dessin définitif dans un dashboard YAML figé.

## Droits et maintenance

L'auteur réserve l'édition du plan aux **administrateurs HA**.
Les clients non administrateurs peuvent consulter le plan et
utiliser ses commandes. Certaines actions sensibles entraînent
une confirmation ; les vérifier lors des essais.

Maquette doit rester **facultative** dans une offre commerciale
jusqu'à validation de son fonctionnement sur téléphone, tablette
et des quatre thèmes KIMIA. Une mise à jour de cette carte HACS
pourrait imposer des vérifications supplémentaires.

Avant déploiement :
1. Vérifier affichage démo mobile/tablette.
2. Dessiner une pièce et enregistrer.
3. Associer une vraie lumière, un volet et un capteur.
4. Vérifier commandes et confirmations.
5. Tester compatibilité avec tous les thèmes et les profils non admin.
6. Sauvegarder et restaurer le plan sur une VM.

**Rien n'a été exécuté sur l'installation de la maison.**
