# KIMIA Smart — Configuration client et thèmes communs (v0.5)

## Principe validé

Le client dispose d'un **dashboard Configuration client** indépendant
du dashboard KIMIA principal. Il choisit librement parmi quatre thèmes :

- **KIMIA Gris Premium** : gris anthracite, cartes gris ardoise, turquoise.
- **KIMIA Clair** : fond très clair, texte foncé, turquoise discret.
- **KIMIA Sombre** : bleu nuit et turquoise, texte clair.
- **KIMIA Signature** : bleu/turquoise PROMAINT sur fond clair.

Quatre boutons individuels et une liste native Home Assistant
commandent l'helper \`input_select.kimia_theme_global\`.
Une automation déclenche l'action officielle \`frontend.set_theme\`.
Aucun composant ou script JavaScript ne contrôle le changement de thème.

## Limitation officielle à ne pas masquer

**frontend.set_theme choisit le thème par défaut de TOUT Home Assistant.**
Ce n'est pas un thème limité au seul dashboard KIMIA.
Il change donc aussi l'apparence des autres dashboards du client.

**Les préférences enregistrées dans un profil utilisateur sont prioritaires.**
Pour suivre le choix collectif, l'utilisateur doit choisir dans son profil
Home Assistant **Utiliser le thème par défaut**.

Ce choix collectif est adapté à une installation Home Assistant dédiée
entièrement à KIMIA. Pour tester sur la maison personnelle de l'installateur,
le thème par défaut des autres dashboards peut aussi changer.

Les styles CSS \`background\`, \`color\`, etc. codés en dur dans certaines
cartes HACS ou certains dashboards ne seront pas remplacés par le thème.
Privilégier \`var(--primary-text-color)\`, \`var(--card-background-color)\`...

## Installation

Installer depuis \`feat/config-client-themes\` après validation du socle KIMIA.

1. **Quatre thèmes :** copier \`themes/*.yaml\` dans \`/config/themes/\`
   (remplacer les trois thèmes KIMIA antérieurs si déjà installés).
2. **Préférences client :** copier \`packages/kimia_client_theme.yaml\`
   dans \`/config/packages/kimia_client_theme.yaml\`.
3. **Page Configuration client :** copier \`config-client.yaml\` dans
   \`/config/kimia/config-client.yaml\` et
   \`views/09-configuration-client.yaml\` dans
   \`/config/kimia/views/09-configuration-client.yaml\`.
4. Copier également la nouvelle version \`views/07-parametres.yaml\`
   pour disposer d'un bouton vers cette page.
5. Home Assistant doit déjà inclure **une seule fois** :
   \`\`\`yaml
   homeassistant:
     packages: !include_dir_named packages

   frontend:
     themes: !include_dir_merge_named themes
   \`\`\`
   Si les sections existent déjà, ne pas les dupliquer.
6. Ajouter la seconde entrée \`kimia-client\` sous **l'unique clé**
   \`lovelace: dashboards:\`, sans supprimer \`kimia-smart\` :
   \`\`\`yaml
   lovelace:
     dashboards:
       kimia-smart:
         mode: yaml
         title: KIMIA Smart
         icon: mdi:home-variant
         show_in_sidebar: true
         filename: kimia/dashboard.yaml
       kimia-client:
         mode: yaml
         title: Configuration client
         icon: mdi:palette
         show_in_sidebar: true
         filename: kimia/config-client.yaml
   \`\`\`
7. **Vérifier la configuration**, redémarrer Home Assistant,
   puis vérifier les quatre thèmes sous Paramètres utilisateur.
   Accéder à \`/kimia-client/configuration\`.
8. Depuis le profil HA, utiliser le thème sélectionné par défaut ;
   tester les quatre sélections puis redémarrer HA pour vérifier
   la persistance du dernier choix.

## Portée des accès

La page **Configuration client** n'expose pas les réglages réseau,
les comptes, secrets, ni les appareils techniques de Home Assistant.
Elle permet uniquement de choisir l'ambiance visuelle.

Cela **n'enlève pas les droits administrateur natifs** d'un compte existant.
Sur une installation client, créer les comptes non administrateurs et
restreindre l'accès technique via les droits Home Assistant.

## Déploiement et évolutions

Ce prototype n'a pas encore été exécuté sur une VM Home Assistant.
Ne pas fusionner ou installer chez un client avant vérification.
Les dashboards en \`mode: yaml\` sont contrôlés par des fichiers et ne sont
pas réorganisables visuellement comme des dashboards **storage/UI** :
pour que le client déplace les cartes, utiliser des dashboards gérés par l'UI
et importer les vues KIMIA dans ce mode.

Il sera possible d'ajouter ensuite des préférences client,
sans mêler réglages esthétiques et administration technique.
