# Installation et adaptation pour un client NDADOMO

Cette procédure utilise [maquette_demo.yaml](./maquette_demo.yaml) comme **point de départ**, pas comme plan prêt à l'emploi.

## 1. Prérequis

1. Une installation Home Assistant fonctionnelle.
2. La carte personnalisée [Maquette Card](https://github.com/TooMuhtsh/maquette-card) installée via HACS et chargée dans les ressources du tableau de bord.
3. Les intégrations correspondant aux équipements réels : Zigbee, volets, Google Cast, photovoltaïque si présent.

## 2. Créer un plan à l'échelle

Les coordonnées du plan Maquette sont en **centimètres**. Adapter les `rooms[].poly`, `walls` et `openings` à la géométrie réelle ; ne pas conserver les pièces fictives du modèle.

Pour un fond illustré, produire un PNG aux mêmes proportions. À 1 pixel/cm, une maquette couvrant 800 × 750 cm requiert un PNG de 800 × 750 px. L'élément `background` doit avoir les mêmes dimensions, et `pos` doit indiquer la coordonnée du coin supérieur gauche de l'image sur le plan.

Copier le PNG dans `/config/www/maquette/calque_demo.png`. Le chemin HA devient `/local/maquette/calque_demo.png`. Activer `show: always`. Lorsque le PNG inclut le mobilier, masquer le calque natif `furniture` pour éviter de le dessiner deux fois.

## 3. Associer les entités

Dans Home Assistant, ouvrir **Outils de développement → Modèles** et utiliser :

```jinja2
{% for zone in areas() | sort %}
=== {{ area_name(zone) }} ===
{% for entite in area_entities(zone) | sort %}
{{ entite }} | {{ state_attr(entite, 'friendly_name') or entite }}
{% endfor %}
{% endfor %}
```

Remplacer toutes les entités de démonstration, en particulier :

- `light.cuisine_principale`
- `media_player.enceinte_google_cuisine`
- `media_player.enceinte_google_salon`
- `sensor.production_solaire_actuelle`
- `sensor.production_solaire_jour`
- `sensor.consommation_maison_actuelle`

Pour une installation sans production photovoltaïque, supprimer la pastille solaire et `texts[].info` associés.

## 4. Orienter et valider

- Régler `ambience.north` selon le nord réel : **0° = haut**, **90° = droite**, **180° = bas**, **270° = gauche**.
- Associer les fenêtres et volets aux bonnes entités.
- Vérifier sur tablette et téléphone : positions, zoom, lisibilité, halos, accès aux commandes multimédias.
- Vérifier les unités des capteurs : kW et W ne sont pas interchangeables. Ne pas forcer une unité incorrecte.
- Confirmer que les capteurs électriques enregistrent leur historique avant d'attendre un graphique sur 24 h.

## 5. Exploitation

- L'automatisation Zigbee et le plan HA peuvent fonctionner sur le réseau local sans Internet, selon les intégrations choisies.
- **Google Cast** et les services musicaux externes peuvent dépendre d'Internet.
- Ne pas présumer qu'un service cloud est disponible au Gabon : tester sur place.
- Prévoir une procédure de sauvegarde, restauration et maintenance à distance adaptée au client.

## 6. Confidentialité

Ne jamais publier ici les plans de maisons de clients, leur photo de maison, leurs identifiants d'entités personnels, leurs URL d'accès distant, IP ou secrets. Garder ces données dans une sauvegarde privée du client.
