# Intégration audio et Home Assistant Assist — CONTRAT TECHNIQUE V1

Ce document sépare **l'interface utilisateur** (créée) du **pilotage matériel réel** (à développer lorsque le XVF3800, le haut-parleur et la chaîne ESPHome auront été testés).

## Événements du visage

Le paquet définit les scripts suivants :

| Script | Quand l'appeler | Visuel |
| --- | --- | --- |
| `kimia_face_idle` | fin de traitement / repos | sourire discret et clignement |
| `kimia_face_listening` | début d'écoute | petite bouche ronde |
| `kimia_face_thinking` | STT terminé | attente et regard mobile |
| `kimia_face_speaking` | début de lecture vocale effective | bouche ouverte / fermée |
| `kimia_face_error` | erreur Assist | bouche colorée, message |

Intégration **indicative à fusionner dans le bloc `voice_assistant` EXISTANT** (ne pas ajouter un second bloc) :

```yaml
voice_assistant:
  # ... conserver TOUT le microphone, speaker, mode wake word existant ...
  on_listening:
    - script.execute: kimia_face_listening
  on_stt_end:
    - script.execute: kimia_face_thinking
  on_tts_stream_start:
    - script.execute: kimia_face_speaking
  on_tts_stream_end:
    - script.execute: kimia_face_idle
  on_end:
    - script.execute: kimia_face_idle
  on_error:
    - script.execute: kimia_face_error
```

**Attention** : `on_tts_stream_start/end` nécessitent le chemin de sortie `speaker:` ESPHome ; ils ne conviennent pas tels quels à un assistant utilisant un `media_player:`. Dans ce cas, écouter l'état du média local, ou utiliser `on_tts_start` comme approximation de la parole et prévoir un retour fiable au repos. Un `on_end` immédiat peut effacer trop tôt une animation : l'ordre réel dépend de l'architecture retenue.

Gemini n'a pas besoin d'une API dédiée pour ce visage : Home Assistant gère la conversation, et le périphérique ne reçoit que les événements de pipeline.

## Commandes sur l'écran

| Entité / script | Fonction **actuelle** | Cible future |
| --- | --- | --- |
| `kimia_ui_mic_requested` | consigne ON/OFF, affichage local | mute de tous les chemins de capture / réveil |
| `kimia_ui_sound_requested` | consigne ON/OFF, affichage local | mute sortie TTS et média |
| `kimia_ui_volume_requested` | consigne 0 à 100 %, pas de 5 | volume de sortie réellement choisi |
| `kimia_face_*` | animation LVGL immédiate | événements du pipeline Assist |

### Pour le micro

La commande doit empêcher **à la fois** l'envoi de parole à Home Assistant **et** le déclenchement du mot d'activation : `voice_assistant.stop` seul ne suffit pas nécessairement. Si le XVF gère le wake word lui-même, vérifier la commande effective d'arrêt du moteur XVF/firmware. Une fonction `MIC OFF` qui laisse le microphone écouter serait trompeuse. Un coupe-micro matériel reste la référence pour une coupure électrique certaine.

### Pour le haut-parleur et le volume

Le composant ESPHome `media_player` expose `media_player.mute`, `media_player.volume_set`, `media_player.volume_up/down`. Ces actions sont utilisables **seulement lorsqu'un media_player ESPHome réel est configuré et pilote la sortie voulue**. Le FR7 est branché sur l'ampli XVF, pas directement sur l'ESP32. Ne jamais relier deux amplificateurs en parallèle sur le haut-parleur.

En présence d'un `speaker:` brut, un contrôle de gain ou mute de la chaîne audio est à concevoir selon les capacités du DAC/amplificateur et du firmware XVF. Le volume de Music Assistant vers les enceintes de la maison est une fonction distincte.

## Tests d'acceptation à réaliser sur banc

- [ ] écran 360×360 réellement initialisé, tactile utilisable
- [ ] aucune erreur de compilation ESPHome
- [ ] clignements et regard fluides pendant l'écoute I2S
- [ ] mémoire libre et stabilité sur 1 h de conversations
- [ ] état micro OFF = aucun déclenchement « Okay Nabu » et aucun flux audio
- [ ] état son OFF = sortie FR7 réellement silencieuse, y compris TTS
- [ ] volume 0–100 % contrôle la bonne sortie et reste cohérent après reboot
- [ ] retour à l'écran précédemment affiché après la réponse
- [ ] gestion de coupure réseau et indisponibilité Home Assistant
