# KIMIA Voice V5 — schéma de câblage REV. B (étude de banc)

> ⚠️ **ARCHIVE — BROCHAGE DÉPASSÉ : utiliser [REV F](./CABLAGE_KIMIA_V5_REV_F_CONNECTEURS_OPTIMISES.md) pour le câblage N16R8–XVF3800.** Cette REV B conserve GPIO5/6, 7/8, 43/44 et ne doit plus être utilisée pour le nouveau connecteur 6 broches. L'écran et les capteurs utilisent désormais un bus I²C distinct GPIO5/6 ; le XVF3800 seul utilise GPIO1/2 ; les options radar utilisant 39 à 42 sont à revoir.


> **NON VALIDÉ POUR SOUDURE OU MISE SOUS TENSION COMPLÈTE.**
> Schéma fonctionnel et allocation GPIO pour **un seul ESP32-S3 N16R8 OTRONIC OT1022**, **un module Waveshare 1.85inch Touch LCD Module 360×360 (SKU 35079)** et **un reSpeaker XVF3800**. Vérifier les références exactes des modules reçus, le sens et les numéros de broche, les tensions et la version firmware. Le XVF commandé **a un XIAO ESP32-S3 monté d'origine** : ne pas câbler un second ESP32 sur ses interfaces tant que l'isolement/éventuel retrait du XIAO n'est pas validé.

**SVG joint : [schema_cablage_rev_b.svg](./schema_cablage_rev_b.svg).**

## Allocation retenue — source de vérité provisoire

Le schéma historique A0 prévoyait I2S sur GPIO1/2, avec un firmware adapté. **Cette REV B adopte GPIO43/44 pour I2S (comme l'exemple Seeed/formatBCE), et réattribue les GPIO de tactile/radar en conséquence.** Ne pas mélanger les tableaux A0 et REV B.

### U1 ESP32-S3 DevKitC-1 N16R8 OT1022 → U2 XVF3800 (version I2S INT-Device)

| Signal | Broche ESP32 | Repère DevKitC-1 | Destination XVF3800 | État |
| --- | --- | --- | --- | --- |
| SDA I²C | **GPIO5** | **J1.5** | SDA de contrôle XMOS / codec | Bus confirmé, pastille **à identifier sur carte** |
| SCL I²C | **GPIO6** | **J1.6** | SCL de contrôle XMOS / codec | idem |
| I²S LRCK / WS | **GPIO7** | **J1.7** | LRCK I2S | Signal confirmé, borne physique à vérifier |
| I²S BCLK | **GPIO8** | **J1.12** | BCLK I2S | idem |
| I²S microphone, XVF → ESP | **GPIO43 / RX** | **J3.2** | **DATA1 / audio traité XVF** | Mapping Seeed, borne physique à vérifier |
| I²S haut-parleur, ESP → XVF | **GPIO44 / TX** | **J3.3** | **DATA0 / référence de lecture XVF** | Mapping Seeed, borne physique à vérifier |
| Masse logique | GND | J1.22 / J3.1 | GND | **obligatoire**, sans boucle d'alim |
| Alimentation U2 | +5 V | **bus 5 V externe**, pas GPIO | entrée 5 V XVF | **point d'injection XVF à valider** |

**Attention UART :** GPIO43/44 sont aussi TX/RX de l'UART0 ESP32-S3. Désactiver/déplacer les logs série sur ces GPIO ; ne pas brancher en parallèle un convertisseur USB-UART actif sur ces lignes pendant les essais audio. Sur la carte OTRONIC à deux USB-C, identifier le port et le pont UART installé avant essai.

**Horloge :** le XVF3800 doit utiliser une version de firmware **I²S INT-Device adaptée**. L'exemple Home Assistant de Seeed signale une limitation MCLK d'ESPHome et la nécessité du firmware XVF faisant la génération des horloges audio ; ne pas ajouter un GPIO MCLK arbitrairement.

### U1 ESP32 → J2 Waveshare 1.85inch Touch LCD Module (connecteur **15PIN GH1.25**, pas le FPC 18PIN)

| J2 pin | Nom constructeur | Broche ESP32 (DevKitC-1) |
| ---: | --- | --- |
| **1** | VCC (3,3 V / 5 V) | **+5 V bus** (module accepte 5 V selon fabricant) |
| **2** | GND | GND |
| **3** | LCD_IO0 | GPIO11 (J1.17) |
| **4** | LCD_IO1 | GPIO12 (J1.18) |
| **5** | LCD_IO2 | GPIO13 (J1.19) |
| **6** | LCD_IO3 | GPIO14 (J1.20) |
| **7** | LCD_SCLK | GPIO10 (J1.16) |
| **8** | LCD_CS | GPIO15 (J1.8) |
| **9** | LCD_TE | **NC** en première phase |
| **10** | LCD_RST | GPIO16 (J1.9) |
| **11** | LCD_BL | GPIO17 (J1.10) |
| **12** | TP_SDA | GPIO5 (J1.5), **I²C partagé** |
| **13** | TP_SCL | GPIO6 (J1.6), **I²C partagé** |
| **14** | TP_RST | GPIO18 (J1.11) |
| **15** | TP_INT | GPIO21 (J3.18) |

Vérifier le connecteur livré, le sens physique **pin 1** et le câblage du faisceau GH1.25 **à l'ohmmètre**. Le fonctionnement sur **tactile CST816S + LCD ST77916 QSPI** sera validé avant ajout du XVF.

### U3 capteur température/humidité (référence exacte à confirmer)

- **Si le capteur livré est I²C 3,3 V** : VCC à **3V3 régulée**, GND à masse, SDA → **GPIO5**, SCL → **GPIO6**.
- Si autre technologie (DHT, 1-Wire, 5 V uniquement) : **ne pas appliquer ce raccordement** ; identifier la carte reçue.
- Futur capteur de lumière **BH1750** : raccordement possible sur **le même bus I²C 3,3 V**, si adresses compatibles et niveaux de tension corrects.

### Option — radar présence LD2410 (non acheté/validé pour le montage V5)

| Signal LD2410 | ESP32 | Sens |
| --- | --- | --- |
| VCC | +5 V selon module exact | alimentation |
| GND | GND | masse |
| TX | GPIO41 (J3.7) | radar → ESP (RX) |
| RX | GPIO40 (J3.8) | ESP (TX) → radar |

Les niveaux logiques et l'alimentation du radar exact sont à vérifier.

### U4 — haut-parleur Visaton FR7 4 Ω

Raccorder les **deux fils uniquement sur le connecteur haut-parleur JST de sortie amplifiée du XVF3800** ; **aucun des deux fils ne va au GND ni à une GPIO ESP32**. La prise jack 3,5 mm du XVF est réservée aux enceintes actives / entrée ligne (routage à valider).

## Alimentation / protections — solution prévue

```text
ALIMENTATION 5 V stabilisée / 3 A min (a vérifier par mesures)
      +5 V ---- fusible / protection adaptée ---- BUS 5 V
                                                  |--> ESP32-S3 : broche 5V
                                                  |--> écran : J2 pin 1 VCC
                                                  '--> XVF3800 : 5V_IN (position exacte à identifier)
      GND ---------------------------------------- BUS GND commun
                                                  |--> ESP32 GND
                                                  |--> écran : J2 pin 2 GND
                                                  '--> XVF GND

ESP32 3V3 regulée --> capteur I²C 3V3 uniquement (courant max de rail à vérifier)
```

**Important :** pendant le banc, utiliser une source d'alimentation unique, ne pas injecter simultanément +5 V par USB et +5 V externe sur des cartes sans confirmer protections anti-retour ; éviter la boucle XVF par USB-C. À proximité du XVF, découplage adapté (470 µF + 100 nF envisagés, à adapter aux contraintes réelles), connexion GND courte. Ne pas exposer GPIO ESP32 à 5 V : les signaux sont en **logique 3,3 V**, indépendamment de l'alim 5 V du module écran.

## Contrôles tactiles et visage : **pas de broches supplémentaires**

Les boutons `MIC`, `SON`, `+` et `-`, les yeux, le clignement et la bouche sont **des objets logiciels LVGL sur J2**, pas des boutons mécaniques supplémentaires. Le paquet ESPHome actuel crée des **consignes DEMO** et **ne coupe pas physiquement** le micro/HP. Une vraie coupure micro devra agir sur **le XVF3800 et sur le mot d'activation**, et le volume sur la sortie réellement utilisée.

## Procédure de mise au point, sans précipitation

1. Sur table, photographier les deux côtés de chaque carte et **identifier les vraies broches physiques**, notamment **XVF3800 avec XIAO d'origine** et sens du GH1.25.
2. Alimenter/tester **U1 ESP32 seul** par USB ; vérifier pinout, démarrage et interface série.
3. Alimenter/tester **U1 + J2 écran seulement** ; contrôler ST77916, CST816S, tactile, LVGL et stabilité.
4. Tester capteur I²C sur ce bus seulement après confirmation de sa référence.
5. Confirmer séparément la solution XIAO/firmware/pastilles XVF : pas d'interconnexion avec deux hôtes actifs.
6. Relier audio I²S/I²C et alimentations suivant contrôle hors tension ; valider RX/TX, horloges, AEC.
7. Brancher HP sur JST XVF, **au volume minimal** ; tester micro/mute/volume réels, puis interface visage.
8. Tester redémarrage, coupure Wi-Fi, 1 h de dialogue et consommation maximale.

## Docs de référence

- Seeed : [XVF3800 avec XIAO](https://wiki.seeedstudio.com/respeaker_xvf3800_xiao_getting_started/) / [exemple Home Assistant, GPIO43/44](https://wiki.seeedstudio.com/respeaker_xvf3800_xiao_home_assistant/)
- Waveshare : [1.85inch Touch LCD Module - 15PIN pinout](https://www.waveshare.com/product/1.85inch-touch-lcd-module.htm)
- Espressif : [DevKitC-1 headers J1/J3](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html)
- OTRONIC : [N16R8 OT1022](https://www.otronic.fr/fr/esp32-s3-n16r8-carte-de-developpement-16-mo-de-flash-et-8-mo-de-psram)

**REV B : schéma de principe pour essais, pas un plan de fabrication ; validation physique et électrique obligatoire avant branchement.**
