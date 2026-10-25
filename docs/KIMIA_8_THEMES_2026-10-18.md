# KIMIA Smart — huit thèmes (18 octobre 2026)

La page **Paramètres** du dashboard KIMIA principal contient désormais huit boutons natifs individuels, déplaçables et redimensionnables en mode sections Home Assistant.

| Thème | Ambiance | Fichier |
| --- | --- | --- |
| KIMIA Gris Premium | Anthracite et turquoise (ancien) | `themes/KIMIA-Gris-Premium.yaml` |
| KIMIA Clair | Clair, blanc et turquoise (ancien) | `themes/KIMIA-Clair.yaml` |
| KIMIA Sombre | Bleu nuit / turquoise (ancien) | `themes/KIMIA-Sombre.yaml` |
| KIMIA Signature | Bleu PROMAINT (ancien) | `themes/KIMIA-Smart.yaml` |
| KIMIA Vert Sauge | Clair, vert naturel | `themes/KIMIA-Vert-Sauge.yaml` |
| KIMIA Violet Nuit | Sombre, violet profond | `themes/KIMIA-Violet-Nuit.yaml` |
| KIMIA Sable Doré | Clair, beige et or | `themes/KIMIA-Sable-Dore.yaml` |
| KIMIA Terracotta | Sombre, terre cuite et cuivre | `themes/KIMIA-Terracotta.yaml` |

## Fichiers à installer sur la VM Home Assistant

GitHub **ne déploie pas automatiquement** ces fichiers dans Home Assistant.

1. Sauvegarder la configuration HA.
2. Copier **les 4 nouveaux fichiers** de `themes/` dans `/config/themes/`, sans effacer les 4 anciens.
3. Remplacer **`/config/packages/kimia_client_theme.yaml`** par le fichier de cette branche. Il étend à huit les options de `input_select.kimia_theme_global` et la liste autorisée par l'automatisation `KIMIA - Appliquer le thème client`.
4. Contrôler que `configuration.yaml` contient déjà (une seule fois) les inclusions :
   ```yaml
   homeassistant:
     packages: !include_dir_named packages

   frontend:
     themes: !include_dir_merge_named themes
   ```
   **Ne pas créer de sections en double**. Conserver les autres paramètres et inclusions déjà présents.
5. Vérifier la configuration et **redémarrer Home Assistant** pour recharger les packages et les thèmes.
6. Dans **Outils de développement > États**, ouvrir `input_select.kimia_theme_global` et vérifier la présence des huit options.
7. Dans **Paramètres > Automatisations**, vérifier que `KIMIA - Appliquer le thème client` est activée ; si l'interface ne change pas après une sélection, consulter les traces de cette automatisation.
8. Dans le profil de chaque utilisateur Home Assistant, sélectionner le **thème par défaut** (retirer un thème personnel tel que « Home Assistant »). Un thème choisi par profil reste prioritaire.
9. Installer le nouveau `dashboard-ui-import.yaml` **dans le dashboard KIMIA existant géré par l'interface** (après sauvegarde du YAML). Il affiche les 8 boutons de Paramètres. Ne pas le coller dans un éditeur de carte individuelle.

Pour forcer un test sans attendre un changement d'état, sélectionner successivement deux thèmes différents dans l'helper. L'automatisation doit lancer `frontend.set_theme`. Enregistrer une trace si cela échoue.

## Limites

- La sélection change le **thème par défaut de Home Assistant tout entier**, pas seulement KIMIA.
- Les couleurs CSS codées en dur dans les cartes HACS ne suivent pas forcément le thème ; c'est notamment le cas de certains boutons et widgets d'Accueil.
- L'**Accueil** est strictement inchangé par cette évolution de code. Les onglets secondaires utilisent des cartes individuelles natives.
- Les quatre nouveaux thèmes sont enregistrés dans GitHub, **mais non testés sur la VM**.
