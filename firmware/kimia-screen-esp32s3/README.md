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

## V6 expérimentale — LVGL, visage animé (préparée le 07/11/2026)

Fichier : `06_visage_lvgl_animation_experimental.yaml` — **non flashé, non validé matériellement**. Conserve le matériel éprouvé de la V5 (QSPI 3 MHz GPIO10-17, I2C GPIO5/6, tactile INT GPIO21 avec `skip_probe: true`, **pas de `reset_pin: GPIO18`**). Le reset LCD `GPIO16` reste présent.

**Différence majeure** : LVGL prend en charge l'affichage. Les options `auto_clear_enabled: false`, `update_interval: never` et **absence de `display.lambda`** sont intentionnelles, selon les recommandations ESPHome pour LVGL.

Comportement attendu :
- Affiche KIMIA sur fond bleu nuit, yeux turquoise avec pupilles, bouche claire et statut « Repos ».
- Clignement automatique toutes les 5 secondes, pendant ~180 ms (sauf mode Parole).
- Bouton tactile « MODE » au bas de l'écran, séquence : Repos → Ecoute → Reflexion → Parole → Erreur → Repos.
- En mode Parole, bouche qui change de hauteur environ toutes les 450 ms.
- **Démonstration d'interface seulement** : aucun pilotage micro, son, XVF3800 ni Home Assistant ; installation et logs par USB.

Test demandé : reflasher par USB, vérifier (1) le visage LVGL s'affiche, (2) clignements, (3) bouton MODE cycle entre les cinq états et (4) bouche bouge en mode Parole. Contrôler les logs de démarrage si écran noir/erreur. **Toujours revenir à `05_visage_tactile_valide.yaml` si cette version expérimentale échoue**. Ne pas modifier la base 05.

Ancienne source de l'interface : branche `feature/kimia-voice-v5-visage-lvgl-v1`, fichier `firmware/kimia-voice/visage-v1/visage-lvgl.yaml`. La V6 standalone ne reprend pas les switches micro/son fictifs pour éviter toute confusion avec de vraies commandes matérielles.


## Validation de la V6 LVGL — 07/11/2026 (retour utilisateur)

L'utilisateur confirme après flash de `06_visage_lvgl_animation_experimental.yaml` : **« nickel ca fonctionne »**. La V6 animee sous LVGL fonctionne sur le montage, en utilisant l'affichage QSPI à 3 MHz et le tactile sans RESET logiciel GPIO18. Les details de chaque etat et des animations n'ont pas été documentés séparément dans les logs ; le fonctionnement general est confirmé par observation utilisateur, mais aucun essai d'endurance n'a encore été réalisé.

**Nouvelle base fonctionnelle à préserver : `07_visage_lvgl_valide.yaml`**, copie du code de la V6, avec seulement les commentaires d'etat actualisés. Ne pas ecraser ce fichier lors des prochaines experiences.

Versions validées au 07/11/2026 :
- `01_ecran_rouge_valide.yaml` : test image rouge ;
- `02_visage_kimia_test.yaml` : visage statique confirmé ;
- `05_visage_tactile_valide.yaml` : visage statique + touches confirmés ;
- `07_visage_lvgl_valide.yaml` : visage LVGL animé confirmé par l'utilisateur.

**Paramètres à conserver** : ESP32-S3 N16R8, `psram: octal 80MHz`, ST77916 piloté par `ESP-VOCAT`, SPI quad à `3MHz`, GPIO10 (CLK), GPIO11–14 (IO0-3), GPIO15 (CS), GPIO16 (RST LCD), GPIO17 (BL) ; tactile identifié `CST816T` en I2C GPIO5/6, INT GPIO21, `skip_probe: true`, **pas de reset GPIO18 dans `touchscreen:`**. V6 utilise `lvgl:` sans `display.lambda`.

**Suite envisagée** : enrichir les expressions de l'assistant, évaluer le framerate et optimiser le bus QSPI un seul paramètre à la fois, puis raccorder les états vocaux quand la nouvelle carte XVF3800 sera disponible. Ne pas mélanger logiciel de démo et commandes matérielles réelles.


## V8 expérimentale — mouvements plus naturels (préparée le 07/11/2026)

Code : `08_visage_naturel_experimental.yaml`. **NON FLASHÉ / NON VALIDÉ SUR MATÉRIEL à ce stade.**

Base : `07_visage_lvgl_valide.yaml`, version LVGL fonctionnelle sauvegardée et **non modifiée**. V8 conserve les GPIO, QSPI 3 MHz, pilote `ESP-VOCAT`, écran GPIO16 RESET, rétroéclairage GPIO17 et CST816T INT GPIO21, sans reset tactile GPIO18. Installation **USB uniquement**.

Nouveautés visibles par rapport à V7 :
- Intervalle du clignement variable environ 3,4 à 7,9 s ; double-clignement rare (~1 sur 8).
- Regard alternant centre/gauche/droite/haut/bas avec un délai variable environ 2,6 à 6,6 s. Pupilles déplacées à l'intérieur de leurs objets LVGL.
- Mode « Parole » simulé : quatre niveaux d'ouverture de bouche choisis toutes les 400 ms ; **pas de synchronisation audio**.
- Bouton « MODE » et cinq états demo conservés. Pas de micro/son/XVF3800 ni de Wi-Fi dans cette variante.

Technique : timers `millis()` + `random_uint32()` (fonction ESPHome présente dans `esphome/core/helpers.h` en version 2026.10.2) via `interval:`/condition `lambda`; changements localisés de widgets LVGL pour limiter les rafraîchissements. Les premiers intervalles commencent après une attente initiale. **Pas de compilation matérielle ni validation ESPHome réalisée par l'assistant**.

Procédure : copier le fichier V8 complet dans la configuration ESPHome de test et **flasher par USB** ; tester visage LVGL, clignements non réguliers, mouvements pupilles, bouton MODE et animation bouche en « Parole ». En cas d'erreur de validation, envoyer la première erreur de compilation. En cas d'écran noir ou régression tactile, **reflasher la V7 validée** (sans modifier le montage). Ne pas augmenter la fréquence SPI avant d'avoir confirmé la stabilité de la V8.

## V9 experimentale — retrait du titre KIMIA en haut (07/11/2026)

Le retour utilisateur sur la V8 est positif (« pas mal »), ce qui confirme l'affichage de l'interface, mais les animations n'ont pas fait l'objet d'une validation individuelle ou d'endurance. La V8 est préservée.

Fichier : `09_visage_sans_titre_experimental.yaml`. **Seule modification fonctionnelle par rapport à V8** : suppression du widget `label` qui affichait `KIMIA` en haut de l'ecran. L'indication d'etat `Repos / Ecoute / Reflexion / Parole / Erreur` demeure visible, tous les timings, le bouton MODE, le tactile et l'affichage QSPI restent inchanges. Ce fichier **n'a pas encore ete flashe ni valide par l'utilisateur**. Installation USB uniquement ; repli fiable : `07_visage_lvgl_valide.yaml`.

Pistes d'evolution (non codees pour l'instant, a prioriser par la qualite visuelle et la fluidite) : 1) transitions douces des pupilles au lieu de sauts entre directions ; 2) gestes plus expressifs selon l'etat, avec clignements naturels ; 3) mouvement de bouche piloté plus tard par les evenements ou l'audio reel du XVF3800, au lieu d'animations purement aleatoires. Ne pas compliquer l'interface avec des libelles et boutons permanents inutiles.


## V10 expérimentale — veille + swipe (préparée le 07/11/2026)

**Fichier** : `10_veille_swipe_experimental.yaml`, basé sur la V9 sans titre ; **non flashé ni validé sur le montage** à la création. Conserver intactes les versions V7 validée, V8 et V9.

Changements visibles :
- **Suppression du bouton MODE** ; balayage horizontal du doigt depuis la gauche vers la droite = mode précédent, depuis la droite vers la gauche = mode suivant (seuil ~55 px, geste essentiellement horizontal). Simple pression = ne change pas le mode.
- Après **120 secondes** sans contact, arrêt du **rétroéclairage GPIO17 uniquement** (panneau LCD/LVGL/ESP32 continuent de tourner ; ce n'est pas une coupure électrique totale).
- **Premier toucher lorsque l'écran est sombre = réveil uniquement** sans modification du mode ; toucher ou swipe suivant utilisable normalement.
- Scripts `kimia_screen_sleep` et `kimia_screen_wake` réutilisables lors d'une future intégration (événements vocaux, présence, etc.). Aucune intégration audio réelle ici.
- Diagnostics USB : `KIMIA_TOUCH: DEBUT`, `FIN dx=... dy=...`, `KIMIA GESTE : ...`, `KIMIA_SLEEP: ...`.

Rappels matériels **inchangés** : QSPI 3 MHz, LCD RST GPIO16, CST816T sur I2C GPIO5/6 INT GPIO21, **ne pas activer RESET tactile GPIO18**. LVGL dessine l'écran.

**Test** : flasher en USB, tenter glissements horizontaux gauche/droite sur l'image sans toucher à l'ancien bouton ; vérifier la progression et le retour en arrière des cinq modes. Attendre 2 min pour voir l'écran devenir sombre, puis vérifier qu'un toucher le rallume sans changer le mode. En cas de swipe non reconnu, recueillir les logs `FIN dx/dy`. En cas d'instabilité, restaurer `07_visage_lvgl_valide.yaml`.

Point à vérifier : la puce CST816T doit bien envoyer les mises à jour de coordonnées pendant un glissement pour que le geste soit reconnu ; cela n'est pas encore confirmé sur le montage. Ne pas déclarer cette fonction validée tant que l'utilisateur n'a pas testé.

## V11 expérimentale — bouche plus rapide (07/11/2026)

`11_bouche_rapide_experimental.yaml` : copie de `10_veille_swipe_experimental.yaml` avec **une seule modification fonctionnelle** en mode Parole : le changement aléatoire parmi 4 formes de bouche se produit toutes les **200 ms** au lieu de **400 ms**. Veille après 2 minutes, réveil au toucher, swipe et câblage conservés à l'identique. Cela double la cadence théorique, sans véritable synchronisation avec le son. **Version non flashée / non validée sur montage** au moment de sa création. Ne pas toucher aux bases stables V7/V5.

En cas d'animation saccadée, revenir à 300 ms ou au fichier V10. La fréquence QSPI reste à 3 MHz ; la V11 n'accélère pas la transmission graphique.
