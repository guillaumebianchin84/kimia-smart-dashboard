# KIMIA Smart — Base de coûts et hypothèses de vente

**Date :** 13 novembre 2026  
**Statut :** estimation de travail — **aucun prix de vente définitif validé**.  
**Devise :** euros. Les prix ci-dessous viennent de nos échanges et repérages ; à vérifier sur factures fournisseurs.

## 1. Kit principal **sans enceinte ni accessoires domotiques**

C'est la base retenue pour réfléchir au prix de vente du KIMIA Smart autonome.

| Matériel | Qté | Coût retenu |
| --- | ---: | ---: |
| ODROID-M1S 4 Go (Home Assistant) | 1 | 113 € |
| Routeur Cudy WR3000 AX3000 Wi-Fi 6 / WISP | 1 | 40–50 € |
| Clé Zigbee SMLIGHT SLZB-06U | 1 | ~34 € |
| Alimentations et câbles | 1 lot | ~40 € |
| **Total matériel sans enceinte, sans accessoires** | | **227–237 €** |

**Calcul :** 113 + (40 à 50) + 34 + 40 = **227 à 237 €**.

Inclus dans le *concept* du produit : logiciel Home Assistant, interface KIMIA, accès réseau local, gestion des appareils compatibles et WISP Cudy. Les développements, licences éventuelles, temps d'installation et support ne sont **pas** inclus dans le coût matériel.

## 2. Variantes et accessoires

| Poste complémentaire | Coût estimé |
| --- | ---: |
| Enceinte vocale KIMIA Voice **prototype** | 110–130 € |
| Prise Zigbee | ~13 € |
| Capteur de présence Sonoff | ~14 € |
| 4 ampoules Zigbee RGB | ~70 € au total |
| **Total accessoires domotiques (prise + capteur + 4 ampoules)** | **~97 €** |

| Configuration | Coût matériel estimé |
| --- | ---: |
| **A — Kit sans enceinte et sans accessoires** | **227–237 €** |
| B — Kit **avec** enceinte prototype, sans accessoires domotiques | 337–367 € |
| C — Kit sans enceinte, **avec** accessoires domotiques | 324–334 € |
| D — Kit avec enceinte prototype **et** accessoires domotiques | 434–464 € |

**Attention :** l'enceinte est encore au stade prototype (XVF3800, ESP32-S3, écran, haut-parleur, caisson, éventuels capteurs). Son coût de fabrication en série, assemblage et boîtier ne sont pas confirmés ; contrôler aussi le risque de compter deux fois les câbles/alimentations.

## 3. Première hypothèse de prix de vente : kit A (sans enceinte, sans accessoires)

**Prix de vente indicatif proposé pour étude : 449 €**, **hors frais de transport, d'importation et taxes applicables**. Il s'agit d'une hypothèse commerciale, pas d'une marge nette ni d'un tarif officiellement validé.

| Hypothèse | Montant |
| --- | ---: |
| Prix de vente envisagé | 449 € |
| Coût matériel | 227–237 € |
| **Écart prix de vente – matériel** | **212–222 €** |
| Exemple de temps de préparation / configuration : 2 à 3 h à 30 €/h | −60 à −90 € |
| Exemple d'emballage / petits frais | −10 € |
| Exemple de provision SAV / assistance | −20 € |
| **Reste indicatif avant frais généraux, taxes et logistique** | **92–132 €** |

Les postes de main-d'œuvre, emballage et SAV sont des **hypothèses à mesurer**, pas des dépenses constatées.

**Point de vigilance :** nous avions aussi évoqué une **valorisation de 350 € pour la configuration et l'appairage**. Si ces 350 € représentent réellement le coût de la prestation à fournir au client, un prix de vente de 449 € **ne couvre pas ce scénario** : 449 − (227 à 237) − 350 = **−128 à −138 €** avant autres frais. Il faut alors revoir l'organisation de la prestation ou le prix de vente.

## 4. Coûts encore à compléter avant commercialisation

- Prix d'achat **facturés** (ODROID, Cudy, SLZB, alimentations, accessoires).
- Temps réel d'installation, configuration, appairage et tests de chaque kit.
- Packaging, stockage, expédition France → Gabon, transport et dédouanement.
- Taxes suivant le modèle de facturation et le lieu de vente ; distinguer clairement prix HT/TTC quand le cadre est fixé.
- Provision garantie/SAV, support à distance, retours et remplacements.
- Coûts de services cloud, voix/IA et hébergement éventuels.
- Coût et marge cibles des variantes avec accessoires et avec enceinte.

**Principe :** coût d'achat matériel ≠ coût complet de revient ≠ prix de vente. Ne pas présenter la différence prix–matériel comme du bénéfice net.

## 5. Décisions / suivi

- Base du kit **sans enceinte et sans accessoires** : **227–237 €**.
- Kit avec enceinte prototype : **337–367 €**.
- Accessoires domotiques d'essai : **~97 €**.
- **449 €** : **simple hypothèse de prix de vente** pour le kit sans enceinte ni accessoires, à tester en conditions réelles et à ajuster.
- Pas de modification du code KIMIA ni des dashboards : document budgétaire uniquement.
