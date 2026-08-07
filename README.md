# Archives — Lépine Versailles

Application de gestion des archives physiques pour EHPAD/SSIAD/CCAS.  
Remplace le fichier Excel de suivi des cartons d'archives avec conformité CNIL intégrée.

## Stack

- **Frontend** : React + TailwindCSS (Vite) + Nginx
- **Backend** : Node.js + Express + JWT/bcrypt
- **Base de données** : PostgreSQL 16
- **Déploiement** : Docker Compose (4 services)

## Démarrage rapide

```bash
cp .env.example .env
# Modifier JWT_SECRET et POSTGRES_PASSWORD dans .env
docker compose up -d
```

L'application est accessible sur `http://localhost:8080`.

## Créer le premier admin

```bash
docker compose exec backend node scripts/create-admin.js admin@lepine.fr motdepasse Admin Super
```

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `POSTGRES_USER` | Utilisateur PostgreSQL | `archives` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `archives_secret` |
| `JWT_SECRET` | Secret pour signer les tokens JWT (≥ 32 caractères) | `change-me-in-production` |
| `APP_PORT` | Port exposé pour l'application | `8080` |
| `COOKIE_SECURE` | Mettre à `false` pour un déploiement **HTTP interne** (sans TLS) : désactive le flag `Secure` du cookie de session, sinon la reconnexion auto échoue | *(vide → `Secure` en production)* |

## Architecture

```
├── frontend/          # React + Vite + TailwindCSS
│   ├── src/
│   ├── Dockerfile     # Build multi-stage (node → nginx)
│   └── nginx.conf     # Reverse proxy /api → backend
├── backend/           # Express API REST
│   ├── src/
│   │   ├── server.js
│   │   ├── db.js
│   │   ├── middleware/auth.js
│   │   └── routes/
│   ├── scripts/create-admin.js
│   └── Dockerfile
├── db/init/           # Scripts SQL initiaux
│   ├── 01_schema.sql
│   └── 02_seed_categories_cnil.sql
├── backups/           # Backups quotidiens automatiques
└── docker-compose.yml
```

## Services Docker

| Service | Description |
|---------|-------------|
| `db` | PostgreSQL 16 avec healthcheck |
| `backend` | API Express sur port 4000 (interne) |
| `frontend` | Nginx servant le SPA + proxy API |
| `backup` | Sauvegarde quotidienne compressée (`pg_dump -Fc`), vérifiée, rétention 30 jours |

## Sauvegardes et restauration

Le service `backup` réalise une sauvegarde compressée (`pg_dump -Fc`) toutes les 24 h dans
le dossier `backups/`, sous la forme `backup_AAAAMMJJ_HHMMSS.dump`. Chaque cycle est vérifié
(code retour de `pg_dump` **et** taille du fichier) et son résultat est écrit dans
`backups/status.json`. Le dashboard affiche une alerte si aucune sauvegarde n'a réussi
depuis plus de 48 h.

Pour restaurer une sauvegarde (format compressé) :

```bash
docker compose exec backup \
  pg_restore -h db -U archives -d archives --clean --if-exists /backups/backup_AAAAMMJJ_HHMMSS.dump
```

## Authentification

- **Access token JWT** conservé en mémoire (jamais en localStorage), durée de vie **2 h**.
- **Refresh token** en cookie `httpOnly` / `SameSite=Strict` (durée **7 jours**, marqué `Secure` en production — voir `COOKIE_SECURE`).
- **Session restaurée au rechargement de page (F5)** via le refresh token tant qu'il est valide ; la déconnexion ou l'expiration renvoie au login.
- Suppression ou désactivation d'un compte → ses sessions actives sont **révoquées immédiatement**.
- Menu profil (bas de la barre latérale) : **changement de mot de passe** volontaire et déconnexion.
- **Mot de passe oublié sans email** : la demande est transmise à un administrateur, qui réinitialise depuis l'espace d'administration.

## Rôles

| Rôle | Accès |
|------|-------|
| `super_admin` | Tout, y compris la gestion des autres administrateurs |
| `admin` | Tableau de bord, saisie, cartons, inventaire, recherche, à compléter, destruction (dont validation des demandes), référentiel, administration |
| `archiviste` | Saisie, cartons, inventaire, recherche, à compléter, proposition de destruction, référentiel |
| `consultation` | Inventaire, recherche, référentiel (lecture seule) |

## Pages

- **Tableau de bord** — KPIs, répartitions, alertes prioritaires
- **Saisie** — Création de cartons + documents (formulaire 2 étapes, par blocs service/catégorie). Le préfixe du numéro de carton vient de la salle.
- **Inventaire** — Tableau complet avec filtres, tri, export CSV, et **emprunt / retour** de documents
- **Cartons** — Liste des cartons avec nombre de documents actifs, mise en évidence des cartons **vides / presque vides**, ajout de documents et modification d'emplacement
- **Recherche** — Localisation physique d'un document (recherche tolérante aux fautes)
- **À compléter** — Documents dont la date limite n'est pas encore calculable ; complétion des précisions, **y compris l'attribution d'une catégorie CNIL** pour les documents importés sans catégorie
- **À détruire** — Alertes CNIL, filtres, et **circuit de destruction** (proposition par l'archiviste → validation par l'admin) ou destruction directe
- **Référentiel CNIL** — Tableau des durées légales de conservation
- **Administration** — Salles & étagères (avec **préfixe de numérotation** configurable), utilisateurs, **réinitialisations de mot de passe**, corbeille, journal d'audit

## Services métier

Chaque document est rattaché à un **service** : RH, Comptabilité, Médical, Juridique, Sécurité,
Administratif, Social, CRT, SAD mixte, Autre. Le service filtre les catégories CNIL proposées.

## Personnalisation client (branding)

Le **nom affiché** et le **logo** sont pilotés par le dossier `branding/` (monté en lecture seule
dans le conteneur frontend), sans rebuild ni redéploiement du code : il suffit d'y déposer
`client-logo.png` et, en option, `branding.json` (`{ "client_name": "…" }`).
Voir `branding/README.md`. Absents → nom générique « Archives » et icône par défaut, sans erreur.

## Accès distant et chiffrement

L'application est servie en HTTP et doit rester sur le réseau interne de l'établissement.
Pour un accès chiffré ou depuis l'extérieur, placez un reverse proxy TLS (Caddy ou équivalent)
devant le port de l'application, qui se charge du certificat et du HTTPS.
Cette mise en place constitue une prestation d'installation séparée.

## Développement local (sans Docker)

```bash
# Terminal 1 — Backend
cd backend && npm install
DATABASE_URL=postgresql://archives:archives_secret@localhost:5432/archives JWT_SECRET=dev-secret-local-only-min-32-caracteres COOKIE_SECURE=false node --watch src/server.js

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

Le proxy Vite redirige automatiquement `/api` vers `http://localhost:4000`.
