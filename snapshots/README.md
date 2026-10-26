# Sauvegardes de configuration KIMIA Smart

## 26 octobre 2026 — Maquette Libreville et météo compacte

- `kimia-next-maquette-libreville-20261026-meteo-compacte.yaml` : **YAML complet de la maquette / dashboard client de démonstration** (17 vues).
- Source : YAML intégral transmis dans la conversation le 26 octobre 2026 (3 309 lignes).
- **Seul changement** par rapport à ce YAML : remplacement de la carte Clock Weather Card par le rendu compact confirmé fonctionnel (sans horloge géante, trois jours de prévisions et icône plus petite).
- Sont préservés : plan Maquette (géométrie, fond, murs, meubles, étages, cinq zones HA), navigation, quatre boutons scénario, rubriques, options visuelles et cartes personnalisées.
- Contrôle : fichier analysé comme YAML valide ; comparaison structurée avec le YAML reçu, toutes les propriétés sont identiques en dehors de la carte météo.

### Compatibilité avec KIMIA V1.7
Le moteur de permissions Maquette V1.7 est maintenu **dans les fichiers JavaScript du dépôt**, indépendamment de cette sauvegarde YAML. Ce snapshot ne prétend pas être un export automatique après synchronisation de la VM210 : il reconstitue exactement **le YAML fourni plus la météo compacte validée**.

Si ce YAML est réimporté sur une installation disposant des ressources V1.7, **Actualiser ma maison** réappliquera les protections des pièces en fonction des profils de la configuration administrateur ; ne pas l'importer dans une instance existante sans vérifier les personnalisations plus récentes.

Cette sauvegarde GitHub ne remplace ni la sauvegarde Proxmox de la VM210, ni l'export séparé du tableau de bord `kimia-admin-next`, ni les fichiers privés Home Assistant.
