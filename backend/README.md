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
npm run lint           # lint (ESLint, règles typées + règles du projet)
npm run lint:fix       # corrige automatiquement ce qui peut l'être
npm run format         # formatage (Prettier)
```

### Avec Docker (seul)

```bash
docker build -t nursery-backend .
docker run -p 3000:3000 nursery-backend
```

## Configuration

Variables d'environnement (voir `.env.example`) :

| Variable       | Défaut                  | Description                     |
| -------------- | ----------------------- | ------------------------------- |
| `PORT`         | `3000`                  | Port d'écoute                   |
| `API_PREFIX`   | `api`                   | Préfixe global des routes       |
| `CORS_ORIGIN`  | `http://localhost:4200` | Origine autorisée (frontend)    |
| `DB_HOST`      | `localhost`             | Hôte PostgreSQL                 |
| `DB_PORT`      | `5432`                  | Port PostgreSQL                 |
| `DB_USER`      | `nursery`               | Utilisateur PostgreSQL          |
| `DB_PASSWORD`  | `nursery`               | Mot de passe PostgreSQL         |
| `DB_NAME`      | `nursery`               | Base PostgreSQL                 |
| `DB_TEST_NAME` | `<DB_NAME>_test`        | Base utilisée par les tests e2e |

## Base de données

L'application utilise **PostgreSQL** (13 ou plus) avec l'ORM **[Drizzle](https://orm.drizzle.team)**. Les identifiants se règlent dans `backend/.env` (copie de `.env.example`, jamais commitée).

```bash
cp .env.example .env   # puis renseigner DB_USER, DB_PASSWORD, DB_NAME
npm run db:migrate     # applique les migrations en attente
npm run db:seed        # données d'exemple (vendredi 16/10/2026), seulement si la base est vide
npm run start:dev
npm run db:studio      # explorer la base avec Drizzle Studio
```

- **Schéma** : `src/common/database/schema.ts` décrit les tables, les contraintes et les relations. C'est la source de vérité.
- **Migrations** : après une modification du schéma, `npm run db:generate` produit une migration SQL dans `database/migrations/` (à relire puis commiter avec son dossier `meta/`), et `npm run db:migrate` l'applique. On ne modifie jamais une migration déjà appliquée.
- **Avec Docker** : le conteneur lit `backend/.env` et rejoint la base de la machine hôte via `host.docker.internal`. Les migrations se lancent avec `docker compose run --rm backend npm run db:migrate`.
- **Tests e2e** : ils utilisent une base dédiée (`<DB_NAME>_test`), créée et migrée automatiquement. L'utilisateur PostgreSQL doit avoir le droit `CREATEDB` ; sinon, crée cette base à la main une fois.

Tables : `nursery`, `child`, `parent`, `child_parent` (enfants ↔ parents), `daily_report` (un rapport par enfant et par jour de semaine), `report_meal`, `report_bottle`, `report_nap`.

## Endpoints disponibles

| Méthode | Route                     | Description                                                                                                         |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| GET     | `/api/daily-reports?date` | Rapports d'un jour de semaine (créés automatiquement s'ils manquent) ; sans date, le jour de semaine le plus récent |
| GET     | `/api/daily-reports/:id`  | Détail d'un rapport                                                                                                 |
| PUT     | `/api/daily-reports/:id`  | Enregistrement d'un rapport (statut et heure de modification recalculés)                                            |

Statut d'un rapport, calculé : `todo` (rien de saisi), `in_progress`, `complete` (arrivée, départ, repas ou biberon, sieste ou « pas de sieste »), `absent`.

## Architecture

```
src/
├── main.ts                     # bootstrap (préfixe, CORS, pipes, filtres)
├── app.module.ts               # module racine
├── config/                     # configuration typée (@nestjs/config)
├── app.setup.ts                # configuration HTTP partagée (main + tests e2e)
├── common/                     # éléments transverses
│   ├── constants/              # tokens d'injection (PG_POOL, DRIZZLE)
│   ├── database/               # schéma Drizzle + module fournissant le client
│   ├── filters/                # filtres d'exception globaux
│   └── utils/                  # fonctions utilitaires
└── modules/                    # un dossier par domaine métier
    └── daily-reports/
        ├── controllers/        # couche présentation (HTTP)
        ├── dtos/               # objets d'entrée/sortie de l'API
        ├── services/           # couche application (logique métier)
        ├── models/             # modèles du domaine
        ├── mappers/            # conversion modèle <-> DTO
        ├── utils/              # règles métier pures (ex. calcul du statut d'un rapport)
        ├── repositories/       # accès aux données via Drizzle
        └── testing/            # constantes partagées entre les specs
database/
├── migrations/                 # migrations SQL générées par drizzle-kit (+ meta/)
├── seed.sql                    # données d'exemple
└── db.js                       # npm run db:migrate / db:seed
test/
├── support/test-database.ts    # crée et migre la base de test
└── *.e2e-spec.ts               # tests HTTP sur la base de test
```

Tests : `*.spec.ts` à côté du code (unitaires, repositories simulés par des `vi.fn()`) et `test/*.e2e-spec.ts` (intégration HTTP contre la base de test PostgreSQL).

Flux d'une requête : `Controller → Service → Repository → Drizzle → PostgreSQL`. Le repository convertit les lignes de la base en modèles du domaine, de sorte que les services et les mappers ne dépendent pas du schéma.

Pour ajouter un domaine : créer `src/modules/<domaine>/` avec la même structure et l'importer dans `app.module.ts`.

## Lint

ESLint (`eslint.config.js`) avec typescript-eslint en mode typé. En plus des règles recommandées :

- **Promesses** : `no-floating-promises`, `no-misused-promises`.
- **Typage** : pas de `any` ni de `!`, `switch` exhaustifs sur les unions, conditions booléennes strictes (un `0` n'est jamais traité comme « faux »).
- **Dates** : `toISOString().slice(...)` et `new Date('YYYY-MM-DD')` sont interdits hors de `common/utils/date.util.ts` (décalage de jour selon le fuseau).
- **Règles du projet** (`eslint-rules/`) :
  - `nursery/module-boundaries` : un module n'importe pas les fichiers internes d'un autre (seul son `*.module.ts` est autorisé), `common/` ne dépend d'aucun module, un controller n'importe jamais un repository.
  - `nursery/dto-properties-validated` : chaque propriété d'un DTO d'entrée porte un décorateur class-validator, sinon le `ValidationPipe` la supprime. Les `*ResponseDto` et `*SummaryDto` sont exemptés.
