# KIMIA Smart by PROMAINT — V0.8 : accueil Maquette sur tablette

**Statut : prototype GitHub non installé ni validé visuellement sur la VM.**

## Objectif

Une seule page d'accueil, lisible et pilotable **sans défiler verticalement sur une tablette 11 pouces en paysage**.
Le plan Maquette est l'élément principal, et son panneau droit regroupe les actions quotidiennes, météo de Libreville et brèves actualités.
Les fonctions avancées restent dans leurs propres onglets. Le téléphone peut nécessiter un défilement : la contrainte "sans scroll" porte sur la tablette en paysage.

Nous utilisons directement le **mode tablette natif de Maquette**, plutôt qu'un empilement Lovelace fragile. Maquette occupe une
**vue panel** et calcule sa hauteur disponible à partir de la fenêtre. Le panneau de commandes est explicitement conservé :
`tablet: {summary: false, panels: true, burn_in: true}`.

**Point à valider sur le vrai matériel :** le manque de hauteur disponible (barre HA, zoom navigateur, barre Android) peut
comprimer le plan ou le panneau. La configuration cible la vue paysage ; elle ne garantit pas mathématiquement l'absence
de défilement sur tous les navigateurs et facteurs d'échelle. Le panneau doit rester utilisable sans déplacement de la
**page** ; si nécessaire, simplifier le nombre de widgets, masquer la barre latérale ou passer en kiosque.

## Pages retenues

| Vue | Usage |
|---|---|
| Accueil (première) | Maquette éditable, quatre scénarios, météo, deux brèves |
| Lumières | Pièces, statut des lampes, **ambiances Détente / Soirée / Cinéma** |
| Volets | Commandes détaillées à associer aux vrais `cover.*` |
| Climatisation | Appareils et consignes, sans références à une maison privée |
| Musique | Diffusion et équipements à raccorder, sans imposer Music Assistant |
| Sécurité | Capteurs et caméras, aucune affirmation d'alarme certifiée |
| Prises | Prises et consommation lorsqu'un appareil réel est installé |
| Actualités | Deux cartes RSS illustrées Gabon et Afrique/Monde |
| Paramètres | Configuration client séparée |
| Installation (dashboard séparé) | Association des scripts et contrôles admin |

Le bouton de Maquette permet à un administrateur de modifier pièces, étages, ouvertures, meubles, pastilles, couleurs et
association des entités. Les autres onglets restent utiles pour les réglages difficiles à exposer sur un plan.

## Fichiers et dépendances

**V0.8 à importer** : `dashboard-ui-import.yaml` depuis la branche **feat/tablette-maquette-v08**, dans un dashboard
**géré par l'interface** dont l'URL est exactement `kimia-smart` ; ne pas copier le fichier dans `configuration.yaml`.
La source modulaire correspondante se trouve dans `views/01-accueil.yaml` et `views/*.yaml`.

Installation HACS : Button Card, Card Mod, RSS News Card, Maquette.
**Maquette v0.3.1** est disponible au 14/10/2026 :
https://github.com/TooMuhtsh/maquette-card/releases/tag/v0.3.1 .
Tester cette version dans la VM avant de la retenir chez un client. Son option `effects: light` peut réduire les coûts
sur appareils mobiles ; la V0.8 privilégie `animation_level: reduced` pour limiter les animations répétitives.

Packages (une seule déclaration `homeassistant.packages: !include_dir_named packages`) :
- `packages/kimia_client_theme.yaml` : thèmes existants ;
- **`packages/kimia_tablette_v08.yaml`** : 7 scripts façade, 7 helpers de rattachement et 4 capteurs de synthèse ;
- `packages/kimia_rss_sources.yaml` : 4 capteurs RSS déjà installés sur la VM témoin ;
- `kimia/rss_reader.py` : outil Python requis par les capteurs RSS ;
- `themes/*.yaml` : les 4 thèmes (correction Gris Premium et Sombre conservée).

Attention à ne pas doubler les packages préexistants lors des copies.
Le package historique `kimia_rss_optional.yaml` utilise Feedreader et **n'est pas nécessaire** pour la carte RSS News Card.

Après copie du package V0.8 : vérifier la configuration Home Assistant, redémarrer Core, puis constater dans
Outils de développement → États la présence de `script.kimia_au_lit`, `script.kimia_depart`,
`script.kimia_retour`, `script.kimia_reveil`, `sensor.kimia_temperature_libreville` et des
`sensor.kimia_flash_*`.

## Scénarios : fonctionnement réel, sans fausse commande

Les quatre boutons de l'accueil et les trois ambiances dans Lumières utilisent des scripts `script.kimia_*`.
Chaque façade prend sa cible depuis un helper `input_text.kimia_cible_*`.
La cible doit être un **autre script HA existant**, de type `script.xxx` ; la famille `script.kimia_*` est refusée
pour éviter les boucles.

Exemple : un script réel `script.coucher_maison` a été créé et testé. L'installateur renseigne
`input_text.kimia_cible_au_lit = script.coucher_maison`. Le bouton **Au lit** exécute alors ce script réel.
Sans association, une notification indique le problème, **aucune lampe, aucun volet n'est actionné**.
Dans Maquette, l'activation des scripts demande confirmation selon les règles de sécurité de l'auteur.

Créer le tableau de bord `KIMIA · Installation` à l'URL `kimia-installateur`, en **administrateurs uniquement**,
puis importer `installateur-ui-import.yaml`. Ne pas donner aux comptes clients l'accès à ces helpers administratifs.

## Météo / actualités

- Météo du pilote : `weather.forecast_lbv` (Met.no, Libreville). Le panneau affiche un sensor dérivé numérique
  `sensor.kimia_temperature_libreville`, et une humidité si elle est publiée.
- Actualités : `sensor.rss_gabon_actu`, `sensor.rss_gabonreview`, `sensor.rss_rfi_afrique`, `sensor.rss_france_24`.
- Le panneau d'accueil n'affiche que les **dernières brèves** (`sensor.kimia_flash_gabon` et `sensor.kimia_flash_monde`).
- L'onglet Actualités conserve les **cartes illustrées**, avec liens et dates.

L'accès Internet sert aux données météo et RSS, **pas aux commandes domotiques locales**. Les scripts et capteurs
ne garantissent aucune mise à jour lorsque le fournisseur est inaccessible. Avant commercialisation, évaluer la disponibilité
des services et les conditions de réutilisation des articles.

## Plan témoin et personnalisation

La page d'accueil inclut un plan simple de six pièces destiné à vérifier la mise en page.
**Ce plan est explicitement fictif** : il ne correspond pas à une habitation gabonaise réelle, et ne porte
aucune commande de lampe/volet/capteur. L'installateur doit le remplacer :
1. Ouvrir Accueil avec un compte administrateur, lancer l'éditeur Maquette.
2. Effacer / adapter les pièces de démonstration et dessiner le logement réel (plans, murs, fenêtres, étages).
3. Lier chaque pièce aux *Areas* de Home Assistant.
4. Associer les équipements réels et tester chaque commande sur place.
5. Contrôler que les panneaux, scénarios et widgets fonctionnent avec un compte client non admin.

Une démo officielle indépendante (`maquette-demo-ui-import.yaml`) reste utilisable sans action sur les appareils.

## Liste d'essais obligatoire avant validation

- Tablette **11 pouces en paysage** : vérifier absence de défilement **de page**, lisibilité du plan, et possibilité
  d'atteindre les 4 scénarios sans devoir défiler dans le panneau, à l'échelle réelle.
- Résolutions / tailles de texte : navigations HA visibles, barre latérale repliée, zoom navigateur standard, éventuel kiosque.
- Téléphone : pas d'élément coupé et recours au défilement si nécessaire (la priorité sans scroll porte sur tablette).
- Maquette : entrée/sortie de l'éditeur, sauvegarde dans le dashboard UI, changement d'étage, interactions.
- Maquette : rendu de l'appartement de démo et fonctionnement avec **Gris Premium**, Clair, Sombre, Signature.
- Scripts : aucun effet si non associé ; association à un vrai script ; confirmation ; refus des cibles récursives.
- Lumières : scène d'ambiance vérifiée avec de vraies ampoules Zigbee compatibles couleur / variation.
- Actualités et météo : entités disponibles et comportement quand Internet est coupé.
- Sécurité : écran de maintenance et associations réservé admin ; aucune opération sensible sans droit/confirmation.
- Performance : fluidité tablette, veille prolongée, mémoire HACS, consommation CPU et éventuelle brûlure d'écran.
- Sauvegarder la configuration Home Assistant et **faire une sauvegarde Proxmox de la VM 210** avant modification critique.

## Limites connues

- Aucun accès réseau à la VM de test depuis GitHub : le rendu sur la tablette **reste à tester**. Ce dépôt contient des
  fichiers YAML prêts à importer, pas une installation distante ni une preuve de validation visuelle.
- Le mode tablette Maquette gère la hauteur disponible, mais **le nombre de widgets peut dépasser un très petit écran**.
  Si l'interface est trop dense, réduire le panneau à météo + 4 scripts, et laisser RSS dans l'onglet Actualités.
- Les liens vers `/kimia-client/configuration`, `/kimia-installateur/configuration`,
  et `/kimia-maintenance/maintenance` supposent la création des dashboards correspondants.
- Un jour, les sources météo et les entités devront être paramétrables par site/client plutôt que figées sur Libreville.
- Rien de cette branche V0.8 ne doit être fusionné dans `main` ou livré à un client avant essais réels.
