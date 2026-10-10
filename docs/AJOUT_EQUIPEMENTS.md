# KIMIA Smart — ajout simplifié des équipements (prototype v0.3)

## Objectif

Un installateur KIMIA configure un nouvel appareil depuis **Configuration KIMIA Smart** :
1. Il ouvre l'association **Zigbee via ZHA** (bouton 120 secondes), ou ajoute l'intégration correspondante pour une caméra / enceinte Wi-Fi.
2. Il actualise la liste des appareils détectés.
3. Il crée ou choisit une pièce, définit le nom et sélectionne la fonction de l'appareil.
4. Il enregistre. L'appareil apparaît automatiquement dans sa rubrique et sa pièce, sans modification des fichiers YAML.

**Une initialisation technique Home Assistant reste nécessaire une seule fois** pour installer KIMIA, configurer ZHA et les autres intégrations. La page KIMIA ne peut pas associer universellement toutes les marques.

## Technique

- `www/kimia-cards.js` : deux cartes Lovelace sans dépendances externes.
  - `custom:kimia-setup-card` : création de pièces, association ZHA, nommage, classement.
  - `custom:kimia-auto-card` : lecture des registres Home Assistant et regroupement automatique.
- Les pièces sont les **Areas** natives Home Assistant.
- Les catégories sont des **Labels** natifs de type `KIMIA · Lumières`, etc.
- L'association Zigbee déclenche l'action officielle `zha.permit`.
- Les cartes détectent les domaines standards (`light`, `cover`, `switch`, `climate`, `media_player`, `camera`, `binary_sensor`) et les étiquettes ajoutées par l'installateur.
- Les modifications des registres sont soumises aux autorisations administrateur de Home Assistant.

## Installation sur une VM de test

**Ne pas installer avant d'avoir fait une sauvegarde.** Le prototype n'a pas encore été exécuté sur une instance Home Assistant réelle.

Depuis la branche `feat/configuration-dynamique` :

1. Copier `dashboard.yaml`, `configuration-dashboard.yaml` et `views/` vers `/config/kimia/`.
2. Copier `www/kimia-cards.js` vers `/config/www/kimia-cards.js`.
3. Conserver le thème `themes/KIMIA-Smart.yaml` dans `/config/themes/`.
4. Dans **Paramètres → Tableaux de bord → Ressources**, enregistrer `/local/kimia-cards.js?v=0.3` comme **module JavaScript**. Si le dossier `www` vient d'être créé, redémarrer Home Assistant.
5. Ajouter / fusionner dans `configuration.yaml` sous **l'unique clé `lovelace:`** :

```yaml
lovelace:
  dashboards:
    kimia-smart:
      mode: yaml
      title: KIMIA Smart
      icon: mdi:home-variant
      show_in_sidebar: true
      filename: kimia/dashboard.yaml
    kimia-configuration:
      mode: yaml
      title: Configuration KIMIA
      icon: mdi:cog-outline
      show_in_sidebar: false
      filename: kimia/configuration-dashboard.yaml
```

6. Vérifier la configuration puis redémarrer Home Assistant. Ouvrir **KIMIA Smart → Paramètres → Configuration KIMIA** avec un compte administrateur.
7. Pour associer Zigbee, avoir au préalable configuré **ZHA** et le SMLIGHT comme coordinateur.

Les deux dashboards sont séparés : la configuration n'est pas affichée dans la barre latérale, mais reste accessible à son adresse si quelqu'un la connaît. **Seul un administrateur est autorisé à modifier les appareils**.

## Couverture du catalogue initial

| Matériel | Détection attendue dans HA | Affichage KIMIA |
|---|---|---|
| LEDVANCE SMART+ E27/GU10 | `light` (si ZHA reconnaît le modèle) | Lumières |
| SONOFF S60ZBTPF | `switch` et éventuellement `sensor` | Prises |
| SONOFF ZBMINIL2 / ZBMINIR2 | généralement `switch` | Prises ou Lumières après classement |
| SONOFF SNZB-04P / SNZB-03P / SNZB-05P / SNZB-06P | `binary_sensor` ou autres selon modèle | Sécurité, si classe de capteur reconnue |
| SONOFF SNZB-02P | `sensor` | Affichage capteurs à développer |
| SONOFF MINI-ZBD | selon intégration | À valider (contact sec / portail) |
| Google Nest Mini / Home Speaker | `media_player` via Google Cast | Musique |
| Caméra compatible HA | `camera` via intégration adaptée | Sécurité / Caméras |

**Volets :** le catalogue ne comprend pas de module motorisation de volet spécifiquement validé. Un relais simple n'est **pas** à employer directement pour inverser le sens d'un moteur de volet sans commande adaptée / interverrouillage. Pour disposer d'ouvertures, fermetures et positions, privilégier une intégration exposant une vraie entité `cover`.

**Google/Matter :** l'affectation KIMIA n'expose pas automatiquement les équipements à Google Home. Le pont SONOFF ZBBridge-U et Google doivent être configurés séparément et la compatibilité testée.

**Caméras SONOFF :** aucune référence caméra précise n'est sélectionnée dans le catalogue joint. Il faudra retenir et valider des modèles compatibles avant d'en vendre.

## Limites v0.3

- Prototype frontend **non testé en situation réelle** (compatibilité API, navigation, ergonomie tablette/téléphone à contrôler).
- L'appareil doit déjà être reconnu par Home Assistant ; un appairage caméra ou Google nécessite encore l'intégration native.
- La détection fonctionne par domaine HA, avec possibilité de surclasser une fonction grâce aux étiquettes.
- Les entités sans appareil dans le registre ne sont pas prises en charge dans l'assistant d'affectation v0.3.
- Les réglages avancés des appareils restent accessibles dans la fenêtre détaillée HA.
- L'affichage des caméras ne contient pas de mosaïque de flux en direct dans cette version.
- Il n'existe pas encore d'ajout automatique d'automatisations, de scénarios, de flux MP3 ou d'exposition Matter/Google.

Prochaine étape : test sur VM, correction des bugs rencontrés, ergonomie de l'assistant et prise en charge de la télémétrie (température, humidité, conso).
