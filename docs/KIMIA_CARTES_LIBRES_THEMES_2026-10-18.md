# KIMIA Smart — onglets déplaçables et sélection de thème
18 octobre 2026 — branche `fix/kimia-cartes-libres-themes-20261018`

## Ce qui est modifié

- **Accueil préservé** : plan Maquette, zones, badges, scènes, météo, actualités et barre de navigation ; URL du calque actualisée d'après l'export Home Assistant fourni.
- Onglets **Lumières, Volets, Climatisation, Musique, Sécurité, Prises et Actualités** : cartes d'équipement individuelles, directement dans les sections natives HA. Aucun `horizontal-stack`, `vertical-stack` ni `grid` Lovelace imbriqué n'est ajouté dans ces vues.
- Les `grid_options` de dimensionnement imposées aux cartes secondaires ont été retirées ; leur taille et position se règlent normalement dans **Modifier le tableau de bord > Modifier la carte > Disposition**.
- **Paramètres** : 4 cartes de thème indépendantes, affichant le choix actif, et la liste native du sélecteur `input_select.kimia_theme_global`.
- Suppression du bouton cassé vers `/kimia-client/configuration` (dashboard inexistant dans la VM).
- Les paramètres Météo/Journal ne sont pas présentés comme des commandes fonctionnelles : les helpers existent, mais leur effet n'est pas connecté à l'Accueil, volontairement conservé.
- `dashboard-ui-import.yaml`, `dashboard.yaml` et les 9 `views/*.yaml` sont synchronisés dans cette branche.

## Installation de test sur la VM

1. Sauvegarder **le YAML actuel de KIMIA Smart** et, si possible, effectuer une sauvegarde HA.
2. Ouvrir le fichier **`dashboard-ui-import.yaml` sur cette branche**, choisir **Raw**, copier le contenu entier.
3. Dans le dashboard KIMIA Smart (mode interface / storage) : **Modifier > Éditeur de configuration brute**, remplacer le YAML complet et enregistrer. **Ne pas coller le contenu dans une seule carte**, cela crée une erreur de configuration.
4. Contrôler Accueil / onglets / Navbar en dehors du mode édition, et essayer le déplacement d'une carte depuis le mode édition.
5. Tester dans Paramètres la sélection de **KIMIA Gris Premium**, **KIMIA Clair**, **KIMIA Sombre**, **KIMIA Signature**. Le texte « Sélectionné » doit changer immédiatement.

## Si le thème choisi ne modifie pas l'écran

Le bouton modifie `input_select.kimia_theme_global`. Le package `packages/kimia_client_theme.yaml` contient l'automatisation `KIMIA - Appliquer le thème client` qui appelle `frontend.set_theme`. Vérifier :

- L'helper change bien de valeur dans Outils de développement > États.
- L'automatisation `KIMIA - Appliquer le thème client` existe, est activée et s'exécute sans erreur (traces).
- Les 4 thèmes sont réellement chargés via `frontend.themes` et leur nom correspond exactement aux options de l'helper.
- **Dans le profil de l'utilisateur connecté**, sélectionner « Utiliser le thème par défaut » : un thème choisi explicitement dans le profil prend le dessus sur `frontend.set_theme`.
- Rafraîchir l'application / le navigateur après le changement de thème si nécessaire.

Un retour « Sélectionné » sans changement visuel ne démontre donc pas que la chaîne de mise en thème fonctionne.

## Ce qui reste volontairement hors périmètre

- Les cartes « À associer » **ne pilotent pas de matériel** avant association aux entités réelles de chaque client.
- Les commandes météo / journal ne peuvent pas être rendues opérantes sans modifier l'Accueil. Les helpers sont conservés, mais les commandes masquées.
- Le calque `/api/image/serve/ebec086d86139c746e6c96840972461c/original` est **interne à la VM actuelle** et n'est pas exporté comme image dans GitHub.
- Cette branche n'a **pas été testée sur la VM ni sur une tablette physique**. Tester avant toute fusion/déploiement client.

La branche `main` reste inchangée.
