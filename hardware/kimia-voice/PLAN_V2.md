# Plan de travail V2 — KIMIA Voice

## Objectif prioritaire
Préserver la qualité d'écoute déjà constatée avec le XVF3800 posé à plat sur une table. L'écran ne doit jamais perturber le wake-word ni saturer l'ESP32.

## Mécanique
- [ ] Photographie du XVF3800 nu recto/verso, repères des quatre microphones et de ses trous de montage.
- [ ] Relever les connecteurs et la position des LEDs visibles sous le plexiglas.
- [ ] Tester diamètre du logement XVF3800 par pièce de calibration avant impression complète.
- [ ] Vérifier le montage du Visaton FR7 sur le cercle de perçage Ø74 mm.
- [ ] Ajouter assemblage démontable par inserts filetés M3 et joints souples.
- [ ] Réserver une sortie audio périphérique sous la base et dissocier totalement la chambre du HP des microphones.
- [ ] Isoler thermiquement le SHT45, ventiler son emplacement extérieur.
- [ ] Placer le LD2410 derrière du plastique non métallisé.

## Électronique
- [ ] Faire un tableau de brochage réel du firmware XVF3800 utilisé pour KIMIA.
- [ ] Mesurer GPIO libres du XIAO ESP32-S3 et bus déjà occupés.
- [ ] Valider interface et support ESPHome de l'écran rond 1,85 pouce **avant achat**.
- [ ] Prévoir commande mute microphone et indicateur d'état.
- [ ] Valider alimentation commune 5 V et appels de courant audio.

## Firmware
- [ ] Wake-word et assistant sans écran (baseline).
- [ ] Ajouter séparément SHT45 puis LD2410.
- [ ] Ajouter l'écran puis tester latence et autonomie de fonctionnement.
- [ ] Afficher température, humidité, animation écoute/réponse; tactile optionnel.
- [ ] Vérifier audio en sortie amplifiée JST et retour d'écho.

## Essais
- [ ] Compréhension vocale à 1, 3, 5 m, appareil posé sur table.
- [ ] Compréhension vocale pendant diffusion de voix par le HP.
- [ ] Mesure de température SHT45 avec instrument étalon.
- [ ] Essai thermique de longue durée et stabilité Wi-Fi.
- [ ] Ajuster chambre acoustique après écoute et mesurer les vibrations.

**Aucune cote provisoire ne doit être présentée comme garantie d'interchangeabilité sans montage physique.**
