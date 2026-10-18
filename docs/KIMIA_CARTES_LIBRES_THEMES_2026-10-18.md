# KIMIA Smart — cartes éditables visuellement
18 octobre 2026 — branche `fix/kimia-cartes-libres-themes-20261018`

## Objectif
Un dashboard adapté au client, avec chaque carte déplaçable et surtout **redimensionnable dans l'éditeur visuel Home Assistant**, sans devoir modifier du code YAML.

## Ce qui change
- **Accueil inchangé depuis la précédente version de cette branche** : plan, image, scènes, météo, RSS et Navbar.
- Les cartes des onglets Lumières, Volets, Climatisation, Musique, Sécurité, Prises, Paramètres utilisent des **cartes natives Home Assistant** :
  - `type: button` pour équipements non associés, ambiances et choix de thème ;
  - `type: tile` pour la météo Libreville ;
  - `type: markdown` pour les compteurs dynamiques ;
  - `type: entities` pour le sélecteur de thème.
- Dans Actualités, **une carte RSS indépendante par source** (Gabon Actu, GabonReview, RFI Afrique, France 24). RSS News Card dispose de son éditeur visuel HACS.
- Seule `custom:navbar-card` est conservée sur les onglets secondaires comme composant spécialisé de navigation ; ne pas la redimensionner.
- Aucune grille Lovelace `type: grid`, `vertical-stack` ou `horizontal-stack` imbriquée dans les vues secondaires. Toutes les cartes sont au premier niveau des sections natives.
- Les anciens `custom:button-card` sont conservés **uniquement sur l'Accueil** pour respecter sa composition.

## Réglage de la taille
Dans KIMIA Smart :
1. Ouvrir le dashboard en mode édition.
2. Aller sur Lumières ou un autre onglet secondaire.
3. Toucher la **carte** souhaitée, puis **Modifier**.
4. Ouvrir l'onglet **Disposition** (`Layout`).
5. Changer les colonnes/lignes via la grille native (ou choisir pleine largeur).
6. Enregistrer. Déplacer les cartes par glisser-déposer en mode édition.

L'éditeur visuel reste disponible pour les cartes natives même si le dashboard a été importé en YAML brut : **il doit être un dashboard géré par l'interface (storage)**, comme le dashboard KIMIA Smart de la VM.

## Fonctions
- Scènes Détente, Soirée, Cinéma : commandes de scripts conservées.
- Équipements `À associer` : aucune action tant que les entités du client ne sont pas configurées. Sur les boutons natifs la mention textuelle disparaît, mais ils restent inactifs.
- Compteurs : Markdown Jinja alimenté par les états HA.
- Thèmes : quatre boutons natifs qui choisissent une option dans `input_select.kimia_theme_global`. Le choix actif est visible dans la carte de sélection. Le rendu effectif exige l'automatisation `KIMIA - Appliquer le thème client`, les thèmes installés et le profil utilisateur réglé sur le **thème par défaut**.
- Les boutons de préférences Météo et Journal ne sont pas présentés : ils ne pilotent pas encore l'Accueil, qui ne doit pas être modifié.

## Déploiement
1. **Sauvegarder le YAML actuellement installé**, ainsi que la VM/une sauvegarde HA si possible.
2. Sur cette branche, ouvrir `dashboard-ui-import.yaml`, choisir Raw, copier tout le fichier.
3. Dans KIMIA Smart, ouvrir l'éditeur de configuration brute **du dashboard**, coller le contenu entier et enregistrer.
4. Vérifier l'Accueil inchangé, puis ouvrir une carte de scène et constater qu'elle propose les onglets de l'éditeur visuel (Configuration et Disposition).
5. Tester le déplacement/redimensionnement, la navigation, les RSS et les quatre thèmes.

Cette configuration n'a pas été testée directement sur la VM. Garder la PR en brouillon jusqu'à validation.

## Mise en garde esthétique
Les nouveaux boutons natifs peuvent sembler plus simples que les anciennes Button Cards HACS. C'est un compromis volontaire : **la priorité est donnée à une édition visuelle fiable par le client**, pas à un habillage CSS complexe qui masque les réglages de dimension.
