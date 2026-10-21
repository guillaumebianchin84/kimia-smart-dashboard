# KIMIA Voice V5 — essais ESPHome 1 ESP32, carte Olimex N8R8

**Statut : phase de validation de faisabilite, aucun montage valide sur table.**
Toutes les modifications sont isolees de la V5 mecanique et d'Ikabot.

## Cartes visees
- ESP32-S3-DevKit-LiPo **Olimex ESP32-S3-WROOM-1-N8R8**, 8 Mo Flash + 8 Mo PSRAM.
- XVF3800 XMOS, **sans XIAO dans l'assemblage final**. Carte achetee avec XIAO puis retrait envisage, qui doit etre traite comme operation risquee et non garantie.
- Waveshare 1.85inch Touch LCD Module sans ESP32, ST77916 360x360, tactile CST816S.
- Capteur SHT45 temperature/humidite.
- LD2410 radar de presence (UART).

## Liaisons proposees (ESP32-S3 Olimex)
| ESP32 | Affectation | Observations |
|---|---|---|
| GPIO48 / GPIO47 | I2C SDA / SCL | XVF3800 controle, codec AIC3104, CST816S, SHT45 |
| GPIO7 / GPIO8 | I2S LRCLK / BCLK | Horloges recues du XVF3800 I2S master |
| GPIO40 | I2S DIN | Entree micro depuis XVF3800 |
| GPIO41 | I2S DOUT | Sortie son vers XVF3800/codec |
| GPIO10 | LCD QSPI CLK | Affichage |
| GPIO11-14 | LCD QSPI D0-D3 | Affichage |
| GPIO15 | LCD CS | Affichage |
| GPIO16 | LCD RESET | Affichage |
| GPIO1 | Backlight PWM | Verifier niveau et circuit de backlight Waveshare |
| GPIO2 | CST816S INT | Tactile |
| GPIO4 | CST816S RESET | Tactile |
| GPIO17 / GPIO18 | Radar UART TX / RX | ESP TX17 -> Radar RX ; Radar TX -> ESP RX18 |
| GPIO5/6 | NON UTILISES | reserves sur Olimex au sens alimentation / batterie |
| GPIO43/44 | NON UTILISES | interface USB-UART de programmation Olimex |

## Sources et limites
- Les packages source formatBCE 2026.10.1 ont ete **copies localement sans changer la logique vocale** : `firmware/kimia-voice/packages/olimex-base.yaml` (seul I2C remappe) et `olimex-hardware.yaml` (seules pins audio remappees).
- Les trois autres packages vocaux restent pilotes par formatBCE 2026.10.1 via l'URL GitHub.
- La configuration testee : `firmware/kimia-voice/kimia_voice_olimex_ci.yaml`.
- L'ecran utilise provisoirement le profil **JC3636W518**, partageant une famille de controleur ST77916 : pas de validation des sequences d'initialisation sur l'ecran Waveshare.
- Le schema constructeur Olimex confirme l'exposition des GPIO; **l'accessibilite des contacts I2S/I2C sur le XVF sans XIAO doit etre testee physiquement**.
- Le firmware I2S du XMOS, l'alimentation 5 V/3.3 V et l'audio AEC ne sont pas verifies sans materiel.
- La compilation ne mesure pas la PSRAM disponible lors du fonctionnement reel simultane.
- Le firmware CI utilise de **faux mots de passe**. Ne jamais le flasher sur un equipement reel.

## Documents officiels
- Olimex (schemas, netlist, PCB): https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo
- Driver XVF3800 audio et ses packages: https://github.com/formatBCE/Respeaker-XVF3800-ESPHome-integration/tree/2026.10.1/packages
- Seeed reSpeaker XVF3800: https://wiki.seeedstudio.com/respeaker_xvf3800_with_xiao_intro/
- Waveshare ecran nu: https://www.waveshare.com/product/1.85inch-touch-lcd-module.htm
