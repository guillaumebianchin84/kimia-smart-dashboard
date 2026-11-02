# KIMIA Voice V5 - Câblage XVF3800 / ESP32-S3 N16R8 - REV C

**Décision retenue pour le prototype** : un connecteur **6 broches pour les 6 signaux de communication** (4 I2S + 2 I2C), et un **connecteur 2 broches +5V / GND** indépendant raccordé à une future carte de distribution 5V.

**Statut** : proposition techniquement plausible (GPIO Matrix ESP32-S3) mais **pas encore compilée ni testée sur le N16R8**. Ne pas souder définitivement avant validation du montage et du firmware. Cette REV C remplace le mapping I2C/I2S de la REV B ; ne pas utiliser REV B pour les nouveaux fils.

## Câble de communication : 6 broches voisines

Avec le N16R8 photographié orienté **antenne en haut et prises USB-C en bas**, la colonne de **droite** comporte successivement : GND, TX/GPIO43, RX/GPIO44, **GPIO1, GPIO2, GPIO42, GPIO41, GPIO40, GPIO39**.

| Position sur connecteur 6P, de haut en bas | GPIO N16R8 | Pastille sérigraphiée XVF3800 | Fonction |
| ---: | --- | --- | --- |
| 1 | **GPIO1** | **I2C_SDA** | Bus de contrôle I2C, données |
| 2 | **GPIO2** | **I2C_SCL** | Bus de contrôle I2C, horloge |
| 3 | **GPIO42** | **I2S_BCLK** | Horloge bits audio |
| 4 | **GPIO41** | **I2S_LRCK** | Horloge gauche/droite |
| 5 | **GPIO40** | **I2S_DATA1** | Audio micro XVF → ESP32 |
| 6 | **GPIO39** | **I2S_DATA0** | Audio ESP32 → XVF / DAC |

**Signaux logiques 3,3 V.** Aucun 5 V dans le connecteur de données.

## Câble alimentation : 2 broches séparées

| Position | Signal | Destination |
| ---: | --- | --- |
| 1 | **+5V** | pastille **5V** XVF3800, source commune via future carte de distribution |
| 2 | **GND** | pastille **GND** XVF3800, masse commune avec N16R8 |

Identifier l'entrée d'alimentation exacte du XVF et les protections avant branchement, contrôler polarité et absence de court-circuit. Ne pas mettre 5V externe et USB simultanément sans vérification de l'alimentation des modules. Masse commune indispensable pour les signaux.

## Pastilles inutilisées pour le premier test

- 3.3V : non branchée au N16R8.
- MCLK : non câblée, pour le firmware I2S XVF/ESPHome adapté.
- XIAO_D0, XIAO_D1, XIAO_D2, XIAO_D3 : non câblées ; il ne s'agit pas des quatre microphones.
- Visaton FR7 : **les deux fils sur la sortie JST amplifiée du XVF**, jamais au GND ou à une GPIO.

**Important** : le XVF3800 est livré avec son XIAO ESP32-S3 soudé ; ne jamais commander les bus depuis deux hôtes actifs. Confirmer le retrait/isolement correct du XIAO et l'état des pastilles.

## Impact programmation ESPHome (formatBCE)

L'exemple original est destiné au XIAO directement intégré : sa remarque « pins fixed by board layout » concerne **la carte XIAO montée**. Sur notre **N16R8 externe relié par fils**, l'ESP32-S3 peut router les signaux I2C/I2S sur d'autres GPIO via la matrice GPIO, sous réserve de tester le firmware et les timings.

Dans la configuration formatBCE, modifier les affectations :

- **packages/base.yaml**, bloc I2C internal_i2c : **GPIO5 → GPIO1 (SDA)**, **GPIO6 → GPIO2 (SCL)**.
- **packages/hardware.yaml**, bus i2s_input **et** i2s_output : LRCK **GPIO7 → GPIO41**, BCLK **GPIO8 → GPIO42**.
- Dans le même fichier : microphone i2s_mics_raw / i2s_din_pin **GPIO43 → GPIO40**.
- Dans le même fichier : speaker i2s_audio_speaker / i2s_dout_pin **GPIO44 → GPIO39**.
- Conserver **tous les autres paramètres audio** (I2S secondary, codec AIC3104, mixeur, buffers, fréquence, etc.).
- Le bus I2C du tactile Waveshare (TP_SDA/TP_SCL) et des capteurs I2C utilisera **aussi GPIO1/2 en parallèle** ; le reste de l'écran QSPI garde les GPIO10-17, TP_RST GPIO18 et TP_INT GPIO21 selon la REV B.
- **GPIO39 à 42 ne sont plus disponibles pour JTAG externe ou pour un radar LD2410** : déplacer ce radar optionnel vers d'autres broches après revue complète.
- Vérifier la configuration de la carte N16R8 (16 MB Flash, 8 MB PSRAM), indépendamment du routage des broches.

**Ce n'est pas une simple option graphique unique** : le mapping apparaît à plusieurs endroits des packages formatBCE. Travailler sur **un fork ou des packages locaux**, pas modifier le module XIAO d'origine. Tester compilation et bon fonctionnement de la liaison I2C/I2S sur table. Ne pas flasher les configurations conçues pour le câblage d'origine en espérant qu'elles reconnaissent les nouvelles broches.

## Contrôles avant câblage et mise sous tension

1. Vérifier la sérigraphie des 6 broches du N16R8 et l'orientation des connecteurs à l'ohmmètre.
2. Vérifier les pastilles XVF après dessoudage du XIAO, sans pont ni court-circuit.
3. Vérifier les masses et polarités +5 V, les protections et la consommation.
4. Adapter et compiler ESPHome pour le N16R8, puis tester I2C (XMOS, codec) avant audio I2S.
5. Tester le micro, le Visaton puis l'écran et les capteurs.
6. Tester la stabilité et les conflits de broches ; refaire un schéma de fabrication après validation.

Références : [formatBCE base.yaml](https://github.com/formatBCE/Respeaker-XVF3800-ESPHome-integration/blob/main/packages/base.yaml), [formatBCE hardware.yaml](https://github.com/formatBCE/Respeaker-XVF3800-ESPHome-integration/blob/main/packages/hardware.yaml), [Seeed Home Assistant](https://wiki.seeedstudio.com/respeaker_xvf3800_xiao_home_assistant/), [Espressif GPIO headers](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html).

**REV C retenue : GPIO1, GPIO2, GPIO42, GPIO41, GPIO40, GPIO39 + alimentation séparée 5V/GND.**
