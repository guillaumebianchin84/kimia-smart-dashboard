# KIMIA Smart — correctif terrain Zigbee / prises (8 novembre 2026)

**Statut : correctif GitHub prêt à tester, PAS déployé automatiquement sur Home Assistant.**
Base : `design/kimia-zigbee-cameras-20261027`.
Ne pas modifier les installations de production ni la VM100.

## Constats lors du premier essai réel

- Home Assistant ZHA détecte le SMLIGHT SLZB-06U et l'intégration KIMIA peut lancer `zha.permit` pendant 60 secondes.
- Le gestionnaire listait le coordinateur Texas Instruments CC2652 comme un appareil à renommer.
- Une ancienne détection était présentée au même endroit qu'un nouvel appareil.
- L'actualisation automatique du formulaire toutes les 5 secondes effaçait les saisies lors d'une recherche active.
- L'onglet **Prises** créait aussi une tuile de réglage « LED réseau » et le toucher sur les tuiles d'interrupteur ouvrait la fiche, au lieu de commuter la prise.

## Deux fichiers à remplacer sur l'instance HA de test

| Fichier GitHub | Destination sur Home Assistant |
|---|---|
| `www/kimia-zigbee-manager-v1-card.js` | `/config/www/kimia-zigbee-manager-v1-card.js` |
| `www/kimia-smart-core-v1.js` | `/config/www/kimia-smart-core-v1.js` |

Ne PAS confondre `kimia-zigbee-manager-v1-card.js` et l'ancienne carte sans `-v1`.
Ne pas remplacer les dashboards YAML : le moteur réalise une synchronisation contrôlée des cartes existantes.

### Installation prudente

1. Faire une sauvegarde Home Assistant et sauvegarder les deux anciens fichiers `.js`.
2. Télécharger les deux fichiers en **Raw** depuis la branche de correctif GitHub.
3. Remplacer exactement ces deux fichiers dans `/config/www/` sur la VM KIMIA de test.
4. Dans **Paramètres → Tableaux de bord → Ressources**, changer les URLs des ressources existantes pour forcer le rafraîchissement :
   - `/local/kimia-zigbee-manager-v1-card.js?v=20261108`
   - `/local/kimia-smart-core-v1.js?v=20261108`
5. Recharger complètement la page sur PC et sur mobile. Le moteur JavaScript ne se remplace pas à chaud dans une page déjà chargée.
6. Ouvrir **KIMIA Configuration → Appareils** : le coordinateur ne doit plus figurer dans la liste.
7. Lancer une recherche Zigbee de 60 s. Les appareils déjà associés portent l'étiquette **Déjà connecté**, les nouveaux **NOUVEAU**. Le formulaire de renommage est verrouillé pendant les 60 s.
8. Après la recherche, nommer et affecter l'appareil à une pièce. La synchronisation KIMIA est déclenchée après enregistrement.
9. Pour nettoyer les tuiles déjà existantes, ouvrir **KIMIA Configuration → Démarrer → Actualiser ma maison**. Le moteur supprime les tuiles générées des réglages `diagnostic`/`config` et « LED réseau » et migre ses anciennes tuiles automatiques de prises.
10. Sur **KIMIA Nouvelle génération → Prises**, toucher la tuile principale doit provoquer l'action réelle ON/OFF. L'appui long ouvre toujours le détail.

### Périmètre et limites

- Les cartes créées ou personnalisées manuellement ne sont jamais écrasées ; une ancienne tuile personnalisée n'est donc pas migrée automatiquement.
- ZHA et les appareils déjà appairés restent intacts. Aucune suppression Zigbee ni réinitialisation n'est réalisée.
- Le filtre « LED réseau » cible uniquement des réglages de ce type et les entités `config` / `diagnostic`, sans masquer les interrupteurs normaux.
- Les tests exécutés sur le code sont des simulations, pas des vérifications physiques de relais, de radio ou de Home Assistant.
- Si le résultat est inattendu : restaurer les deux fichiers depuis la sauvegarde, restaurer les URLs de ressources précédentes, puis actualiser. Ne pas réinitialiser le coordinateur.

## Tests logiciels

- `tests/kimia_v1.test.cjs` : exclusion des faux interrupteurs LED, ON/OFF au toucher, migration des tuiles auto, préservation des tuiles personnalisées.
- `tests/kimia_zigbee_v1.test.cjs` : coordinateur masqué, classement Nouveau / Déjà connecté, blocage du formulaire pendant la recherche et enregistrement après recherche.

Documentation officielle des actions de cartes : https://www.home-assistant.io/dashboards/actions/
