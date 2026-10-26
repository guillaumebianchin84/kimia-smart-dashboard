# KIMIA Smart V1.7 — Maquette adaptative aux pièces Home Assistant

## Principe
L'identité canonique d'une pièce est son **identifiant Home Assistant area_id**. L'administrateur choisit ses pièces dans **KIMIA Configuration → Utilisateurs** ; le système existant transmet automatiquement ces préférences à la Maquette.
Les plans restent conçus librement chez chaque client : fonds, coordonnées, noms, géométrie, nombres d'étages et de pièces. Une pièce dessinée avec `area: salon` hérite des droits de la zone Home Assistant `salon`. Toutes les pièces liées à cette zone sont traitées, quel que soit le plan.

## Fonctionnement
- Administrateur ou utilisateur autorisé : Maquette inchangée.
- Utilisateur non autorisé : la pièce reste visible avec un cadenas dans le nom ; ouverture/zoom et actions connues désactivés ; clics ciblés interceptés ; appels de service dirigés vers ses entités, appareils ou sa zone refusés dans la Maquette.
- Aucun masquage configuré : comportement existant inchangé.
- Les droits suivent l'ID utilisateur HA, pas l'appareil ou le navigateur.
- **Important : filtrage d'interface, pas autorisation serveur.** D'autres dashboards/API/Assist peuvent encore commander des appareils selon la configuration HA.

## Compatibilité éditeur
Le moteur KIMIA enveloppe la carte Maquette en gardant le bloc original, intégralement et sans modification, sous la propriété `card`. L'éditeur Maquette peut toujours rechercher sa carte par ID dans la configuration YAML imbriquée. Aucun polygone, ID de client ou nom de pièce n'est fixé dans le code du moteur.
Si le client modifie son plan, les règles restent liées aux IDs des zones HA. Les pièces non associées à une zone HA ne peuvent pas hériter automatiquement des restrictions : associer leur propriété `area` à la zone HA appropriée.

## Installer uniquement sur VM210
1. Conserver intacte la sauvegarde de référence Proxmox V1.6.3.
2. Remplacer `/config/www/kimia-smart-core-v1.js` et ajouter `/config/www/kimia-maquette-acl-v17-card.js`. Aucun autre fichier n'est à remplacer.
3. Ressources Lovelace (Module JavaScript, sans doublon) : `/local/kimia-smart-core-v1.js?v=170` (modifier l'existante) et `/local/kimia-maquette-acl-v17-card.js?v=170` (nouvelle).
4. Ctrl+F5, puis compte admin : **KIMIA Configuration → Démarrer → Actualiser ma maison**. Le moteur enveloppe les Maquettes existantes sans toucher au plan interne.
5. Tester la restriction sur un compte non administrateur, puis le même plan avec un compte autorisé et un admin.
6. Tester l'éditeur Maquette sur une pièce et recharger pour valider la persistance.
7. Ne réimporter aucun YAML de dashboard. Un redémarrage HA n'est pas nécessaire.

## Tests et limites
CI : simulation de deux étages, noms et coordonnées arbitraires, zone supprimée du profil utilisateur, actions de pièce bloquées, config de plan inchangée, synchronisations répétées. L'éditeur visuel doit encore être vérifié sur la VM210.
Pour les actions personnalisées, les widgets tiers, les scripts globaux et les autres accès Home Assistant, un véritable contrôle d'accès côté serveur sera nécessaire : ce lot ne prétend pas apporter une sécurité complète.
