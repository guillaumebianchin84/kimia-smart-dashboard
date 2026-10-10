# NDADOMO — Maquette Home Assistant

Exemple réutilisable d'un plan interactif pour une installation Home Assistant au Gabon.

Cette démonstration utilise **Maquette Card v0.2.0** : [TooMuhtsh/maquette-card](https://github.com/TooMuhtsh/maquette-card).

## Contenu

- [maquette_demo.yaml](./maquette_demo.yaml) : exemple avec 3 pièces fictives, lumière Hue/Zigbee, enceintes Google, production solaire et une fiche contenant une courbe sur 24 h.
- [INSTALLATION.md](./INSTALLATION.md) : procédure pour adapter à la maison d'un client.
- [REFERENCE_TECHNIQUE.md](./REFERENCE_TECHNIQUE.md) : bonnes pratiques (calques PNG, halos, orientation, énergie, confidentialité).

## Architecture cible

- **Home Assistant** pour centraliser la domotique locale.
- **Zigbee** et équipements compatibles pour les commandes locales.
- **Google Cast** pour les enceintes, selon disponibilité réseau et Internet.
- Accès distant à sécuriser et configurer séparément pour chaque client (par exemple Cloudflare Tunnel).

Le modèle présente des *entités fictives*. Il faut impérativement les remplacer par celles de l'installation concernée.

## Confidentialité

**Dépôt public : ne jamais y stocker les plans réels de clients, le calque PNG d'une habitation privée, les numéros de série, les adresses IP internes/externes, les identifiants d'entités révélant une installation personnelle, les sous-domaines clients, ni aucun secret.**

Conserver les versions réellement déployées dans un dépôt privé ou dans l'instance Home Assistant du client. Le dossier de référence d'une maison privée n'est volontairement **pas** inclus ici.
