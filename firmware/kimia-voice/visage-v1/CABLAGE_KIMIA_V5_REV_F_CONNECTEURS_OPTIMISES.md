# KIMIA Voice V5 — REV F : connecteurs optimisés sur ESP32-S3 N16R8

**Choix retenu le 02/11/2026 — référence actuelle pour le prototype, non compilée, non testée et non validée électriquement.**

Objectif : **trois groupes de six GPIO physiquement voisines**, accessibles directement sur les deux rangées de l'ESP32-S3 N16R8 OTRONIC, pour le XVF3800 et les deux groupes de signaux de l'écran Waveshare 1,85 pouce (ST77916 / CST816S). **Alimentation à part** depuis une petite carte de distribution 5 V. La REV F remplace les affectations des REV E et antérieures ; elles restent archivées.

## Orientation et numérotation

Carte vue de dessus, **antenne en haut, deux prises USB-C en bas**, comme la photo du N16R8 fournie pour le projet. Les positions de rangées J1/J3 se basent sur le brochage sérigraphié du module photographié. Confirmer les inscriptions sur le matériel avant de fabriquer des câbles. Les numéros **1 à 6 de nos connecteurs** sont une convention de fabrication, **pas** la numérotation d'une prise intégrée à l'ESP32.

### Connecteur XVF-6P — côté DROIT, GPIO1 / GPIO2 / GPIO42 / GPIO41 / GPIO40 / GPIO39

Conserve l'affectation des REV C/D/E : six broches successives, côté droit, entre RX/GPIO44 et GPIO38.

| Pin XVF-6P (haut → bas) | ESP32-S3 | Broche XVF3800 | Fonction |
| ---: | --- | --- | --- |
| 1 | **GPIO1** | I2C_SDA | Bus I²C n° 1, données |
| 2 | **GPIO2** | I2C_SCL | Bus I²C n° 1, horloge |
| 3 | **GPIO42** | I2S_BCLK | Horloge I²S |
| 4 | **GPIO41** | I2S_LRCK | Synchronisation I²S |
| 5 | **GPIO40** | I2S_DATA1 | Micros XVF → ESP32 |
| 6 | **GPIO39** | I2S_DATA0 | Audio ESP32 → XVF |

Les GPIO39 à 42 ne sont **plus disponibles pour le radar UART ni pour le JTAG externe** pendant l'utilisation audio. Le XIAO ESP32-S3 d'origine du XVF doit être retiré/isolé avant tout pilotage par le N16R8 externe ; ne pas mettre deux hôtes actifs sur les mêmes lignes.

### Connecteur ÉCRAN-A-6P — côté GAUCHE, GPIO9 / GPIO10 / GPIO11 / GPIO12 / GPIO13 / GPIO14

Six GPIO consécutives **vers le bas** de la colonne gauche (J1 positions 15 à 20). Affectation QSPI optimisée par rapport à la REV E, en correspondant aux fonctions **SPI2 IO_MUX** de l'ESP32-S3 : HD (IO3), CS0, MOSI (IO0), SCLK, MISO (IO1), WP (IO2). C'est une **correspondance matérielle favorable**, sans garantie de performances avant validation du pilote ST77916. Attention : les niveaux réels et fonctions QSPI se configurent dans le firmware.

| Pin A (haut → bas) | ESP32-S3 | Signal Waveshare | Broche du GH1.25 15P |
| ---: | --- | --- | ---: |
| 1 | **GPIO9** | **LCD_IO3** | **6** |
| 2 | **GPIO10** | **LCD_CS** | **8** |
| 3 | **GPIO11** | **LCD_IO0** | **3** |
| 4 | **GPIO12** | **LCD_SCLK** | **7** |
| 5 | **GPIO13** | **LCD_IO1** | **4** |
| 6 | **GPIO14** | **LCD_IO2** | **5** |

**Sécurité de détrompage essentielle : GPIO14 est immédiatement voisin de la broche ESP32 « 5V » sur ce côté.** Un connecteur 6P enfoncé avec un décalage d'un trou **pourrait envoyer 5 V sur une entrée/sortie et endommager la carte ou l'écran**. Prévoir un connecteur mécaniquement détrompé, une embase de regroupement fixée ou une protection anti-décalage, et contrôler la position avant la première alimentation. Ne pas considérer un simple connecteur femelle Dupont 6P comme impossible à décaler.

### Connecteur ÉCRAN-B-6P — côté GAUCHE, GPIO4 / GPIO5 / GPIO6 / GPIO7 / GPIO15 / GPIO16

Six broches consécutives en haut de la colonne gauche (J1 positions 4 à 9). **Amélioration de la REV E : plus besoin d'aller chercher GPIO5 et 6 ailleurs pour former le connecteur B.** GPIO17 et GPIO18 sont libérées pour de futures fonctions (par exemple UART radar LD2410 si les paramètres matériels sont compatibles).

| Pin B (haut → bas) | ESP32-S3 | Signal Waveshare | Broche du GH1.25 15P |
| ---: | --- | --- | ---: |
| 1 | **GPIO4** | **LCD_RST** | **10** |
| 2 | **GPIO5** | **TP_SDA** | **12** |
| 3 | **GPIO6** | **TP_SCL** | **13** |
| 4 | **GPIO7** | **LCD_BL** | **11** |
| 5 | **GPIO15** | **TP_RST** | **14** |
| 6 | **GPIO16** | **TP_INT** | **15** |

Le tactile utilise le bus I²C n° 2 : SDA=GPIO5, SCL=GPIO6, **indépendant du XVF** ; un capteur T/H **s'il est bien I²C** pourra partager ce bus, sur un connecteur physique distinct. Vérifier adresses et tensions.

### Alimentations séparées : connecteurs 2P vers distribution 5 V

| Équipement | Alimentation prévue | Note |
| --- | --- | --- |
| ESP32-S3 N16R8 | Entrée 5 V / GND via distribution, à valider | Éviter retour de courant si USB-C branché |
| XVF3800 | +5 V / GND sur son connecteur 2P | Vérifier points d'alimentation effectifs et XIAO isolé |
| Écran Waveshare | **GH1.25 pin 1 VCC**, **pin 2 GND** via connecteur 2P | Module annoncé 3,3/5 V, confirmer comportement du modèle reçu |
| Capteur T/H éventuel | 3,3 V ou tension requise selon référence exacte | Ne pas envoyer automatiquement 5 V à un capteur 3,3 V |

La **broche LCD_TE du GH1.25 n° 9 reste NC**, comme pour la REV E. Les 15 fils du connecteur Waveshare sont ainsi alloués : 6 sur A + 6 sur B + 2 alimentation + 1 NC.

**Important** : l'écran Waveshare a un connecteur **GH1.25 15P**, pas directement deux embases 6P. Les groupes A/B sont les **connecteurs côté ESP32**, qui devront rejoindre le câble GH1.25 à travers un faisceau adapté ou une petite carte de regroupement. Les fils doivent respecter la correspondance ci-dessus, et non être branchés un pour un dans l'ordre 1–15.

## Capteur identifié — Bosch BME280 sur module annoncé 5 V / I²C

**Référence communiquée : « Capteur 3-en-1 Température, Humidité et Pression atmosphérique | 5V | I2C | Bosch BME280 ».** Il s'agit d'un **module**, pas d'une puce BME280 nue. Le BME280 Bosch lui-même exige VDD entre **1,71 et 3,6 V** et VDDIO jusqu'à **3,6 V** ; **la carte doit comporter un régulateur** pour accepter une alimentation 5 V. La présence d'un **convertisseur de niveaux I²C n'est pas encore confirmée** pour le module exact.

### Connecteur capteur BME-4P dédié, sur petite carte de distribution / dérivation

| Broche faisceau 4P | Signal BME280 (nom à confirmer sur PCB) | Liaison KIMIA |
| ---: | --- | --- |
| 1 | VCC / VIN | **+5 V seulement si la carte exacte est bien certifiée alimentation 5 V** et si régulation réellement présente ; autrement alimentation 3,3 V selon documentation PCB |
| 2 | GND | GND commun ESP32 / écran / XVF |
| 3 | SDA | **GPIO5**, bus I²C n° 2, en parallèle avec TP_SDA écran |
| 4 | SCL | **GPIO6**, bus I²C n° 2, en parallèle avec TP_SCL écran |

**Ordre 1–4 = convention de notre faisceau, PAS la sérigraphie physique du module** : contrôler les pads exacts (GND, VCC, SCL, SDA et leur ordre) à réception. Il n'y a **aucune nouvelle GPIO à réserver** : on crée une **dérivation I²C** sur la carte de distribution, et un connecteur capteur 4P indépendant pour faciliter le démontage.

**Vérification critique avant connexion ESP32** : alimenter le module sur banc conformément à la fiche fabricant, puis mesurer au multimètre la tension à l'état haut sur SDA et SCL **sans connecter les GPIO**. Si ces lignes sont rappelées au 5 V, **ne pas raccorder directement à GPIO5/6** ; utiliser une adaptation de niveau I²C ou passer à un module 3,3 V. Si elles sont à 3,3 V, vérifier aussi les éventuelles résistances pull-up en parallèle avec celles de l'écran (et les schémas correspondants).

ESPHome : **`sensor: - platform: bme280_i2c`**, bus **`i2c_id: peripherals_i2c`**, adresse **`0x76` ou `0x77`** selon module / scan, `temperature`, `humidity` et `pressure`, intervalle envisagé 60 s. Exemple de structure :

```yaml
sensor:
  - platform: bme280_i2c
    i2c_id: peripherals_i2c
    address: 0x76 # adapter à l'adresse réelle retournée par le scan
    temperature:
      name: "KIMIA - Température ambiante"
    humidity:
      name: "KIMIA - Humidité ambiante"
    pressure:
      name: "KIMIA - Pression atmosphérique"
    update_interval: 60s
```

**Emplacement physique** : près d'une petite grille d'aération, hors du flux chaud de l'ESP32, du régulateur 5 V et du haut-parleur ; suffisamment éloigné de l'écran et sans exposer le capteur à la chaleur du boîtier. Ne pas confiner le capteur dans un compartiment complètement étanche.

Références : [fiche technique Bosch BME280](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf), [ESPHome BME280](https://esphome.io/components/sensor/bme280/).

## Bus I²C et résistances de rappel

- **I²C n° 1 : XVF3800 + codec audio**, SDA GPIO1 / SCL GPIO2 ; ESPHome `internal_i2c`.
- **I²C n° 2 : tactile Waveshare + capteur(s) I²C**, SDA GPIO5 / SCL GPIO6 ; ESPHome `peripherals_i2c`.
- Chaque bus requiert des résistances de rappel adaptées vers **3,3 V**, mais les modules peuvent déjà en posséder. Vérifier les circuits avant d'en ajouter ; valeurs et fréquence à fixer au banc.
- Toutes les masses doivent être communes, aucun signal GPIO exposé au +5 V, fils courts et connecteurs détrompés.

## Impacts ESPHome (à programmer, pas encore effectués)

1. Réaffecter dans le firmware local formatBCE le bus I²C `internal_i2c` vers GPIO1/2 et les deux bus I²S vers **BCLK 42, LRCK 41**, entrée audio **DIN 40**, sortie **DOUT 39**.
2. Déclarer le second bus I²C `peripherals_i2c` sur GPIO5/6 et y associer le tactile CST816S et le capteur I²C.
3. **Réviser le mapping QSPI REV E** : ÉCRAN-A = IO3 GPIO9, CS GPIO10, IO0 GPIO11, CLK GPIO12, IO1 GPIO13, IO2 GPIO14.
4. **Réviser le mapping contrôle REV E** : ÉCRAN-B = LCD_RST GPIO4, TP_SDA GPIO5, TP_SCL GPIO6, LCD_BL GPIO7, TP_RST GPIO15, TP_INT GPIO16.
5. Prévoir les modules/fonctions d'affichage **ST77916 QSPI + tactile CST816S**. Le prototype `visage-lvgl.yaml` ne contient pas encore cette intégration ; le pilote doit être validé par compilation, avec vérification de l'initialisation ST77916 et du contrôle du rétroéclairage.
6. GPIO17 et GPIO18 libérées, **non encore affectées** ; le futur radar reste optionnel.
7. Vérifier les paramètres spécifiques au N16R8 : 16 Mo flash, 8 Mo PSRAM, USB-C, GPIO réservées.

## Vérifications avant fabrication

1. Contrôle mécanique sur la **vraie carte** : groupes adjacents GPIO1/2/42/41/40/39 ; GPIO4/5/6/7/15/16 ; GPIO9/10/11/12/13/14.
2. **Détrompage réel du connecteur A près du 5 V** ; orientation de tous les 6P, numérotation côté broches mâles/femelles.
3. Vérifier l'ordre réel des conducteurs du câble **GH1.25 15P** avec un ohmmètre ; ne jamais supposer le même ordre en le retournant.
4. Tester alimentation 5 V, GND commun, protections et risque d'alimentations USB simultanées.
5. Adapter, compiler, flasher ESPHome puis tester séparément XVF, écran et tactile, enfin ensemble.
6. Après validation des fonctions, préparer un éventuel PCB de distribution / regroupement.

### Sources consultées

- [Waveshare, brochage du module 1,85″](https://www.waveshare.com/product/1.85inch-touch-lcd-module.htm)
- [Espressif, correspondance SPI2 IO_MUX (GPIO9 à 14)](https://docs.espressif.com/projects/esp-idf/en/v5.1/esp32s3/api-reference/peripherals/spi_master.html)
- [ESP32-S3 GPIO Matrix](https://documentation.espressif.com/api/resource/doc/file/lYZaWm1x/FILE/esp32-s3_datasheet_en.pdf)
- [formatBCE ESPHome XVF3800](https://github.com/formatBCE/Respeaker-XVF3800-ESPHome-integration)
- [Fichiers d'origine Waveshare](https://github.com/waveshareteam/1.85inch-Touch-LCD-Module)

**REV F retenue : trois connecteurs de 6 broches physiquement contiguës, alimentations séparées et deux bus I²C. Aucune modification de firmware n'a encore été réalisée.**
