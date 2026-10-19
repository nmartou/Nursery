# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Nursery : application de communication crèche ↔ parents. Monolithe composé de deux projets **indépendants** (chacun son `package.json`, son lockfile, son Dockerfile ; aucune dépendance partagée) :

- `backend/` : API REST NestJS 12 (ESM, `"type": "module"`), TypeScript 6, PostgreSQL via l'ORM **Drizzle** (`drizzle-orm` sur un pool `pg`).
- `frontend/` : Angular 21 (standalone, signals, OnPush), servi par nginx en production.

L'interface, les messages d'erreur visibles et la documentation sont en **français**. Le code, les identifiants, les commentaires et les messages de commit sont en anglais.

## Commandes

Toutes les commandes se lancent depuis le dossier du projet concerné.

**Backend** (`cd backend`)

```bash
npm run start:dev                  # API sur http://localhost:3000/api (watch)
npm run build                      # nest build -> dist/
npm run lint                       # ESLint, --max-warnings 0
npm test                           # tests unitaires Vitest (*.spec.ts)
npx vitest run src/modules/daily-reports   # un fichier ou un dossier
npx vitest run -t "nom du test"    # un test par son nom
npm run test:e2e                   # tests HTTP (test/*.e2e-spec.ts) sur la base <DB_NAME>_test
npm run db:generate                # génère une migration depuis le schéma Drizzle
npm run db:migrate                 # applique les migrations en attente (lit .env)
npm run db:seed                    # données d'exemple, seulement si la base est vide
npm run db:studio                  # Drizzle Studio, explorateur de la base
```

**Frontend** (`cd frontend`)

```bash
npm start                          # http://localhost:4200 (attend l'API sur :3000)
npm run build
npm run lint                       # ESLint (TS + templates HTML) puis Stylelint (SCSS)
npm test                           # tests unitaires Vitest via @angular/build:unit-test
npx ng test --include src/app/shared/utils/date.utils.spec.ts   # un seul fichier
npm run test:ui                    # Playwright (lance `npm start`, API mockée)
npx playwright test e2e/dashboard.spec.ts
```

Playwright nécessite `npx playwright install chromium` la première fois.

Les deux serveurs de dev sont déclarés dans `.claude/launch.json` (`backend`, `frontend`). `docker compose up --build [backend|frontend]` lance les conteneurs. La stack Docker est autonome : service `db` (PostgreSQL 18, volume `pgdata`, port 5433 sur la machine), service ponctuel `migrate` (`node database/db.js migrate`) dont dépend `backend`, et identifiants dans un `.env` optionnel à la racine (`.env.example`). Elle est indépendante de `backend/.env`, qui sert au développement local sur le PostgreSQL de la machine. L'image backend est en `TZ=Europe/Paris` : le « jour courant » des rapports dépend du fuseau horaire.

## Architecture backend

- **Modules métier** dans `src/modules/<domaine>/` (aujourd'hui seulement `daily-reports`). Chaque module est découpé en couches : `controllers → services → repositories`, avec `dtos/`, `mappers/` (DTO ↔ modèle), `models/` (modèles du domaine, indépendants de la base) et `testing/` (constantes partagées entre les specs).
- **Repositories** : ce sont des classes `@Injectable()` qui reçoivent le client Drizzle (`@Inject(DRIZZLE) db: Database`) et convertissent les lignes en modèles du domaine. Les services injectent la classe directement : il n'y a ni interface, ni token, ni implémentation en mémoire.
- **Base de données** (`src/common/database/`) :
  - `schema.ts` est la source de vérité unique : tables, contraintes, index et `relations()` utilisées par l'API relationnelle (`db.query.<table>.findMany({ with })`). Les colonnes sont nommées en snake_case explicite, les propriétés en camelCase.
  - `database.module.ts` (global) fournit `PG_POOL` et `DRIZZLE`. Le pool ne se connecte qu'à la première requête.
- **`app.setup.ts`** regroupe la configuration HTTP commune à `main.ts` et aux tests e2e : préfixe `api`, CORS, `ValidationPipe({ whitelist: true, transform: true })` et filtre d'exceptions. À cause de `whitelist`, toute propriété de DTO d'entrée sans décorateur class-validator est supprimée silencieusement. La règle de lint `nursery/dto-properties-validated` le vérifie.
- **Configuration** : `@nestjs/config` avec des fichiers typés (`src/config/*.config.ts`, `registerAs`), lus via `config.getOrThrow<T>('app' | 'database')`. Les variables viennent de `backend/.env` (non versionné ; modèle dans `.env.example`).
- **Les imports relatifs se terminent par `.js`** (ESM `nodenext`), même s'ils pointent vers des fichiers `.ts`.

### Base de données

- **Migrations** : pour faire évoluer le schéma, on modifie `schema.ts`, puis `npm run db:generate` produit une migration SQL dans `database/migrations/` (avec `meta/`, à commiter). `npm run db:migrate` l'applique via le migrateur de `drizzle-orm` (`database/db.js`), qui fonctionne aussi dans l'image Docker. On ne modifie jamais une migration déjà appliquée.
- **Tests e2e** : ils tournent sur une vraie base, `<DB_NAME>_test` (ou `DB_TEST_NAME`). Elle est créée et migrée automatiquement par `test/support/test-database.ts`, et chaque test la vide puis insère ses propres données.
- Contraintes métier imposées par le schéma :
  - un seul rapport par enfant et par jour (`UNIQUE (child_id, report_date)`) ;
  - jours de semaine uniquement (`CHECK ISODOW < 6`) ;
  - commentaire obligatoire si les selles ne sont pas « normales ».
- **Création automatique des rapports** : `GET /daily-reports?date=` crée les rapports manquants du jour pour chaque enfant actif (`ensureReportsForDate` : lecture des enfants actifs puis `INSERT ... ON CONFLICT DO NOTHING` ; l'`insert().select()` de Drizzle exige toutes les colonnes de la table, il n'est donc pas utilisé).
- **Statut d'un rapport** : il n'est pas stocké, il est recalculé (`modules/daily-reports/utils/report-status.util.ts`) et vaut `todo`, `in_progress`, `complete` ou `absent`.
- **Dates et heures** : les dates circulent en chaînes `YYYY-MM-DD` (`date({ mode: 'string' })`). Les heures sont en `HH:mm` dans l'API, mais PostgreSQL renvoie `HH:mm:ss` : les repositories passent par `toHourMinute()`.
- **Identifiants** : ce sont des UUID, validés par `ParseUUIDPipe` dans les routes (un id invalide renvoie 400, pas 500).

## Architecture frontend

- `src/app/core/` : mise en page (`MainLayout` + `Sidebar` rétractable), `ApiService` (enveloppe d'`HttpClient` qui préfixe les URL avec `environment.apiUrl`), constantes de navigation.
- `src/app/features/<feature>/` : pages chargées à la demande (`loadComponent` dans `app.routes.ts`, routes en français : `/accueil`, `/rapports`), avec leurs composants, services, modèles et utilitaires.
- **Tableau de bord** (`features/dashboard`, route `/accueil`) : une grille de tuiles autonomes. Chaque tuile est un composant bâti sur `DashboardTile` qui charge ses propres données, via une méthode de `DashboardService` appelant un endpoint du domaine concerné (ex. `GET /daily-reports/stats`). Le backend n'a pas de module « dashboard ». Comme une feature ne peut pas importer une autre feature, la tuile redéfinit les types et libellés dont elle a besoin.
- `src/app/shared/` : utilitaires génériques (dates, URL).
- **Ajouter une page** : créer `features/<nom>/pages/...`, déclarer la route enfant dans `app.routes.ts` et ajouter l'entrée dans `core/constants/navigation.constants.ts`.
- **État** : signals (`signal`, `computed`, `toSignal`) ; tous les composants sont en `ChangeDetectionStrategy.OnPush`. Les formulaires sont réactifs et typés (`NonNullableFormBuilder`).
- **Tests UI** : les tests Playwright (`e2e/`) mockent l'API avec `e2e/support/mock-api.ts` et utilisent un page object (`e2e/pages/`).
- **Responsive** : L'ensemble des éléments doivent être responsive pour être accessible via un smartphone

## Règles de lint propres au projet

Elles sont bloquantes (erreurs). Les règles maison se trouvent dans `backend/eslint-rules/`, `frontend/eslint-rules/` et `frontend/stylelint-rules/`.

- **Frontières entre couches**
  - Backend : un module n'importe pas les fichiers internes d'un autre module (seul son `*.module.ts` est autorisé) ; `common/` ne dépend d'aucun module ; un controller n'importe jamais un repository.
  - Frontend : une feature n'importe pas une autre feature ; `shared/` ne dépend ni de `core/` ni de `features/` ; `core/` ne dépend pas de `features/`.
- **Couleurs** : elles ne se déclarent que comme variables CSS dans `:root` (`frontend/src/styles.scss`). Partout ailleurs, on utilise `var(--…)`. Les couleurs en dur sont interdites, y compris dans les variables SCSS ou les variables CSS locales. Seuls `transparent`, `currentcolor` et `color-mix()` à partir de variables sont permis. Les attributs `style` inline sont interdits dans les templates.
- **Dates** : `toISOString().slice(...)` et `new Date('YYYY-MM-DD')` sont interdits, car ils décalent le jour selon le fuseau horaire. Il faut passer par `backend/src/common/utils/date.util.ts` ou `frontend/src/app/shared/utils/date.utils.ts`.
- **Gestion des erreurs** (frontend) : tout `subscribe()` gère les erreurs (`{ next, error }` ou `catchError`). Seules exceptions : `valueChanges` et `statusChanges`.
- **URL** (frontend) : pas d'URL en dur en dehors de `src/environments/`.
- **TypeScript strict** : `strict-boolean-expressions` (un nombre n'est jamais utilisé directement comme condition), `switch` exhaustifs, pas de `any` ni de `!` (autorisés dans les tests), `import type` pour les imports utilisés seulement comme types.

## Git

- `master` est la branche principale et `dev` la branche d'intégration. Le travail se fait sur une branche `feature/<sujet>` créée depuis `dev`.
- Les messages de commit sont en anglais. **Ne pas ajouter de ligne `Co-Authored-By` ni de mention de Claude** dans les commits ou les PR.
