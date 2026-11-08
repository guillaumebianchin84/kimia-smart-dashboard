# KIMIA — Usages des prises, pages et cartes natives (prototype 2026-11-08)

**Statut : candidat de test sur VM KIMIA, pas installé sur Home Assistant, pas fusionné.** Branche de base : `fix/kimia-zigbee-appairage-prises-20261108`.

## Fonctionnement retenu

Une prise Zigbee reste **toujours dans Prises** et dans la vue **Pièces** de sa zone. Son usage principal, choisi par l'administrateur dans **KIMIA Configuration → Appareils**, peut ajouter une présence dans une autre rubrique :

| Usage choisi | Pages supplémentaires | Comportement |
|---|---|---|
| Autre (défaut) | Aucune | ON/OFF dans Prises |
| Lampe / éclairage | Lumières | ON/OFF ; n'ajoute pas une fausse entité `light` |
| Surpresseur | Eau (créée à la demande) | ON/OFF sous réserve de matériel adapté au moteur |
| Climatisation | Climatisation | Fiche détaillée au toucher, pas de basculement direct secteur |
| Ventilateur | Climatisation | ON/OFF |

Cette classification utilise des **labels natifs Home Assistant associés à l'appareil**. Elle ne crée pas de nouvelle entité ni de seconde prise. Les labels tiers restent préservés ; seule l'étiquette d'usage KIMIA est remplacée. Le choix est réversible sans nouveau jumelage Zigbee.

Les appareils autres que les prises ne présentent pas le sélecteur d'usage. La configuration de la prise se fait *après* les 60 secondes d'appairage, jamais pendant.

## Interface client

- **Prises** : une seule tuile native par relais `switch` pilotable ; exclusion des réglages `config`/`diagnostic` et « LED réseau » ; toucher = ON/OFF sauf usage Climatisation.
- **Lumières** : une prise étiquetée Lampe apparaît aussi dans la page existante.
- **Climatisation** : ventilateur ou alimentation de clim affichés dans la page existante. Une prise classée clim reste accessible via la fiche détaillée, sans coupure secteur accidentelle en un toucher. Elle ne devient **pas** un thermostat.
- **Eau** : page créée seulement quand une prise surpresseur existe, avec navigation KIMIA ; aucune donnée de pression/énergie inventée. La page reste si elle a déjà été créée et que l'usage est ensuite supprimé (nettoyage à envisager séparément).
- **Sécurité** : conserve les capteurs et noms des pièces mais **pas** de commandes générales susceptibles d'actionner des prises.
- **Cartes** : largeur native HA 12/12 pour les interrupteurs et capteurs de type `sensor` ou `binary_sensor` gérés par le moteur. Autres types inchangés. Aucune carte CSS spéciale.
- **Énergie** : l'onglet Énergie HA hors du moteur KIMIA `kimia-next` n'est **pas modifié** par ce patch. Un chantier spécifique sera nécessaire pour son interface si elle est distincte.

## Déploiement sur VM KIMIA uniquement

1. Sauvegarder Home Assistant, le YAML du dashboard `kimia-next` et les deux JS actuels.
2. Copier les versions **Raw** des deux fichiers de cette branche dans `/config/www/` :
   - `www/kimia-zigbee-manager-v1-card.js`
   - `www/kimia-smart-core-v1.js`
3. Dans **Paramètres → Tableaux de bord → Ressources**, modifier les deux ressources JS existantes :
   - `/local/kimia-zigbee-manager-v1-card.js?v=20261108-usage`
   - `/local/kimia-smart-core-v1.js?v=20261108-usage`
   Le nom de fichier sur le disque n'a pas changé.
4. Recharger entièrement l'interface PC/mobile. Aller dans **KIMIA Configuration → Appareils** et choisir l'usage de la prise, puis **Enregistrer**.
5. Aller dans **KIMIA Configuration → Démarrer → Actualiser ma maison** pour synchroniser les cartes existantes ; vérifier les pages Prises, Lumières, Climatisation, Eau et Sécurité.
6. Vérifier aussi avec un appareil du groupe et un compte client. La carte native a des actions de service réelles : travailler uniquement avec les équipements de test.

**Important :** aucune commande sectorielle ne doit être envoyée à une climatisation via une prise connectée sans avoir confirmé la compatibilité du fabricant. Pour un surpresseur, respecter intensité moteur, courant de démarrage et protections électriques. L'usage « Surpresseur » sert d'abord au classement.

Le moteur conserve les cartes utilisateur personnalisées ; seules les cartes générées correspondant exactement à un ancien modèle connu sont migrées. Si une tuile personnalisée ne change pas de taille, c'est intentionnel.

## Tests

- Syntaxe JavaScript vérifiée.
- `tests/kimia_v1.test.cjs` : classements par rubrique, page Eau, largeur native, absence de commandes générales en Sécurité, prévention des coupures directes clim, migration non destructive.
- `tests/kimia_zigbee_v1.test.cjs` : coordinateur ignoré, verrouillage pendant appairage, sauvegarde du label d'usage et préservation des labels tiers.
- GitHub Actions sur branche de test.
- Validation finale sur matériel réel obligatoire.

## Bug terrain séparé (non corrigé dans cette branche)

Quand la prise Zigbee est **débranchée**, tenter de l'activer provoque un comportement anormal du dashboard. Problème suivi dans [l'issue #14](https://github.com/guillaumebianchin84/kimia-smart-dashboard/issues/14), à reprendre après la classification. Ne pas présenter cette version comme son correctif.
