# Archives — Lépine Versailles

Application de gestion des archives physiques pour EHPAD/SSIAD/CCAS.  
Remplace le fichier Excel de suivi des cartons d'archives avec conformité CNIL intégrée.

## Stack

- **Frontend** : React + TailwindCSS (Vite)
- **Backend** : Supabase (PostgreSQL + Auth + RLS)
- **Déploiement** : Vercel (front) + Supabase (back)

## Installation locale

```bash
npm install
cp .env.example .env.local
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase |

## Setup base de données

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Ouvrir l'éditeur SQL dans le dashboard Supabase
3. Exécuter `supabase/schema.sql` — crée toutes les tables, RLS, fonctions et vues
4. Exécuter `supabase/seed_categories_cnil.sql` — pré-remplit les 48 catégories CNIL

## Créer le premier utilisateur admin

1. Dans Supabase Dashboard > Authentication > Users, créer un utilisateur
2. Dans l'éditeur SQL, mettre à jour son profil :

```sql
UPDATE profiles
SET nom = 'Admin', prenom = 'Super', role = 'admin'
WHERE id = 'UUID_DU_USER';
```

## Rôles

| Rôle | Accès |
|------|-------|
| `admin` | Tout (dashboard, saisie, inventaire, recherche, destruction, référentiel, admin) |
| `archiviste` | Saisie, inventaire, recherche, destruction, référentiel |
| `consultation` | Inventaire, recherche, référentiel (lecture seule) |

## Déploiement Vercel

1. Connecter le repo GitHub à Vercel
2. Framework preset : Vite
3. Ajouter les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
4. Déployer

## Pages

- **Dashboard** — KPIs, répartitions, alertes prioritaires
- **Saisie** — Création de cartons + documents (formulaire 2 étapes)
- **Inventaire** — Tableau complet avec filtres, tri, export CSV
- **Recherche** — Localisation physique d'un document
- **À détruire** — Alertes CNIL avec workflow de destruction
- **Référentiel CNIL** — Tableau des durées légales de conservation
- **Admin** — Gestion salles, étagères, utilisateurs
