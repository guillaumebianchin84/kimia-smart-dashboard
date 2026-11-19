# Réglages des ampoules ZHA

La page Paramètres client → Paramètres avancés → Réglages des ampoules utilise la session PIN KIMIA existante de dix minutes. Elle ajoute un formulaire Home Assistant et des cartes Markdown natives en douze colonnes. La synchronisation ajoute la page et son accès une seule fois.

## Paramètres et confirmation

Les valeurs proviennent de l’ampoule et de ses clusters d’entrée. La présence d’un attribut dans la définition logicielle Zigpy ne prouve pas sa prise en charge par le matériel. Une lecture explicite réussie est nécessaire pour rendre un réglage modifiable. Une valeur du cache est signalée comme ancienne et reste en lecture seule.

| Réglage | Cluster | Attribut | Valeurs Zigbee |
| --- | --- | --- | --- |
| État au retour du courant | On/Off, `0x0006` | `start_up_on_off`, `0x4003` | 0 éteint, 1 allumé, 2 inversion, 255 dernier état |
| Luminosité au retour du courant | Level Control, `0x0008` | `start_up_current_level`, `0x4000` | 1 à 254, 0 minimum, 255 dernier niveau |
| Blanc au retour du courant | Color Control, `0x0300` | `start_up_color_temperature`, `0x4010` | Mireds dans les limites physiques lues, 65535 dernier blanc |
| Luminosité à l’allumage normal | Level Control | `on_level`, `0x0011` | 1 à 254, 255 dernier niveau |
| Transition à l’allumage | Level Control | `on_transition_time`, `0x0012` | Dixièmes de seconde, 65535 transition commune |
| Transition à l’extinction | Level Control | `off_transition_time`, `0x0013` | Dixièmes de seconde, 65535 transition commune |
| Transition commune | Level Control | `on_off_transition_time`, `0x0010` | Dixièmes de seconde |

Les valeurs personnalisées sont converties depuis les pourcentages, kelvins et secondes du formulaire. Tous les champs commencent par « Conserver le réglage enregistré ». Seuls les champs modifiés sont envoyés.

Une écriture utilise `ZigbeeDevice.write_zigbee_attribute` de ZHA. Le résultat est confirmé uniquement après acquittement réussi et relecture directe avec `allow_cache=False, only_cache=False`. Les valeurs de retour sont comparées aux valeurs demandées. Un échec ou une relecture différente produit un résultat partiel ou non confirmé. Le formulaire impose une nouvelle lecture avant une autre application.

L’application groupée est limitée à vingt ampoules. Le formulaire propose l’intersection des paramètres confirmés et des limites de température. Le serveur valide toutes les cibles avant la première écriture. Une interruption de transport peut néanmoins produire une application partielle. Les résultats sont retournés par ampoule et par attribut. Aucun retour arrière matériel automatique n’est annoncé.

Le bouton d’identification utilise uniquement la commande Identify de trois secondes du point de commande de l’ampoule sélectionnée. Le LQI et le RSSI sont les dernières mesures ZHA disponibles.

## Droits et portée

La commande WebSocket `kimia_settings/bulbs` accepte uniquement `list`, `read`, `apply` et `identify`. Elle impose un compte actif administrateur ou membre du groupe utilisateur standard, une session PIN liée à ce compte, les permissions Home Assistant de commande sur l’entité, et les restrictions `hidden_areas_by_user` du dashboard administrateur. La pièce propre à l’entité prévaut sur celle de l’appareil.

Le serveur résout le véritable appareil ZHA et son point de commande par l’identifiant de l’entité et son identifiant unique. Il accepte uniquement les attributs du tableau. La session est contrôlée à nouveau avant les écritures et l’envoi du résultat. Une opération en cours bloque les opérations concurrentes. Un délai de trois secondes protège les mutations répétées. Les commandes restent accessibles uniquement dans la session locale Home Assistant et ne créent aucune entité Assist ou Gemini.

Le module ne remplace aucun service `light.turn_on`, n’intercepte aucune scène et n’ajoute aucune automatisation. Les commandes explicites de luminosité, couleur et transition continuent à provenir de Home Assistant. L’effet des attributs de transition dépend des commandes ZHA émises et du firmware. Une couleur RGB standard à l’allumage ne dispose pas d’un attribut Zigbee universel sûr dans ce périmètre. Aucun réglage logiciel de couleur n’a été ajouté.

## État des validations au 19 novembre 2026

- Base GitHub vérifiée, PR 38 au commit `1ba2232a2d2b1879cc71609c22dbbdf557f10a49`, avec les PR 36 et 37 dans son historique.
- Références examinées, Home Assistant Core `2026.11.1`, API ZHA `2.4.3` et définitions Zigpy des clusters standards.
- Trente tests JavaScript et vingt-deux tests Python réussis, validation YAML et contrôles de syntaxe réussis. Les essais d’écriture, de relecture et d’INNR utilisent des doubles logiciels.
- Deux comptes et restrictions par pièce, appareil/entité, PIN expiré ou d’un autre compte, ampoules indisponibles, valeurs incompatibles, écriture refusée, relecture incohérente et application groupée sont couverts.
- Les deux INNR RB 282 C réelles sont annoncées débranchées par l’utilisateur. Aucun attribut n’a été modifié sur les appareils réels. Les attributs effectivement présents sur ces deux appareils restent à déterminer.
- Installation DEV effectuée après reconnexion au compte KIMIA Administrateur. Cible confirmée dans l’interface système, Hardkernel ODROID-M1S sous HA Core 2026.11.1.
- Sauvegarde manuelle locale vérifiée, `Custom backup 2026.11.1`, identifiant `26af48c6`, créée le 19 novembre 2026 à 12:19 UTC (13:19 en France), 31,01 Mo. Elle contient les réglages HA et les fichiers de configuration. Copie séparée du moteur précédent, de settings.py et de la liste des ressources également conservée pendant le déploiement.
- Quatre fichiers installés et contrôlés par SHA-256 depuis File Editor. Le moteur a reçu uniquement le correctif des ampoules sur la variante DEV, pour conserver son emplacement du Diagnostic IA. Ressources enregistrées, `/local/kimia-smart-core-v1.js?v=194` et `/local/kimia-bulb-settings-card.js?v=1`. Chargement observé après rechargement du navigateur.
- Première synchronisation réelle, six cartes ajoutées, zéro suppression, zéro mise en forme. Deux synchronisations supplémentaires ont répondu « Votre maison est déjà à jour. Rien à modifier. » La page `/kimia-next/reglages-ampoules` existe avec le bandeau KIMIA, le retour natif en douze colonnes et le verrouillage PIN.
- Les deux INNR sont présentes dans l’inventaire réel, `lampe cuisine` dans Cuisine et `Lampe salon` dans Salon, modèle RB 282 C. Les douze fonctions déclarées par ZHA comprennent le comportement à la mise sous tension, les niveaux au démarrage et à l’allumage, le blanc au démarrage et les trois durées de transition. Elles sont indisponibles. LQI et RSSI sont déclarés mais désactivés. Cela constate les fonctions enregistrées dans HA, sans confirmer leurs valeurs dans les ampoules.
- Le contrôle natif Outils → YAML → Check configuration a renvoyé « Configuration will not prevent Home Assistant from starting! ». La variante effectivement installée passe trente tests JavaScript, vingt-deux tests Python et la validation YAML en simulation locale. Les journaux du navigateur consultés montrent uniquement des erreurs de métadonnées de son extension, sans erreur KIMIA significative dans les vues vérifiées.
- Après accord explicite de Guillaume, le redémarrage natif de Home Assistant DEV a été exécuté. Le navigateur a observé la reconnexion puis le message « Home Assistant has started! ». La page protégée Réglages des ampoules s’ouvre toujours après cette reprise. Aucune écriture Zigbee réelle n’a été effectuée.
- Le formulaire sécurisé de saisie du PIN a bloqué la reprise automatique. L’inventaire de la nouvelle carte, le parcours client non administrateur et l’expiration PIN réelle restent à contrôler après déverrouillage manuel. Le redémarrage réussi ne vaut pas validation du nouveau gestionnaire WebSocket. Les écritures et la persistance au retour du courant attendent les essais physiques.

## Procédure d’installation et reprise

1. Se connecter à `https://demo.domo-pilote.fr` et confirmer l’ODROID-M1S DEV, sa version HA et les ressources chargées. Comparer le JavaScript en service à la base, en particulier l’emplacement propre au DEV du Diagnostic IA. Sauvegarder les fichiers concernés, les ressources Lovelace et le dashboard avant intervention.
2. Copier le nouveau `custom_components/kimia_cudy_clients/bulbs.py` et appliquer les trois lignes de raccordement dans `settings.py` en préservant tout autre changement local.
3. Copier `www/kimia-bulb-settings-card.js`. Appliquer le correctif du moteur à la version en service de `www/kimia-smart-core-v1.js`, après vérification de la concordance avec la PR 38. Conserver les autres adaptations locales.
4. Enregistrer la ressource `/local/kimia-bulb-settings-card.js?v=1` comme module JavaScript et actualiser la version de la ressource du moteur avec une valeur neuve. Contrôler les fichiers et la configuration HA.
5. Demander l’accord explicite de Guillaume avant le redémarrage de Home Assistant. Le composant KIMIA existant est chargé depuis YAML au démarrage et n’implémente aucune fonction native de rechargement. Le nouvel enregistrement WebSocket nécessite de recharger le processus HA.
6. Après accord et redémarrage, ouvrir la page Démarrer et lancer la synchronisation KIMIA. Vérifier deux passages supplémentaires sans doublon, puis l’accès protégé aux ampoules et l’inventaire en cache des deux INNR débranchées.
7. Contrôler un compte standard avec des droits différents et le verrouillage après dix minutes. Ne faire aucune commande Identify, écriture ou commande de lumière pendant les essais sans matériel.

Si le module serveur n’est pas encore chargé, l’interface affiche une indication d’installation nécessaire lorsque HA répond `unknown_command`.

## Essais physiques ultérieurs

Rebrancher les deux ampoules puis lire les réglages depuis KIMIA. Relever les paramètres réellement disponibles sur chacune. Choisir « Toujours allumée », appliquer, et vérifier la relecture de la valeur 1. Éteindre ensuite depuis KIMIA, couper l’alimentation avec l’interrupteur et la rétablir. Vérifier que l’ampoule s’allume. Refaire l’essai avec HA arrêté ou le réseau local indisponible pour confirmer la persistance dans le firmware.

Tester ensuite les niveaux et blancs disponibles, puis les transitions et les scènes explicites. Vérifier que les réglages persistent après une autre coupure et après redémarrage HA. La confirmation par relecture Zigbee ne remplace pas ces essais de firmware.

Pour revenir en arrière, restaurer les deux fichiers existants et la configuration Lovelace sauvegardée, retirer la nouvelle ressource et la nouvelle page ajoutées par cette évolution, puis recharger le navigateur. Un retour arrière du module serveur chargé nécessite également un redémarrage HA autorisé.

## Sources de compatibilité

- [API WebSocket ZHA de Home Assistant 2026.11.1](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/zha/websocket_api.py)
- [Manifest ZHA de Home Assistant 2026.11.1](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/zha/manifest.json)
- [Écriture d’attributs dans ZHA 2.4.3](https://github.com/zigpy/zha/blob/2.4.3/zha/zigbee/device.py)
- [Définitions On/Off et Level Control de Zigpy](https://github.com/zigpy/zigpy/blob/dev/zigpy/zcl/clusters/general.py)
- [Définitions Color Control de Zigpy](https://github.com/zigpy/zigpy/blob/dev/zigpy/zcl/clusters/lighting.py)
