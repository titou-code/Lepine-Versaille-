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
| `JWT_SECRET` | Secret pour signer les tokens JWT | `change-me-in-production` |
| `APP_PORT` | Port exposé pour l'application | `8080` |

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
| `backup` | Backup quotidien pg_dump, rétention 30 jours |

## Authentification

- JWT stocké en mémoire (pas en localStorage)
- Au refresh de page, l'utilisateur doit se reconnecter
- Tokens signés avec durée de vie de 8 heures

## Rôles

| Rôle | Accès |
|------|-------|
| `admin` | Tout (dashboard, saisie, inventaire, recherche, destruction, référentiel, admin) |
| `archiviste` | Saisie, inventaire, recherche, destruction, référentiel |
| `consultation` | Inventaire, recherche, référentiel (lecture seule) |

## Pages

- **Dashboard** — KPIs, répartitions, alertes prioritaires
- **Saisie** — Création de cartons + documents (formulaire 2 étapes)
- **Inventaire** — Tableau complet avec filtres, tri, export CSV
- **Recherche** — Localisation physique d'un document
- **À détruire** — Alertes CNIL avec workflow de destruction
- **Référentiel CNIL** — Tableau des durées légales de conservation
- **Admin** — Gestion salles, étagères, utilisateurs

## Développement local (sans Docker)

```bash
# Terminal 1 — Backend
cd backend && npm install
DATABASE_URL=postgresql://archives:archives_secret@localhost:5432/archives JWT_SECRET=dev-secret node --watch src/server.js

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

Le proxy Vite redirige automatiquement `/api` vers `http://localhost:4000`.
