# KIMIA Voice V6 — firmware laboratoire (ESPHome)

**Projet logiciel préparé pour le prototype KIMIA**, sous la branche mécanique V6. Ce dossier est indépendant du firmware Ikabot existant. Les fichiers ne sont **pas encore validés par flash sur le matériel réel**.

## Pourquoi cette architecture ?

Le `XVF3800` contient un DSP XMOS dédié (microphones 360°, formation de faisceau / filtrage), mais l'ESP32-S3 N16R8 joue le rôle d'hôte ESPHome. La configuration vocale est inspirée de [ton dépôt Ikabot XVF3800](https://github.com/guillaumebianchin84/Respeakerikabot-XVF3800-ESPHome-integration), et importe **seulement les composants nécessaires à l'écoute**. Aucun code musical, alarmes, effets LED ou gestion audio des annonces Ikabot n'est importé.

Le firmware de base expose la température, l'humidité et la pression du BME280, détecte **« Ok Nabu »** avec microWakeWord, transmet la voix à Home Assistant et publie l'état de la capture. Il **ne prononce pas encore les réponses** (pas de haut-parleur/media_player configuré), c'est intentionnel.

## Fichiers

- [kimia-voice-proto.yaml](./kimia-voice-proto.yaml) : fichier à compiler pour le premier essai audio/BME280 ;
- [packages/01_core.yaml](./packages/01_core.yaml) : réseau, PSRAM, GPIO I²C, API et OTA ;
- [packages/02_bme280.yaml](./packages/02_bme280.yaml) : capteur T°, HR, pression (adresse I²C provisoire 0x76) ;
- [packages/03_xvf_ecoute_seule.yaml](./packages/03_xvf_ecoute_seule.yaml) : XVF, I²S, wake word, STT, états Home Assistant ;
- [packages/04_ecran_visage_experimental.yaml](./packages/04_ecran_visage_experimental.yaml) : afficheur QSPI ST77916, tactile CST816S, premier visage LVGL (non chargé par défaut) ;
- [secrets.yaml.example](./secrets.yaml.example) : structure des secrets (copier en secrets.yaml et renseigner).

## Brochage — REV B (30 octobre 2026)

Source : **KIMIA_Voice_V5_Schema_Cablage_REV_B.pdf** déjà validé comme proposition de câblage. **Aucune broche modifiée**.

| Interface | Signal | ESP32-S3 |
|---|---|---|
| I²C partagé | SDA / SCL | GPIO5 / GPIO6 |
| XVF3800 I²S | LRCK / BCLK | GPIO7 / GPIO8 |
| XVF3800 I²S | DATA1 micro vers ESP | GPIO43 |
| XVF3800 I²S | DATA0 sortie HP vers XVF | GPIO44 — réservée, non activée dans ce firmware |
| Waveshare QSPI | SCLK | GPIO10 |
| Waveshare QSPI | IO0, IO1, IO2, IO3 | GPIO11, 12, 13, 14 |
| Waveshare écran | CS, RST, BL | GPIO15, 16, 17 |
| Waveshare CST816S | RST, INT | GPIO18, 21 |
| Radar LD2410 (facultatif) | RX / TX | GPIO41 / GPIO40 — non activé |

### Précautions avant alimentation

1. **Ne pas connecter un deuxième ESP32 actif au XVF3800 tant que son XIAO d'origine est soudé et potentiellement actif.** Le schéma REV B exige l'isolement électrique des lignes partagées, à valider au multimètre. Ne pas improviser un dessoudage sous tension.
2. **ESP32-S3 en logique 3,3 V** : BME280 alimenté en 3,3 V uniquement si la carte reçue le permet et vérifier ses éventuels convertisseurs de niveau SDA/SCL. Ne jamais envoyer du 5 V sur les GPIO.
3. GPIO43/44 sont également des broches UART0 : `logger.baud_rate: 0` désactive les logs série UART susceptibles de perturber I²S ; les logs restent accessibles via réseau/API.
4. Alimentation 5 V stabilisée, masses communes, câblage court et vérification de la source, polarité et protection (pas de 5 V et USB simultanés sans contrôle du chemin de courant).
5. Le haut-parleur Visaton 4 Ω doit être raccordé **uniquement à la sortie amplifiée adaptée du XVF**, jamais directement à un GPIO ni à la masse ESP32.

## Ordre recommandé de tests

1. **ESP seul** : copier `secrets.yaml.example` vers `secrets.yaml`, saisir les valeurs, puis lancer une vérification statique et compiler sans brancher le XVF.
2. **BME280** : mesurer les tensions, vérifier l'adresse I²C (0x76 ou 0x77), puis mesurer T°, humidité et pression.
3. **Écran seul** : décommenter `face_experimentale` dans le fichier principal **uniquement après réception de l'écran**. Tester la séquence ST77916, le rétroéclairage, le tactile puis l'animation ; la puce ST77916 est prise en charge par un preset mipi_spi ESP-VOCAT, mais **le panneau Waveshare n'est pas identique : compatibilité non garantie**.
4. **XVF3800** : confirmer le montage matériel du XIAO, le firmware XMOS I²C et les signaux I²S. Aucun flash XVF avant cette vérification. Détecter Ok Nabu puis capturer une commande vers Home Assistant.
5. **Ensuite seulement** : intégrer les réponses vocales, Music Assistant et les interactions écran. Ces fonctions ne font pas partie du firmware d'écoute initial.

### Commandes ESPHome

Depuis le dossier `firmware/kimia-voice-v6` :

```bash
esphome config kimia-voice-proto.yaml
esphome compile kimia-voice-proto.yaml
esphome run kimia-voice-proto.yaml
```

La commande `run` **flashe la carte** : ne l'exécuter qu'après les contrôles électriques. `esphome config` ne flashe pas de matériel.

**Statut : première base logicielle prête pour vérification de configuration, pas encore un firmware validé au banc.**
