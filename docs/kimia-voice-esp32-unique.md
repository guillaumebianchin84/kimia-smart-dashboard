# KIMIA Voice V5 — test de faisabilite electronique 1 ESP32-S3

**Statut : prototype logiciel non valide sur materiel. Aucun feu vert d'achat.**
La silhouette V5 est conservee dans `hardware/kimia-voice/v5/` et ne doit pas etre modifiee par ces essais.

## Materiel vise (a acheter uniquement apres validation)
- 1x **ESP32-S3 DevKitC-1** avec PSRAM octale 8 Mo (N16R8 visee), 1 seul ESP32 dans l'enceinte.
- 1x **Seeed ReSpeaker XVF3800 sans XIAO**, DSP XMOS et codec audio integres.
- 1x **Waveshare 1.85inch Touch LCD Module** (module SANS ESP32), 360x360 ST77916, QSPI.
- 1x haut-parleur Visaton FR7 4 ohms sur sortie amplifiee du XVF3800.
- Plus tard : tactile CST816S, SHT45, LD2410 si la topologie et la charge le permettent.

## Brochage LOGIQUE propose (pas encore un schema de montage valide)
| Interface | Fonction ESP32-S3 | GPIO |
|---|---|---|
| XVF3800 | I2C SDA/SCL | 5 / 6 |
| XVF3800 | I2S WS / BCLK | 7 / 8 |
| XVF3800 | I2S RX / TX | 43 / 44 |
| LCD | QSPI SCLK | 10 |
| LCD | QSPI D0-D3 | 11 / 12 / 13 / 14 |
| LCD | QSPI CS | 15 |
| LCD | RESET | 16 |
| LCD | Backlight PWM | 17 |

**IMPORTANT :** Voir fiches des connecteurs sur le XVF3800 NU, sens de l'horloge I2S, alimentation 3.3V/5V, masses communes, brochage GH1.25 de l'ecran, et compatibilite du codec DAC. La carte XVF3800 sans XIAO arrive habituellement en firmware USB : la basculer en I2S (et firmware compatible formatBCE) sera obligatoire.

## Test de compilation GitHub Actions
- Configuration : `firmware/kimia-voice/kimia_voice_ci.yaml`.
- CI : `.github/workflows/kimia-voice-esphome.yml`.
- ESPHome 2026.9.1 et packages formatBCE 2026.10.1.
- CINQ packages formatBCE de la voix conserves pour eviter toute fausse validation d'un simple capteur.
- 1 ESP32-S3 unique compile **voix + ecran** ; ni tactile ni capteurs a cette etape.
- Secrets du build totalement factices. **NE PAS FLASHER** le binaire CI sur ton Ikabot ni sur une enceinte fonctionnelle.
- L'ecran ST77916 utilise provisoirement le preset `JC3636W518` (meme famille de controleur, pas forcement meme initialisation que le module Waveshare). Un vrai test d'affichage reste indispensable.

## Ce qu'une compilation qui passe prouve
L'outillage ESPHome accepte les declarations et produit un binaire sans erreur du compilateur.

## Ce qu'elle NE prouve PAS
Connexion du XVF3800 nu, conversion firmware USB -> I2S, bon etat de l'ecran et de son retroeclairage, rendu tactile, consommation de RAM au fonctionnement, gain micro, echocancellation, alimentation, cablage, long terme.

Sources utiles :
- Seeed XVF3800 : https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/
- FormatBCE firmware : https://github.com/formatBCE/Respeaker-XVF3800-ESPHome-integration
- Waveshare ecran nu : https://www.waveshare.com/product/1.85inch-touch-lcd-module.htm
- ESPHome MIPI SPI : https://esphome.io/components/display/mipi_spi/
