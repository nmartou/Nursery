# Nursery — Backend (NestJS)

API REST de l'application Nursery. Monolithe NestJS organisé en modules et en couches.

## Prérequis

- Node.js 24+
- npm 11+ (via corepack : `corepack install -g npm@11`)

## Commandes de base

```bash
npm install            # installer les dépendances
npm run start:dev      # lancer en mode développement (watch) sur http://localhost:3000/api
npm run start          # lancer sans watch
npm run build          # compiler dans dist/
npm run start:prod     # lancer la version compilée
npm test               # tests unitaires (Vitest)
npm run test:e2e       # tests end-to-end
npm run lint           # lint (oxlint)
npm run format         # formatage (Prettier)
```

### Avec Docker (seul)

```bash
docker build -t nursery-backend .
docker run -p 3000:3000 nursery-backend
```

## Configuration

Variables d'environnement (voir `.env.example`) :

| Variable      | Défaut                  | Description                     |
| ------------- | ----------------------- | ------------------------------- |
| `PORT`        | `3000`                  | Port d'écoute                   |
| `API_PREFIX`  | `api`                   | Préfixe global des routes       |
| `CORS_ORIGIN` | `http://localhost:4200` | Origine autorisée (frontend)    |
| `DB_DRIVER`   | `memory`                | `memory` (données mockées) ou `postgres` |
| `DB_HOST`     | `localhost`             | Hôte PostgreSQL                 |
| `DB_PORT`     | `5432`                  | Port PostgreSQL                 |
| `DB_USER`     | `nursery`               | Utilisateur PostgreSQL          |
| `DB_PASSWORD` | `nursery`               | Mot de passe PostgreSQL         |
| `DB_NAME`     | `nursery`               | Base PostgreSQL                 |

## Base de données

Les repositories sont écrits pour **PostgreSQL** (driver `pg`). Tant que la base n'existe pas, `DB_DRIVER=memory` (valeur par défaut) utilise des repositories en mémoire avec des données d'exemple : le jour de semaine le plus récent est pré-rempli avec 5 enfants dans des états différents.

Pour passer sur PostgreSQL :

```bash
psql -U nursery -d nursery -f database/schema.sql   # créer les tables
psql -U nursery -d nursery -f database/seed.sql     # données d'exemple (vendredi 16/10/2026)
DB_DRIVER=postgres npm run start:dev
```

Tables : `nursery`, `child`, `parent`, `child_parent` (enfants ↔ parents), `daily_report` (un rapport par enfant et par jour de semaine), `report_meal`, `report_bottle`, `report_nap`.

## Endpoints disponibles

| Méthode | Route                     | Description                                                       |
| ------- | ------------------------- | ----------------------------------------------------------------- |
| GET     | `/api/health`             | État de santé de l'API                                            |
| GET     | `/api/nursery`            | Informations sur la crèche                                        |
| GET     | `/api/daily-reports?date` | Rapports d'un jour de semaine (créés automatiquement s'ils manquent) ; sans date, le jour de semaine le plus récent |
| GET     | `/api/daily-reports/:id`  | Détail d'un rapport                                               |
| PUT     | `/api/daily-reports/:id`  | Enregistrement d'un rapport (statut et heure de modification recalculés) |

Statut d'un rapport, calculé : `todo` (rien de saisi), `in_progress`, `complete` (arrivée, départ, repas ou biberon, sieste ou « pas de sieste »), `absent`.

## Architecture

```
src/
├── main.ts                     # bootstrap (préfixe, CORS, pipes, filtres)
├── app.module.ts               # module racine
├── config/                     # configuration typée (@nestjs/config)
├── app.setup.ts                # configuration HTTP partagée (main + tests e2e)
├── common/                     # éléments transverses
│   ├── constants/              # tokens d'injection, constantes
│   ├── database/               # pool PostgreSQL partagé
│   ├── filters/                # filtres d'exception globaux
│   └── utils/                  # fonctions utilitaires
└── modules/                    # un dossier par domaine métier
    └── nursery/
        ├── controllers/        # couche présentation (HTTP)
        ├── dtos/               # objets d'entrée/sortie de l'API
        ├── services/           # couche application (logique métier)
        ├── models/             # modèles du domaine
        ├── mappers/            # conversion modèle <-> DTO
        ├── utils/              # règles métier pures (ex. calcul du statut d'un rapport)
        └── repositories/       # couche d'accès aux données
            ├── *.repository.ts           # interface
            ├── postgres-*.repository.ts  # implémentation PostgreSQL
            ├── in-memory-*.repository.ts # mock temporaire
            ├── rows/                     # types des lignes SQL
            └── mocks/                    # données d'exemple
database/
├── schema.sql                  # création des tables
└── seed.sql                    # données d'exemple
```

Tests : `*.spec.ts` à côté du code (unitaires, dont le repository PostgreSQL avec un pool mocké) et `test/*.e2e-spec.ts` (intégration HTTP).

Flux d'une requête : `Controller → Service → Repository (interface) → implémentation`.
Le service dépend d'une interface injectée par token (`NURSERY_REPOSITORY`) : l'implémentation en mémoire actuelle pourra être remplacée par une base de données sans modifier la logique métier.

Pour ajouter un domaine : créer `src/modules/<domaine>/` avec la même structure et l'importer dans `app.module.ts`.
