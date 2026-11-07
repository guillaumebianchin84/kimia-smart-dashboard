# KIMIA Voice — essai écran seul sur ESP32-S3 N16R8

**État au 7 novembre 2026 (ESPHome 2026.10.2)**

Ce dossier conserve les essais pour reprendre le développement de KIMIA même sans l'historique de chat. **Aucun XVF3800 ni module audio n'est connecté pendant ces essais.** Le deuxième ESP32-S3 N16R8 sert exclusivement à l'écran Waveshare tactile rond 1,85 pouce, contrôleur ST77916 en QSPI, 360 x 360 pixels.

## Code disponible

- `01_ecran_rouge_valide.yaml` : **validé physiquement**. Écran rouge visible ; rétroéclairage fonctionnel ; ESP32-S3 démarre ; initialisation du pilote terminée.
- `02_visage_kimia_test.yaml` : **VALIDÉ PHYSIQUEMENT le 7 novembre 2026 à 20:00 (heure France)**. Même configuration que le test rouge, avec dessin simple (fond bleu nuit, yeux turquoise, pupilles et bouche blanche). L'utilisateur confirme : « j'ai bien le visage ».
- `03_visage_tactile_cst816_test.yaml` : **EXPÉRIMENTAL / NON ENCORE FLASHÉ**. Reprend le visage validé avec QSPI à 3 MHz et ajoute le tactile CST816S (I2C GPIO5/6, reset GPIO18, interruption GPIO21, `skip_probe: true`, `scan: false`). Chaque appui doit créer une ligne de journal `KIMIA_TOUCH: TOUCH x=... y=...` suivie de `RELEASE`. Ne pas marquer testé sans confirmation.
- Pas de Wi-Fi ni d'API Home Assistant dans ces fichiers ; **installation par USB uniquement**, pas OTA.

## Brochage écran validé pour la partie affichage

| Signal Waveshare | ESP32-S3 |
| --- | --- |
| LCD_SCLK | GPIO10 |
| LCD_IO0 | GPIO11 |
| LCD_IO1 | GPIO12 |
| LCD_IO2 | GPIO13 |
| LCD_IO3 | GPIO14 |
| LCD_CS | GPIO15 |
| LCD_RST | GPIO16 |
| LCD_BL | GPIO17 |
| LCD_TE | non connecté |
| TP_SDA (tactile) | GPIO5 (câblé, non utilisé dans ces tests) |
| TP_SCL (tactile) | GPIO6 (câblé, non utilisé) |
| TP_RST | GPIO18 (câblé, non utilisé) |
| TP_INT | GPIO21 (câblé, non utilisé) |

Alimentation : VCC et GND à vérifier suivant le modèle et le montage réel. Aucune connexion 5 V externe en même temps que l'USB-C sans vérification de l'alimentation de la carte.

## Historique et diagnostic

1. Premier YAML : modèle `ESP-VOCAT`, QSPI 10 MHz, tactile `cst816` et I2C activés. Rétroéclairage allumé, écran noir. Extrait du journal : log stoppé après `Command 73, length 1, bytes F0` ; pas de fin de configuration visible.
2. Test minimal ESP32 + I2C seul (GPIO5/6, 100 kHz) : `setup() finished successfully!`, PSRAM 8 Mo. Scan `Found no devices`. Attention : `TP_RST` n'était pas piloté et certains CST816S restent muets hors toucher ; **pas de conclusion sur une panne du tactile**.
3. Test QSPI écran seul, sans tactile ni I2C, `model: ESP-VOCAT`, `data_rate: 3MHz` : **écran rouge affiché**, `setup() finished successfully!`. Le journal confirme les GPIO QSPI 10/11/12/13/14, CS 15 et RST 16, 360 x 360 ; fonctionnement du rétroéclairage GPIO17.
4. Le journal du test rouge contient `display took a long time for an operation (196 ms)` : écriture de la trame lente à 3 MHz, mais **pas une panne**, et l'image est visible.
5. **Ne pas conclure que la seule fréquence 10 → 3 MHz est la cause** : le retrait du tactile/I2C a eu lieu simultanément. Il faudra tester séparément quand on réintroduira le tactile.

## Étapes suivantes

1. **FAIT le 07/11/2026** : `02_visage_kimia_test.yaml` flashé par USB, le visage KIMIA est visible. Logs : `setup() finished successfully!`, SPI2_HOST QSPI à 3 MHz, PSRAM 8 Mo ; avertissement `display took a long time for an operation (204 ms)` sans panne observée.
2. **EN COURS** : tester le CST816S avec `03_visage_tactile_cst816_test.yaml` (RESET GPIO18, INT GPIO21, I2C GPIO5/6). Le visage est conservé comme repère visuel. Sur certaines variantes CST816S, le scan I2C peut être vide même si le tactile réagit : `skip_probe: true` et `scan: false` sont volontaires. Test : flasher par USB, toucher l'écran plusieurs fois, observer les lignes `KIMIA_TOUCH`. En cas d'échec ou d'écran noir, reflasher `02_visage_kimia_test.yaml` validé. Ne pas confondre QSPI et I2C.
3. Ajouter les animations LVGL et le contrôle via Home Assistant dans une étape ultérieure. Préserver le YAML du visage actuel comme base éprouvée ; valider le tactile isolément avant toute intégration.
4. Reprendre le XVF3800 avec une **nouvelle carte sans XIAO** lorsque disponible ; ne pas retoucher la carte XVF précédente.

## Liens vers les développements précédents

- [Prototypage visage V5 (LVGL)](../../hardware/kimia-voice/README.md) — travail historique dans la branche `feature/kimia-voice-v5-visage-lvgl-v1`, fichier `firmware/kimia-voice/visage-v1/visage-lvgl.yaml`.
- Firmware V6 expérimental et projet mécanique : branche `feature/kimia-voice-v6-caisson-cylindrique`, fichier `firmware/kimia-voice-v6/packages/04_ecran_visage_experimental.yaml`.
- Référence constructeur : https://github.com/waveshareteam/1.85inch-Touch-LCD-Module

**Ne pas remplacer le fichier rouge validé par des essais non confirmés.**

## Essai combiné du 7 novembre 2026 (tactile fonctionne, écran noir)

L'utilisateur a flashé `03_visage_tactile_cst816_test.yaml` : **rétroéclairage allumé et appuis tactiles détectés, mais plus aucun visage affiché**. Les tests 01 et 02 (sans I2C/tactile) affichaient correctement rouge et visage. Conclusion : affichage et tactile validés séparément ; leur cohabitation reste à résoudre. Ne pas conclure à une carte ou un écran HS.

Hypothèse à tester : l'impulsion de RESET logiciel sur le CST816S (GPIO18) peut interférer avec l'initialisation de l'afficheur ST77916 ou entraîner une perturbation de l'alimentation/des signaux. Un incident ressemblant existe sur une **autre carte** Waveshare 1.85C (https://github.com/espressif/esp-bsp/issues/775), sans preuve d'identité de cause pour notre module.

**Étape expérimentale suivante** : `04_visage_tactile_sans_reset_test.yaml`, identique à V3 sauf suppression de la ligne `reset_pin: GPIO18` dans la section `touchscreen:`. **Laisser le fil GPIO18 branché**, reflasher par USB, puis faire un cycle d'alimentation complet. Vérifier (a) l'affichage du visage, (b) les logs de touches. Si l'écran reste noir, obtenir le journal de démarrage complet et le comparer aux versions 02 et 03, sans changer d'autres paramètres. Le test 04 **n'est pas encore validé**.


## Validation écran + tactile — 07/11/2026, 20:10 (Europe/Paris)

**VALIDÉ PHYSIQUEMENT PAR L'UTILISATEUR** : avec le firmware expérimental 04 (suppression uniquement de `reset_pin: GPIO18` dans `touchscreen:`), **le visage est visible et les appuis fonctionnent simultanément**. La ligne `reset_pin: GPIO16` du `display:` reste indispensable. Fil physique GPIO18 laissé en place.

**Référence de sauvegarde recommandée** : `05_visage_tactile_valide.yaml` — copie fonctionnelle de la V4 avec en-tête indiquant la validation. **Ne pas modifier ce fichier pour les futurs tests**, créer V6, V7, etc. Fichiers 01, 02 et 05 = versions physiques vérifiées. 03 = combinaison qui rendait l'écran noir.

Extrait du journal confirmé :
```text
[D][spi_device:404]: mode 0, data_rate 3000kHz
[I][app:130]: setup() finished successfully!
[C][i2c:092]: I2C Bus:
[C][i2c:093]:   SDA Pin: GPIO5
[C][i2c:093]:   SCL Pin: GPIO6
[C][cst816.touchscreen:090]:   Address: 0x15
[C][cst816.touchscreen:131]:   Interrupt Pin: GPIO21
[C][cst816.touchscreen:120]:   Chip type: CST816T
[I][KIMIA_TOUCH:080]: TOUCH x=184 y=225
[I][KIMIA_TOUCH:086]: RELEASE
[I][KIMIA_TOUCH:080]: TOUCH x=259 y=241
[I][KIMIA_TOUCH:086]: RELEASE
[W][component:419]: display took a long time for an operation (205 ms)
```

### À ne pas oublier

- **Le pilote ESPHome identifie la puce tactile comme CST816T**, même si le module était précédemment désigné CST816S. Se fier à la détection réelle : adresse 0x15, lecture tactile opérationnelle.
- `[W][touchscreen:032]: Touch Polling Stopped` n'est pas un échec du tactile : l'interruption GPIO21 est active et les événements sont bien remontés.
- Hypothèse fortement confortée : le RESET logiciel GPIO18 du tactile perturbait l'affichage au démarrage. Cela ne démontre pas encore le mécanisme électrique exact.
- **Éviter toute modification du câblage actuellement fonctionnel.**
- Étape suivante proposée : tester une variante expérimentale avec animations faciales et/ou LVGL, en conservant l'affichage à 3 MHz et la configuration tactile validée ; optimiser la vitesse seulement ensuite, par étapes, sans sacrifier la base connue fonctionnelle.
