# KIMIA — Cartes Pièce natives sans commande (8 novembre 2026)

## Correction de l'esthétique après retour terrain

L'utilisateur souhaite **garder exactement le style de la photo Prises** : la carte de pièce « Salon », son pictogramme, son cadre coloré et ses proportions, **dans tous les onglets**. Il ne veut plus de boutons de contrôle global qui commandent les prises depuis une carte de pièce.

Le correctif précédent avait remplacé la carte Area de Sécurité par un simple titre de texte, ce qui dénaturait le dashboard. Cette branche **annule ce choix** et restaure l'apparence native.

### Configuration KIMIA de chaque carte de pièce

```yaml
type: area
area: salon
display_type: compact
features: []
features_position: bottom
grid_options:
  columns: 12
  rows: 2
tap_action:
  action: navigate
  navigation_path: /kimia-next/pieces
```

- On garde la carte native `type: area`, le cadre, l'icône et l'intitulé Home Assistant.
- `features: []` supprime le bouton général **dans chaque rubrique** (Prises, Sécurité, Pièces, Lumières, Volets, Climatisation, Musique, Eau).
- `rows: 2` réserve la hauteur native du conteneur de l'ancien bloc à commande : les proportions du cadre sont conservées sans recréer une zone cliquable de contrôle. Il peut rester un espace vide dans la partie inférieure du cadre, puisque la barre de commande a été retirée ; le rendu exact dépend du thème et de la taille de l'écran.
- On conserve le toucher sur le **cadre** pour naviguer vers Pièces, pas pour activer quoi que ce soit.
- Les tuiles des équipements eux-mêmes restent à 12 colonnes, sans autre changement.

### Migration et protections

Le moteur identifie uniquement les anciens modèles KIMIA qu'il connaît : carte Area avec `area-controls`, carte Area sans commande à hauteur automatique, ou titre Sécurité exact créé par le correctif précédent.

Sur une synchronisation, il remplace la carte de pièce en place. Il ne supprime ni le capteur de présence, ni la prise, ni les autres cartes utilisateur. Les cartes de pièce personnalisées qui ne correspondent pas à un modèle KIMIA connu restent intactes.

## Installation sur Home Assistant de test

1. Conserver une sauvegarde du dashboard `kimia-next` et du fichier actuel `/config/www/kimia-smart-core-v1.js`.
2. Télécharger **Raw** le nouveau `www/kimia-smart-core-v1.js` de cette branche et remplacer `/config/www/kimia-smart-core-v1.js`.
3. Mettre à jour **la ressource existante** dans HA vers `/local/kimia-smart-core-v1.js?v=20261108-area-nocontrol` (pas de deuxième ressource).
4. Recharger complètement le dashboard, puis aller dans KIMIA Configuration et cliquer sur **Actualiser ma maison**.
5. Vérifier Sécurité (cadre Salon restauré), Prises et les autres onglets : la pièce doit conserver son apparence, sans bouton de commande générale.
6. Si l'apparence diffère selon l'appareil et le thème, comparer la hauteur du cadre et ajuster la valeur native `rows` après essai réel, sans changer le type de carte.

Ne rien modifier au matériel Zigbee. Le diagnostic des appareils déconnectés (issue #14) reste séparé.

## Validation

- Test de migration de l'ancien titre Sécurité vers une carte Area.
- Test de suppression des commandes de pièce sur tous les onglets.
- Test de conversion des anciens modèles `area-controls`.
- Test de synchronisation idempotente, des dimensions 12/2 et de préservation des tuiles personnalisées.
- Simulation JavaScript passée ; GitHub Actions vérifie également la branche.

**Le résultat n'est pas automatiquement installé sur Home Assistant.**
