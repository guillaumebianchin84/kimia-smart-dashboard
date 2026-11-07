# KIMIA — Plan d'interface V15 (décisions du 07/11/2026)

> **Spécification fonctionnelle pour les prochains essais, pas encore implémentée ni validée matériellement.**
> **Ne jamais modifier la référence visuelle V14 :** `14_visage_kimia_valide_fige.yaml`.
> Le montage écran/tactile V14 fonctionne ; le XVF3800 nu est commandé mais pas encore raccordé.

## Affichage principal et mesures BME280

- **Le visage V14 reste l'écran principal**, tel que validé (taille, couleurs, expressions et animations inchangées). Ne pas l'agrandir pour l'instant ; réévaluer seulement plus tard si souhaité.
- Le BME280 doit mesurer **température (°C), humidité relative (%) et pression atmosphérique (hPa)**.
- Afficher ces **trois valeurs lisiblement sur une page dédiée** plutôt que de les superposer en permanence au visage.
- **Affichage automatique périodique :** lorsque KIMIA est au repos, la page des mesures apparaît de temps en temps, reste affichée brièvement, puis **revient automatiquement au visage**.
- **Un appui court sur le visage** ouvre immédiatement la page des mesures. Un nouvel appui peut revenir au visage ; prévoir aussi un retour automatique. La périodicité et la durée exactes restent à régler après essai ; une plage initiale proposée était toutes les 30–60 s, à confirmer et ajuster pour que ce ne soit pas envahissant.
- Pendant l'écoute, la réflexion, la parole ou une erreur active, **ne pas interrompre une expression vocale par la page météo intérieure**. Les événements de l'assistant restent prioritaires.
- En veille (rétroéclairage éteint après 120 s d'inactivité dans V14), **le premier toucher réveille uniquement l'écran**, sans déclencher une action tactile supplémentaire.

## Gestes tactiles voulus

| Geste | Comportement cible |
| --- | --- |
| Appui court sur le visage | Afficher température / humidité / pression ; retour par appui ou automatiquement |
| Glissement vertical vers le haut | Augmenter le volume de sortie audio |
| Glissement vertical vers le bas | Diminuer le volume de sortie audio |
| Glissement vertical | Afficher temporairement une jauge de volume sur le visage |
| Appui long (proposition : 2 secondes) | Basculer microphone activé / coupé, avec indication visuelle nette (micro barré lorsqu'il est coupé) |
| Glissement horizontal | Pour le moment, **conserver le changement d'expression de démonstration de V14** ; décider ultérieurement de sa fonction en mode vocal réel |

### Gestion des conflits de gestes

- Un appui long ne doit pas être interprété comme un appui court ; un glissement ne doit pas déclencher l'ouverture de la page mesures.
- Le premier toucher de réveil doit être consommé (pas de changement de mode, pas de coupure du micro, pas de modification de volume).
- Quand la page des mesures est affichée, définir une priorité explicite aux commandes de volume et micro, sans changer intempestivement d'expression.
- Le réglage de volume ne deviendra **réel** que lorsque la chaîne de lecture/volume audio (amplification ou lecteur pilotable) sera identifiée et intégrée.
- Dans la V14 actuelle les changements de mode sont une **démo locale**, pas des états confirmés par le vrai assistant.

## Coupure du microphone : exigence importante

- **Ne pas se contenter de dessiner un pictogramme :** la commande doit réellement désactiver la captation/transmission audio de l'assistant.
- Avec le nouveau XVF3800, privilégier si possible la fonction **mute matérielle / DSP** correctement confirmée par retour d'état ; vérifier concrètement le comportement, le câblage et la réactivation avant de promettre cette garantie.
- Afficher un état clair, persistant et cohérent, notamment lorsque le micro est désactivé (pictogramme rouge/barré).
- En cas d'échec de la commande ou de perte de liaison, **ne pas afficher « micro coupé » sans confirmation**.
- Ne pas confondre la coupure du microphone avec le volume du haut-parleur : ce sont deux contrôles distincts.

## Matériel et précautions pour la V15 de test

- Écran Waveshare rond 1,85", 360 × 360, ST77916, pilote ESPHome `ESP-VOCAT`, **QSPI 3 MHz** : CLK GPIO10, IO0–IO3 GPIO11–14, CS GPIO15, RST LCD GPIO16, BL GPIO17.
- Tactile détecté **CST816T**, I²C SDA GPIO5 / SCL GPIO6, IRQ GPIO21, `skip_probe: true`, **ne pas activer `reset_pin: GPIO18` dans `touchscreen:`** (écran noir observé).
- Le BME280 pourra être essayé sur **le bus I²C GPIO5/6 partagé** avec le tactile, **après contrôle des tensions logiques SDA/SCL et de la compatibilité de l'alimentation et des résistances pull-up du module**. Adresse attendue selon carte : 0x76 ou 0x77. Ne pas présumer que l'alimentation 5 V implique des signaux I²C sûrs en 3,3 V.
- **Premier essai BME280 :** valider les trois mesures dans les journaux ESPHome, puis seulement ajouter l'écran de mesures et la navigation tactile.
- La **V14 reste sauvegardée et intacte** ; tous les essais doivent être de nouveaux fichiers (V15 et suivantes). Tester une évolution à la fois pour faciliter le retour arrière.
- **Aucune liaison effective XVF3800/audio/HA dans V14**. Attendre l'arrivée du nouveau XVF3800 nu avant de développer la vraie synchronisation du visage avec le pipeline vocal.

## Critères de validation future

1. Les trois mesures BME280 sont cohérentes et continuent d'être mises à jour sans gêner le tactile.
2. La page apparaît périodiquement seulement au repos, et le visage revient tout seul.
3. Un appui court permet de consulter les mesures sans provoquer de changement d'expression accidentel.
4. Les gestes verticaux règlent effectivement le volume et montrent la jauge, une fois l'audio disponible.
5. L'appui long active/désactive réellement le microphone, avec état confirmé et indication fiable.
6. Les animations et la veille V14 restent intactes, sans régression ni nouveaux écrans noirs.

**Statut :** décisions utilisateur enregistrées ; développement V15 à faire plus tard.
