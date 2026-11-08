# KIMIA — Supprimer une routine depuis la liste (08/11/2026)

## Retour terrain
Dans **KIMIA Configuration → Routines**, le bouton « Supprimer » existait déjà, mais uniquement **tout en bas de l'éditeur après ouverture** d'une routine. Ce parcours est peu visible sur PC et téléphone.

## Correction V1.6
Dans l'atelier **Scénarios et automatisations**, la barre « Choisir une routine enregistrée » comporte maintenant trois actions :

- **Ouvrir** — charge la routine dans l'éditeur.
- **Supprimer** — supprime directement la routine **sélectionnée**, sans devoir l'ouvrir ni défiler jusqu'en bas. Bouton inactif sans sélection.
- **↻ Liste** — actualise les routines de Home Assistant.

L'utilisateur doit confirmer la suppression en voyant **le type et le nom** de la routine. Avant d'appeler l'API officielle `DELETE config/{script|automation}/config/{id}`, KIMIA relit deux fois la configuration et refuse si elle a changé entre la lecture et la confirmation. Les routines externes (hors préfixes KIMIA) et comptes non administrateurs restent protégés.

Après suppression réussie, KIMIA vide la sélection, revient à un formulaire neuf si la routine supprimée était ouverte et évite de reproposer temporairement une entité dont l'état Home Assistant n'est pas encore actualisé. Aucune autre routine, scène ou automatisation n'est modifiée.

Le bouton « Supprimer » de bas de page reste disponible pour une routine ouverte. La nouvelle action est simplement **plus facile d'accès**.

## Installation sur la machine KIMIA de test
1. Sauvegarder le fichier actuel `/config/www/kimia-routine-editor-v16-card.js`.
2. Télécharger en **Raw** la version GitHub de la branche `fix/kimia-routines-suppression-directe-20261108`.
3. Remplacer **uniquement** `/config/www/kimia-routine-editor-v16-card.js`.
4. Dans les ressources de Home Assistant, changer **l'URL existante** en `/local/kimia-routine-editor-v16-card.js?v=20261108-delete`. Ne pas créer de doublon.
5. Recharger complètement l'interface puis ouvrir KIMIA Configuration → Routines.
6. Sélectionner une routine de test : « Supprimer » apparaît à côté d'« Ouvrir ». Vérifier l'annulation du message de confirmation, puis éventuellement effectuer une suppression voulue.

**Attention :** la suppression est réelle et permanente dans Home Assistant, sans mise à la corbeille. Faire une sauvegarde Home Assistant pour les routines importantes.

## Tests
- Suppression sans ouverture d'un scénario KIMIA.
- Confirmation annulée : aucune requête DELETE.
- Modification concurrente : suppression bloquée.
- Suppression réussie : entrée retirée de l'interface, y compris si `hass.states` affiche provisoirement l'ancienne entité.
- Routine non KIMIA ou compte non administrateur : suppression impossible.

La correction est dans GitHub ; aucun fichier de Home Assistant n'est changé automatiquement.
