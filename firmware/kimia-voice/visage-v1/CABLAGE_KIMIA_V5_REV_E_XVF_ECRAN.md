# KIMIA Voice V5 — brochage retenu REV E : XVF3800 + écran Waveshare + 2 bus I²C

> ⚠️ **ARCHIVE : utiliser la [REV F — connecteurs optimisés](./CABLAGE_KIMIA_V5_REV_F_CONNECTEURS_OPTIMISES.md).** La REV E présente des affectations QSPI et de contrôle de l'écran désormais remplacées. Ne pas mélanger les deux tableaux.

**Décision du 02/11/2026. Statut : plan de câblage retenu, NON compilé, NON testé électriquement, NON validé pour la soudure définitive.**

Ce document devient la **référence provisoire de câblage complète** et remplace les répartitions GPIO des REV B/C/D. La REV D (deux bus I²C séparés) et le brochage XVF3800 restent inchangés ; la REV E ajoute et fige la **proposition de 2 connecteurs 6 broches pour les signaux de l'écran**, plus son alimentation indépendante. Les documents REV B et les SVG associés sont archivés et représentent d'anciennes répartitions.

## 1. ESP32-S3 N16R8 → reSpeaker XVF3800 : connecteur communication 6P

Vue de dessus du N16R8 OTRONIC photographié, antenne en haut, USB-C en bas : **six GPIO adjacentes de la colonne droite**.

| Connecteur XVF6 | GPIO N16R8 | Pad XVF3800 | Rôle |
| ---: | --- | --- | --- |
| 1 | **GPIO1** | I2C_SDA | Bus I²C audio n° 1 |
| 2 | **GPIO2** | I2C_SCL | Bus I²C audio n° 1 |
| 3 | **GPIO42** | I2S_BCLK | Horloge audio |
| 4 | **GPIO41** | I2S_LRCK | Synchro L/R |
| 5 | **GPIO40** | I2S_DATA1 | Microphones XVF → ESP32 |
| 6 | **GPIO39** | I2S_DATA0 | Audio ESP32 → XVF |

**Alimentation XVF : connecteur dédié 2P = +5 V / GND**, via future carte de distribution 5 V et masse commune avec ESP32. Les six broches du connecteur XVF6 sont des signaux 3,3 V, **jamais** l'alimentation.

Le XVF est livré avec un XIAO ESP32-S3 monté : ne pas relier simultanément deux maîtres ESP32 actifs sur les signaux XVF ; retirer ou isoler le XIAO seulement après validation du matériel. Pas de liaison MCLK. Le HP 4 Ω se raccorde **uniquement sur les deux contacts de sortie amplifiée du XVF**.

## 2. ESP32-S3 → écran Waveshare 1,85″ 360 × 360, ST77916 / CST816S

**Deux connecteurs 6P de signaux + un 2P d'alimentation.** Les connexions affichage passent par le **câble GH1.25 15 broches du Waveshare**, et une **petite carte adaptatrice / faisceau** pour répartir les signaux côté ESP32. Le panneau Waveshare n'a **pas** deux prises 6P directement : c'est une organisation de notre montage.

### Connecteur ÉCRAN-A — 6P : QSPI (GPIO9 à GPIO14 physiquement voisines, côté gauche)

| Pin A | GPIO ESP32 | Signal Waveshare | Pin GH1.25 / 15 |
| ---: | --- | --- | ---: |
| 1 | **GPIO9** | LCD_CS | **8** |
| 2 | **GPIO10** | LCD_SCLK | **7** |
| 3 | **GPIO11** | LCD_IO0 | **3** |
| 4 | **GPIO12** | LCD_IO1 | **4** |
| 5 | **GPIO13** | LCD_IO2 | **5** |
| 6 | **GPIO14** | LCD_IO3 | **6** |

### Connecteur ÉCRAN-B — 6P : contrôle LCD et tactile (regroupement sur adaptateur)

| Pin B | GPIO ESP32 | Signal Waveshare | Pin GH1.25 / 15 |
| ---: | --- | --- | ---: |
| 1 | **GPIO15** | LCD_RST | **10** |
| 2 | **GPIO16** | LCD_BL (rétroéclairage) | **11** |
| 3 | **GPIO17** | TP_RST | **14** |
| 4 | **GPIO18** | TP_INT | **15** |
| 5 | **GPIO5** | TP_SDA | **12** |
| 6 | **GPIO6** | TP_SCL | **13** |

**IMPORTANT** : GPIO15/16/17/18 sont voisines sur la carte, mais **GPIO5/6 se trouvent ailleurs**. Le connecteur B ne peut donc **pas** se brancher directement en bloc 6P sur une rangée adjacente de l'ESP32 : prévoir un petit adaptateur ou un faisceau qui regroupe les 6 fils.

Les 2 lignes TP_SDA/TP_SCL (GPIO5/6) constituent le **deuxième bus I²C** : il est séparé du bus audio GPIO1/2, et partagé avec les capteurs I²C compatibles via leurs propres connecteurs physiques.

### Connecteur ÉCRAN-PWR — 2P : alimentation

| Pin | Bus de distribution | Signal Waveshare | Pin GH1.25 / 15 |
| ---: | --- | --- | ---: |
| 1 | **+5 V prévu**, après vérification | VCC | **1** |
| 2 | **GND commun** | GND | **2** |

Waveshare annonce une entrée VCC **3,3 V ou 5 V**, avec adaptation de niveaux sur le module ; confirmer sur l'écran exact reçu le niveau logique des interfaces et l'alimentation retenue. **Ne jamais appliquer 5 V directement à une broche GPIO ESP32-S3.**

**Pin GH1.25 n° 9 = LCD_TE : NON CONNECTÉE (NC) pour les premiers tests.** Les 15 broches sont ainsi toutes prises en compte : 12 signaux + 2 alimentations + TE NC.

### Récapitulatif des 3 connecteurs écran

- **ÉCRAN-A** : 6 signaux QSPI, GPIO9/10/11/12/13/14.
- **ÉCRAN-B** : 6 signaux de contrôle/tactile, GPIO15/16/17/18/5/6.
- **ÉCRAN-PWR** : 2 fils, VCC + GND, depuis la future carte de distribution.

Le système ST77916 QSPI demande un **pilote/initialisation valide ESPHome + LVGL** ; ne pas supposer que le modèle ST7796 est équivalent au ST77916. Le pilote `mipi_spi` d'ESPHome accepte des modèles/initialisations personnalisés, mais notre montage **n'est pas encore compilé/testé**. Les broches RST/BL/TP_RST/TP_INT restent prévues pour la mise au point, même si certains exemples Waveshare laissent certaines broches non connectées.

## 3. Autres périphériques et affectations réservées

| Équipement | Bus/broches | Remarque |
| --- | --- | --- |
| XVF3800 + codec AIC3104 | **I²C n°1 : GPIO1 SDA / GPIO2 SCL** | Bus ESPHome `internal_i2c` |
| Écran tactile CST816S | **I²C n°2 : GPIO5 SDA / GPIO6 SCL** | Bus ESPHome `peripherals_i2c` |
| Capteur température/humidité si I²C | **GPIO5 / GPIO6** | Partage du bus écran, connecteur séparé ; alimentation probablement 3,3 V selon référence exacte |
| Futur capteur lumière si I²C | **GPIO5 / GPIO6** | Même bus selon adresses et niveau des pull-up |
| Radar présence optionnel | **À redéfinir** | GPIO39–42 sont désormais pris par I²S ; ne pas suivre la vieille REV B |

Les **pull-up I²C** SDA/SCL sont nécessaires **sur chacun des deux bus** (vers 3,3 V). Les modules peuvent déjà comporter leurs propres résistances ; vérifier schéma/matériel et la résistance équivalente avant d'en ajouter. Les GPIO internes seules ne garantissent pas un bus fiable, notamment à 400 kHz. Mêmes exigences : masses communes, fils courts, pas de 5 V logique.

## 4. Adaptation du firmware

- Adapter le **formatBCE pour un N16R8 externe** : `internal_i2c` sur GPIO1/2, I²S BCLK=42, LRCK=41, DIN=40, DOUT=39 ; conserver les autres paramètres audio.
- Déclarer un **deuxième bus ESPHome** `peripherals_i2c` SDA=GPIO5, SCL=GPIO6 ; y associer tactile CST816S et capteur T/H si I²C.
- Déclarer QSPI du LCD sur GPIO9–14, et les quatre autres signaux sur GPIO15–18 ; vérifier que les composants d'écran acceptent l'affectation et compiler.
- Le package `visage-lvgl.yaml` actuel est **un prototype de l'interface uniquement**, pas un firmware écran/audio compilable. **Aucun changement de firmware n'est réalisé par ce document**.

## 5. Avant soudure / essais

1. Vérifier à l'ohmmètre l'ordre des fils **réels** du GH1.25 15P, l'orientation pin 1 et les repères carte.
2. Définir le détrompage des connecteurs 6P (écran A et B) et 2P (alimentation) : **ne pas les intervertir**.
3. Contrôler tensions, masses et alimentation simultanée USB/5 V externe, ainsi que les résistances I²C.
4. Compiler ESPHome pour le **N16R8 16 Mo Flash / 8 Mo PSRAM**, tester le LCD ST77916 et le tactile CST816S sur table.
5. Tester l'audio du XVF3800 sur son bus séparé, puis la stabilité ensemble, avant toute conception de circuit imprimé définitive.

### Références

- Brochage officiel GH1.25 15P : https://www.waveshare.com/product/displays/lcd-oled/lcd-oled-3/1.85inch-touch-lcd-module.htm
- Exemple Waveshare : https://docs.waveshare.com/1.85inch_Touch_LCD_Module/User-Guide-ESP32
- Driver écran ESPHome : https://esphome.io/components/display/mipi_spi/
- Projet XVF ESPHome : https://github.com/formatBCE/Respeaker-XVF3800-ESPHome-integration

**REV E — choix retenu, mais toutes les connexions doivent encore être validées en vraie configuration ESPHome et sur banc.**
