# Branding client

Ce dossier porte l'identité visuelle du client courant. Il est **monté en lecture seule**
dans le conteneur frontend (`./branding:/usr/share/nginx/html/branding:ro`) et sert le
même build à tous les clients : il suffit d'y déposer les fichiers ci-dessous à l'installation.

> ⚠️ **Ces fichiers client ne sont JAMAIS commités** (ils sont ignorés par git).
> Seul ce `README.md` est versionné, à titre de convention. N'ajoutez pas de logo ni de
> `branding.json` réel au dépôt.

## Fichiers attendus

### 1. Le logo — `client-logo.png` (recommandé)
- **PNG à fond transparent**, carré, **~512 × 512 px**.
- Sert à la fois dans l'interface (barre latérale, page de connexion) et comme icône de
  l'application installée (PWA), quand il est présent.
- Noms reconnus, dans l'ordre : `client-logo.png`, `Lepine-logo.png`, `Lepine-logo.jpg`.
  Le premier trouvé est utilisé. **`client-logo.png` est le nom recommandé** pour un nouveau client.

### 2. Le nom — `branding.json` (optionnel)
Fichier JSON facultatif donnant le nom affiché du client :

```json
{ "client_name": "Lépine Versailles" }
```

- Utilisé pour le titre de l'onglet et le nom de l'application installée :
  « Archives — {client_name} ».
- **Absent → nom générique « Archives »** (aucune erreur).

## Comportement par défaut

Si aucun logo ni `branding.json` n'est déposé, l'application reste pleinement fonctionnelle
avec l'icône et le nom **génériques** (« Archives »).
