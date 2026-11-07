# KIMIA Voice — essai écran seul sur ESP32-S3 N16R8

**État au 7 novembre 2026 (ESPHome 2026.10.2)**

Ce dossier conserve les essais pour reprendre le développement de KIMIA même sans l'historique de chat. **Aucun XVF3800 ni module audio n'est connecté pendant ces essais.** Le deuxième ESP32-S3 N16R8 sert exclusivement à l'écran Waveshare tactile rond 1,85 pouce, contrôleur ST77916 en QSPI, 360 x 360 pixels.

## Code disponible

- `01_ecran_rouge_valide.yaml` : **validé physiquement**. Écran rouge visible ; rétroéclairage fonctionnel ; ESP32-S3 démarre ; initialisation du pilote terminée.
- `02_visage_kimia_test.yaml` : **à essayer**, non encore validé physiquement. Même configuration que le test rouge, avec dessin simple (fond bleu nuit, yeux turquoise, pupilles et bouche blanche).
- Pas d'I2C, de tactile, de Wi-Fi ni d'API Home Assistant dans ces deux fichiers ; **installation par USB uniquement**, pas OTA.

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

1. Flasher `02_visage_kimia_test.yaml` par USB et confirmer que les formes s'affichent.
2. Une fois l'affichage stable, tester le tactile CST816S séparément (RESET GPIO18, INT GPIO21, I2C GPIO5/6), puis l'intégrer à l'écran. Ne pas confondre QSPI de l'affichage et I2C du tactile.
3. Ajouter les animations LVGL et le contrôle via Home Assistant dans une étape ultérieure.
4. Reprendre le XVF3800 avec une **nouvelle carte sans XIAO** lorsque disponible ; ne pas retoucher la carte XVF précédente.

## Liens vers les développements précédents

- [Prototypage visage V5 (LVGL)](../../hardware/kimia-voice/README.md) — travail historique dans la branche `feature/kimia-voice-v5-visage-lvgl-v1`, fichier `firmware/kimia-voice/visage-v1/visage-lvgl.yaml`.
- Firmware V6 expérimental et projet mécanique : branche `feature/kimia-voice-v6-caisson-cylindrique`, fichier `firmware/kimia-voice-v6/packages/04_ecran_visage_experimental.yaml`.
- Référence constructeur : https://github.com/waveshareteam/1.85inch-Touch-LCD-Module

**Ne pas remplacer le fichier rouge validé par des essais non confirmés.**
