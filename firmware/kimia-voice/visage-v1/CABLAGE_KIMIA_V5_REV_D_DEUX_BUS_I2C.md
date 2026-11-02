# KIMIA Voice V5 — câblage retenu REV D : deux bus I²C distincts

**Décision du 02/11/2026 — référence actuelle pour le prototype.**

Statut : **affectation choisie, non compilée et non testée sur le matériel**. La présente REV D **remplace les affectations I²C de la REV C**, tout en conservant ses quatre GPIO I²S du XVF3800. Les anciennes REV B / REV C restent archivées pour traçabilité, mais ne doivent pas être utilisées pour créer le faisceau définitif.

## 1 — XVF3800 : connecteur six broches de communication

Sur le **côté droit du N16R8** photographié, antenne en haut et USB-C en bas, les six GPIO sont **physiquement voisines et dans cet ordre**.

| Broche connecteur 6P | ESP32-S3 N16R8 | XVF3800 | Rôle |
| ---: | --- | --- | --- |
| 1 | GPIO1 | I2C_SDA | I²C audio, données |
| 2 | GPIO2 | I2C_SCL | I²C audio, horloge |
| 3 | GPIO42 | I2S_BCLK | Horloge bits I²S |
| 4 | GPIO41 | I2S_LRCK | Synchronisation I²S |
| 5 | GPIO40 | I2S_DATA1 | XVF → ESP32, micros |
| 6 | GPIO39 | I2S_DATA0 | ESP32 → XVF, haut-parleur |

Connecteur 6P **signaux uniquement** ; logique 3,3 V.

**Alimentation XVF3800** : connecteur **2P séparé, +5 V / GND**, depuis une future petite carte de répartition 5 V, avec masse commune ESP32 / XVF / écran. Vérifier les polarités, le point d'injection 5 V, le comportement en présence de l'USB, les détrompeurs et la puissance réelle avant mise sous tension. **Ne pas connecter en parallèle le XIAO ESP32-S3 d'origine et le N16R8 comme deux maîtres actifs**.

## 2 — Écran et capteur : deuxième bus I²C, séparé du XVF

| Périphérique | SDA | SCL | Bus ESPHome envisagé |
| --- | --- | --- | --- |
| XVF3800 + codec audio AIC3104 | **GPIO1** | **GPIO2** | **internal_i2c** (bus n°1, audio uniquement) |
| Tactile de l'écran Waveshare CST816S | **GPIO5** | **GPIO6** | **peripherals_i2c** (bus n°2) |
| Capteur température/humidité **si modèle I²C** | **GPIO5** | **GPIO6** | **peripherals_i2c** (bus n°2, partagé avec le tactile) |
| Éventuel capteur de luminosité I²C | **GPIO5** | **GPIO6** | **peripherals_i2c** (bus n°2, partagé) |

**Deux paires SDA/SCL indépendantes** sur l'ESP32-S3. Le tactile et le capteur partagent le deuxième bus I²C mais peuvent disposer de **connecteurs physiques distincts**. Les adresses I²C doivent être compatibles et la référence exacte du capteur doit être vérifiée avant de le considérer comme I²C.

Le **contrôleur d'affichage LCD ST77916 utilise un bus QSPI distinct** de l'I²C du tactile. Son brochage LCD, ses autres lignes (RST, BL, tactile RST/INT) et les propositions de regroupement de GPIO ne sont **pas validés par cette décision** : à vérifier avec le module Waveshare réellement reçu et la compilation du pilote LVGL.

Les **broches I²S GPIO39–42** du XVF restent exclusivement réservées à l'audio. Elles ne sont donc plus disponibles simultanément pour JTAG externe ou radar LD2410.

## 3 — Configuration ESPHome à intégrer au firmware KIMIA

Le formatBCE d'origine a **un seul bus internal_i2c sur GPIO5/6**, car il est prévu pour son XIAO. Sur notre N16R8 câblé par fils, il faudra conserver **l'identifiant internal_i2c** pour le XVF/codec, le déplacer sur GPIO1/2, **et ajouter un second bus** pour écran/capteurs.

Exemple de bloc à intégrer dans une configuration adaptée (ne constitue pas un firmware complet) :

    i2c:
      - id: internal_i2c
        sda: GPIO1
        scl: GPIO2
        scan: true
        frequency: 400kHz

      - id: peripherals_i2c
        sda: GPIO5
        scl: GPIO6
        scan: true
        frequency: 100kHz

Ce sont des **fréquences de départ proposées**, à ajuster après essais. Le composant du tactile doit cibler **peripherals_i2c** (avec son option i2c_id quand prise en charge par sa plateforme) ; le capteur éventuel également. Le XVF3800 et le DAC AIC3104 restent sur **internal_i2c**.

Conserver le remapping I²S de REV C dans les deux bus I²S formatBCE : **BCLK=GPIO42**, **LRCK=GPIO41** ; entrée microphone **GPIO40**, sortie haut-parleur **GPIO39**. Adapter les packages ESPHome locaux ou un fork ; le firmware original du XIAO **ne fonctionnera pas tel quel** sur ce câblage. Il faut vérifier les composants dépendants et recompiler pour le N16R8 16 Mo Flash / 8 Mo PSRAM.

## 4 — Résistances de rappel (« pull-up ») SDA/SCL

I²C utilise des sorties de type open-drain : lorsque personne ne tire une ligne à zéro, une résistance la ramène à **3,3 V**. **Chaque bus indépendant doit disposer de pull-up efficaces sur SDA et SCL.**

- Les cartes XVF3800 et Waveshare peuvent **déjà intégrer leurs résistances** : inspection schéma/PCB nécessaire ; **ne pas ajouter automatiquement deux résistances de plus**.
- Si les valeurs ne suffisent pas, dimensionner des résistances externes, typiquement **4,7 kΩ vers 3,3 V par ligne** comme point de départ sur un bus court à 100 kHz ; la valeur définitive dépend de la vitesse, capacité des câbles et résistances déjà en parallèle.
- Les résistances internes GPIO de l'ESP32 existent, mais sont **trop faibles pour constituer une garantie de bon fonctionnement I²C**, surtout à 400 kHz : ne pas s'appuyer sur elles seules.
- Les GPIO ESP32-S3 **ne sont pas tolérantes à 5 V** : aucune pull-up sur +5 V. Une alimentation de module en 5 V n'implique pas que ses signaux I²C le soient.
- Câbles courts, masse commune, adresses I²C non conflictuelles ; vérification au multimètre et avec les scans I²C lors du prototypage.

## 5 — Contrôles avant fabrication

1. Photo et identification des pastilles (sens du GH1.25 15P de l'écran, sens des connecteurs ESP, pastilles XVF).
2. Mesure des tensions et polarités, contrôle des résistances de rappel réellement installées.
3. Première compilation du firmware KIMIA avec deux bus I²C distincts.
4. Scan I²C n°1 : XVF/codec seulement ; scan I²C n°2 : tactile et capteur si ce dernier est bien I²C.
5. Test audio bidirectionnel du XVF, puis LCD/tactile, puis capteur ; surveiller le bruit et la stabilité.
6. Après seulement : finaliser les connecteurs et la carte de distribution 5 V.

**Résumé : XVF3800 = GPIO1/2 + GPIO42/41/40/39 ; écran tactile et capteur I²C = GPIO5/6 ; 2 broches 5 V/GND séparées pour le XVF.**

Sources techniques : [ESPHome I²C](https://esphome.io/components/i2c/), [formatBCE base.yaml](https://github.com/formatBCE/Respeaker-XVF3800-ESPHome-integration/blob/main/packages/base.yaml), [formatBCE hardware.yaml](https://github.com/formatBCE/Respeaker-XVF3800-ESPHome-integration/blob/main/packages/hardware.yaml), [Waveshare 1.85inch touch LCD](https://www.waveshare.com/product/1.85inch-touch-lcd-module.htm).
