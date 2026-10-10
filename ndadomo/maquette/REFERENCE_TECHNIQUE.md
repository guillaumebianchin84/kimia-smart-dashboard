# Référence technique — Maquette Card v0.2.0

Ce document synthétise les choix reproductibles sur d'autres logements, sans copier un plan privé.

## Pièces, objets et fonds

- `floors[].rooms[].poly` représente les contours géométriques d'une pièce en cm.
- `walls` et `openings` décrivent murs, portes et fenêtres ; les volets utilisent `shutter: cover.xxx`.
- `background.image`, `pos`, `width`, `height`, `opacity`, `show: always` permettent d'aligner un calque PNG.
- Si les meubles sont dans le PNG, `layers.hidden: [rooms, furniture]` peut éviter la superposition du sol et du mobilier dessiné par Maquette. Garder `walls`, `openings` et `badges` visibles.
- Les coordonnées du plan et de l'image doivent avoir la même échelle ; ne pas décaler arbitrairement le PNG après calibration.

Exemple de configuration (dimensions *fictives*) :

```yaml
background:
  image: /local/maquette/calque_demo.png
  pos: [0, 0]
  width: 800
  height: 750
  opacity: 0.75
  show: always
```

## Éclairage et halos

Une pastille `light` avec `halo` affiche un rayonnement lorsqu'elle est active. Pour une rangée de cinq spots Hue réglables indépendamment, créer **cinq badges avec cinq entités** distinctes. `room` peut limiter le halo à la pièce. `zoom_only: true` rend la pastille visible seulement dans la vue de la pièce.

```yaml
- entity: light.spot_1
  name: Spot 1
  pos: [500, 400]
  icon: mdi:circle-small
  halo: 180
  room: Salon
  zoom_only: true
```

`ambience.light.lamps: true` active le traitement des éclairages. Éviter de figer la couleur en jaune si l'objectif est de refléter les couleurs indépendantes des ampoules.

## Enceintes et télévision

Pour une enceinte Google :

```yaml
- entity: media_player.enceinte_cuisine
  name: Enceinte cuisine
  pos: [650, 300]
  icon: mdi:speaker-wireless
  room: Cuisine
  tap: more_info
```

Le toucher ouvre la fenêtre **Plus d'infos** native de Home Assistant. L'appareil doit être joignable pour répondre aux commandes. Pour une TV ou un boîtier multimédia, utiliser de la même façon l'entité `media_player` réellement opérationnelle. Ne pas dupliquer un même appareil dans toutes les pièces si ce n'est pas souhaité.

## Production solaire

Une zone `texts[].info` permet d'afficher sur le plan la production actuelle et celle du jour. Une pastille solaire avec `card.widgets` fournit au toucher un widget `tile` avec `history: 24` pour la **courbe 24 h**.

**Limite : Maquette Card v0.2.0 n'affiche pas un vrai graphique d'historique directement dans le dessin**. L'encart de valeurs est sur le plan ; la courbe est dans la fiche.

Préférer les mesures locales disponibles à un service cloud dégradé. Vérifier les unités : si la sonde renvoie des kW, ne pas simplement afficher `unit: W` ; prévoir un capteur HA converti correctement ou conserver l'unité native.

## Soleil et météo

`ambience.north` définit le nord dans le sens horaire depuis le haut du plan, indépendamment de sa géométrie. L'angle est propre à **chaque maison** ; ne jamais recopier celui d'une autre habitation. `ambience.weather` peut relier une entité météorologique locale.

## Déploiement Gabon

- Base privilégiée : Home Assistant local, réseau Wi-Fi fiable, Zigbee pour les accessoires compatibles.
- Les commandes et automatisations locales doivent rester utilisables lors des coupures Internet.
- L'enceinte Google reste un périphérique multimédia/commande dépendant de ses propres conditions de disponibilité ; tester les services cloud au Gabon.
- Accès distant : solution choisie et déployée séparément, sans publier les identifiants de tunnel.
- Préparer une **copie privée par client**, ne pas mettre ses plans ou secrets dans ce dépôt public.

Source technique : [documentation Maquette Card](https://github.com/TooMuhtsh/maquette-card).
