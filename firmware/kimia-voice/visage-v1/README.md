# KIMIA Voice V5 — visage animé minimal (étude / prototype)

**Statut : prototype d'interface NON flashé, NON validé sur l'écran Waveshare ni sur le XVF3800.**

Ce dossier est **indépendant** de la mécanique V5, des dashboards KIMIA et du firmware de l'assistant. Aucun fichier existant n'est modifié. Objectif : un visage KIMIA très simple et vivant, à faible charge graphique, avec quatre commandes tactiles.

## Contenu

- [visage-lvgl.yaml](./visage-lvgl.yaml) : paquet ESPHome/LVGL avec yeux, pupilles, bouche, clignements, mouvements du regard et écran tactile (360×360).
- [apercu.svg](./apercu.svg) : **maquette statique**, pas une capture d'écran d'un firmware exécuté.
- [INTEGRATION_AUDIO_ET_ASSIST.md](./INTEGRATION_AUDIO_ET_ASSIST.md) : raccordement futur aux états Assist, au micro XVF3800 et au volume réel.
- [CABLAGE_KIMIA_V5_REV_D_DEUX_BUS_I2C.md](./CABLAGE_KIMIA_V5_REV_D_DEUX_BUS_I2C.md) : **brochage actuellement retenu**, 2 bus I²C séparés (XVF GPIO1/2 ; écran + capteur GPIO5/6), I²S GPIO42/41/40/39 et alimentation indépendante ; à tester.
- [CABLAGE_XVF3800_N16R8_REV_C.md](./CABLAGE_XVF3800_N16R8_REV_C.md) : **ancienne REV C**, six GPIO du XVF conservées mais ancien bus I²C partagé pour écran/capteur ; historique uniquement.
- [SCHEMA_CABLAGE_REV_B.md](./SCHEMA_CABLAGE_REV_B.md) : **ancienne REV B, historique uniquement** ; contient le brochage formatBCE d'origine et les affectations initiales de l'écran.
- [schema_cablage_rev_b.svg](./schema_cablage_rev_b.svg) : schéma de câblage illustré (version d'étude, non validée électriquement).

## Ce que fait déjà le code

1. Deux yeux blancs avec pupilles mobiles (petit mouvement toutes les 9 s au repos).
2. Clignement des yeux toutes les 5 s au repos / pendant la réflexion.
3. Cinq états : repos, écoute, réflexion, parole (bouche animée toutes les 260 ms), erreur.
4. Boutons tactiles `MIC`, `SON`, `-` et `+`.
5. Deux interrupteurs de consigne et un nombre 0–100 % remontables dans Home Assistant.

**IMPORTANT : les commandes audio sont volontairement des CONSIGNES DE DEMONSTRATION.**
Leur activation ne coupe **pas** le microphone physique, ne coupe **pas** le haut-parleur et ne change **pas** le volume du XVF3800. C'est indiqué par `DEMO UI` sur l'écran et dans les noms des entités, jusqu'à la validation du pont audio. Ne jamais considérer ce bouton comme un interrupteur de confidentialité.

## Architecture conservée

- Un seul ESP32-S3 N16R8, 16 Mo Flash, 8 Mo PSRAM.
- ReSpeaker XVF3800 pour les quatre micros et la sortie HP.
- Waveshare tactile rond 1,85", 360 × 360 (contrôleur / brochage à confirmer sur le module reçu).
- ESPHome + LVGL, Home Assistant Assist + Gemini.
- Musique, commandes domotiques et capteurs conservés dans le projet global : **non réimplémentés dans ce prototype**.

Aucun StackChan/XiaoZhi n'est installé. Les formes/animations sont originales en LVGL, inspirées du principe du petit visage. Aucune IA ne tourne sur l'écran : l'ESP réagit aux événements Assist, Gemini reste dans Home Assistant.

## Comment expérimenter (après validation de l'écran)

Dans **une configuration de test ESPHome**, déjà dotée de l'afficheur `display:`, du tactile `touchscreen:`, de `lvgl:` et de l'audio adaptés :

```yaml
packages:
  kimia_face: !include visage-lvgl.yaml
```

Le bloc ci-dessus suppose que le fichier `visage-lvgl.yaml` a été copié dans le même répertoire que la configuration de test. Pour accéder à ce dépôt **privé** via Git, une authentification adaptée est nécessaire. **Il ne constitue pas une configuration autonome compilable** : il ne contient ni `esp32:`, ni le pilotage QSPI ST77916 du Waveshare, ni le tactile CST816S, ni le câblage I2S du XVF3800.

Pour contrôler le visage sans matériel audio, la nouvelle entité de test `KIMIA V5 - etat visage a tester (DEMO)` permet de choisir `Repos`, `Ecoute`, `Reflexion`, `Parole` ou `Erreur` depuis Home Assistant. Les scripts `kimia_face_*` peuvent aussi être déclenchés depuis les événements Assist plus tard.

## Suite proposée — ordre de validation

1. Réception et test isolé de l'écran Waveshare sur le N16R8 OTRONIC (QSPI / tactile, orientation, fluidité).
2. Compilation de ce package avec le pilote de l'écran, puis test de l'écran tactile et des clignements.
3. Test de stabilité mémoire/CPU avec le XVF3800 et les commandes vocales actives.
4. Branchement des événements `voice_assistant` vers les scripts de visage.
5. **Seulement ensuite** : vraie fonction mute micro, mute HP, volume (identifier le bon étage du flux audio et le composant ESPHome réellement utilisé).
6. Restaurer le retour à la page précédente après une conversation, les pages Musique / Domotique / Capteurs et le réveil depuis « Okay Nabu ».

## Points de vigilance

- Le casque/micro et le DAC du XVF3800 n'ont pas encore été intégralement validés avec **notre** ESP32 externe.
- `voice_assistant.stop` ne garantit pas à lui seul que le micro/wake-word est désactivé. Il faudra couper **tous les chemins d'écoute** ou prévoir un interrupteur matériel selon le niveau de confidentialité visé.
- Volume TTS, média Music Assistant et amplificateur physique peuvent être trois chemins distincts.
- Ne pas modifier la V5 mécanique pour intégrer cette animation : elle est purement logicielle.

### Références

- [ESPHome — LVGL](https://esphome.io/components/lvgl/)
- [ESPHome — LVGL Widgets](https://esphome.io/components/lvgl/widgets/)
- [ESPHome — Voice Assistant](https://esphome.io/components/voice_assistant/)
- [ESPHome — Media Player](https://esphome.io/components/media_player/)
- [M5Stack StackChan](https://github.com/m5stack/StackChan)
- [Exemple ESPHome face.yaml](https://github.com/MichalZaniewicz/esphome-esp32-s3-box-3-va/blob/main/base/screens/face.yaml)
