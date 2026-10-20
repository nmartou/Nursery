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
npm run test:e2e                   # tests HTTP (test/*.e2e-spec.ts) et des repositories (src/**/*.db-spec.ts) sur la base <DB_NAME>_test
npm run db:generate                # génère une migration depuis le schéma Drizzle
npm run db:migrate                 # applique les migrations en attente (lit .env)
npm run db:seed                    # migrations en attente puis données d'exemple, seulement si la base est vide
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
E2E_PORT=4201 npm run test:ui      # quand le port 4200 est déjà pris (ex. stack Docker)
```

Playwright nécessite `npx playwright install chromium` la première fois. Il **réutilise tout serveur qui répond déjà sur son port** : si la stack Docker tourne, ce serait l'ancien frontend du conteneur. Dans ce cas, passer par `E2E_PORT`.

Les deux serveurs de dev sont déclarés dans `.claude/launch.json` (`backend`, `frontend`). `docker compose up --build [backend|frontend]` lance les conteneurs. La stack Docker est autonome : service `db` (PostgreSQL 18, volume `pgdata`, port 5433 sur la machine), service ponctuel `migrate` (`node database/db.js migrate`) dont dépend `backend`, et identifiants dans un `.env` optionnel à la racine (`.env.example`). Elle est indépendante de `backend/.env`, qui sert au développement local sur le PostgreSQL de la machine. L'image backend est en `TZ=Europe/Paris` : le « jour courant » des rapports dépend du fuseau horaire.

## Architecture backend

- **Modules métier** dans `src/modules/<domaine>/` (`children` pour les inscriptions, `daily-reports`, `calendar` pour les fermetures et les absences). Chaque module est découpé en couches : `controllers → services → repositories`, avec `dtos/`, `mappers/` (DTO ↔ modèle), `models/` (modèles du domaine, indépendants de la base) et `testing/` (constantes partagées entre les specs).
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
- **Stratégie de test** :
  - services : tests unitaires (`*.spec.ts`) avec un repository mocké (`vi.fn()`) ;
  - repositories : tests sur la base de test (`*.repository.db-spec.ts`, à côté du repository), sans l'application Nest, via `connectTestDatabase()`, `resetDatabase()` et `insertChild()` (`test/support/test-db.ts`). On ne mocke pas Drizzle : un mock vérifierait l'écriture de la requête, pas son résultat ;
  - controllers : pas de test unitaire, ils ne font que déléguer au service. Le routage, les pipes, la validation des DTO et les codes HTTP sont couverts par les tests e2e (`test/*.e2e-spec.ts`).
- Contraintes métier imposées par le schéma :
  - un seul rapport par enfant et par jour (`UNIQUE (child_id, report_date)`) ;
  - jours de semaine uniquement (`CHECK ISODOW < 6`) ;
  - commentaire obligatoire si les selles ne sont pas « normales ».
- **Inscriptions** : un enfant est inscrit de `enrollment_start` à `enrollment_end` inclus (`null` = fin pas encore connue). La condition SQL `isEnrolledOn(date)` (`common/database/enrollment.ts`) décide qui a un rapport un jour donné. Le statut d'inscription (`upcoming`, `enrolled`, `ended`) est calculé par rapport à aujourd'hui (`modules/children/utils/enrollment-status.util.ts`).
- **Calendrier** :
  - **Jours fermés** : jours fériés français calculés (`common/utils/public-holidays.util.ts`) et fermetures saisies (table `closure`). `closureOn(db, date)` (`common/database/closures.ts`) donne le motif d'un jour fermé. Un jour fermé n'a aucun rapport : la liste et les statistiques renvoient `closure` et des rapports vides, et `ensureReportsForDate` n'est pas appelé.
  - **Absences prévues** (table `child_absence`) : elles doivent rester dans la période d'inscription, sans chevauchement (409). Elles ne modifient pas les rapports : le repository joint `plannedAbsence` à la lecture, et `computeReportStatus(report, plannedAbsence)` renvoie `absent` pour un rapport vide.
  - **Absences notées dans les rapports** (`daily_report.absent`) : elles apparaissent aussi (type `reported_absence`, non modifiable depuis le calendrier), sauf les jours déjà couverts par une absence prévue du même enfant. Elles alimentent aussi l'historique des absences d'un enfant (`GET /children/:id` → `absences`, voir `modules/children/utils/absence-history.util.ts`) : absences prévues et jours d'absence des rapports (jours ouvrés consécutifs regroupés), du plus récent au plus ancien, avec `source` (`calendar` ou `report`).
  - **Entrées et sorties** : elles sont calculées à partir des dates d'inscription.
  - `GET /calendar?from&to` agrège tout cela en événements (`sourceId` est renseigné pour ce qui se modifie : fermetures et absences).
- **Parents** : un parent est identifié par son e-mail en minuscules, et sa fiche est partagée entre frères et sœurs (`INSERT ... ON CONFLICT (email) DO UPDATE`). Un parent qui n'est plus lié à aucun enfant est supprimé. Les autres personnes à appeler sont dans `child_contact`, propres à chaque enfant.
- **Création automatique des rapports** : `GET /daily-reports?date=` crée les rapports manquants du jour pour chaque enfant inscrit ce jour-là (`ensureReportsForDate` : lecture des enfants puis `INSERT ... ON CONFLICT DO NOTHING` ; l'`insert().select()` de Drizzle exige toutes les colonnes de la table, il n'est donc pas utilisé). `findByDate` ne liste que les rapports des enfants inscrits ce jour-là : si une inscription est raccourcie, les rapports au-delà restent en base mais disparaissent.
- **Migrations sur une table qui a déjà des données** : quand on ajoute une colonne obligatoire, il faut compléter à la main la migration générée (voir `0001_child_enrollment_and_contacts.sql`). drizzle-kit pose une question interactive (renommage ou remplacement ?) quand une colonne disparaît et qu'une autre apparaît dans la même table, et cette question échoue hors d'un terminal : on découpe alors le changement en deux migrations.
- **Validation des DTO** : `@Trim()` (`common/validation/`) nettoie les textes avant validation, et `@IsOnOrAfter('autreChamp')` compare deux dates d'un même DTO.
- **Statut d'un rapport** : il n'est pas stocké, il est recalculé (`modules/daily-reports/utils/report-status.util.ts`) et vaut `todo`, `in_progress`, `complete` ou `absent`.
- **Dates et heures** : les dates circulent en chaînes `YYYY-MM-DD` (`date({ mode: 'string' })`). Les heures sont en `HH:mm` dans l'API, mais PostgreSQL renvoie `HH:mm:ss` : les repositories passent par `toHourMinute()`.
- **Identifiants** : ce sont des UUID, validés par `ParseUUIDPipe` dans les routes (un id invalide renvoie 400, pas 500).

## Architecture frontend

- `src/app/core/` : mise en page (`MainLayout` + `Sidebar` rétractable), `ApiService` (enveloppe d'`HttpClient` qui préfixe les URL avec `environment.apiUrl`), constantes de navigation.
- `src/app/features/<feature>/` : pages chargées à la demande (`loadComponent` dans `app.routes.ts`, routes en français : `/accueil`, `/inscriptions`, `/rapports`), avec leurs composants, services, modèles et utilitaires.
- **Formulaires en modale** : utiliser le composant partagé `ModalDialog` (`shared/components/modal-dialog`), un `<dialog>` natif ouvert avec `showModal()`. Son fond (`::backdrop`, variables `--color-backdrop` et `--backdrop-blur`) assombrit et floute la page, qui devient inactive. Fonctionnement :
  - le parent garde l'état : `[open]` ouvre ou ferme la modale, `(closeRequested)` signale Échap ou un clic sur le fond (le parent demande confirmation si le formulaire est modifié), `(closed)` resynchronise l'état ;
  - le premier champ reçoit le focus via `afterRenderEffect` (l'attribut `autofocus` est interdit par le lint) ;
  - les styles communs des formulaires viennent de `shared/styles/_forms.scss` (`@use`) ;
  - jsdom n'implémente pas `showModal()` : les specs utilisent un remplacement minimal, et le comportement réel est testé avec Playwright ;
  - avec les formulaires réactifs, `[value]` d'un bouton radio est lu par la directive et n'atteint pas le DOM : dans les tests, on cible les boutons radio par leur libellé.
- **Calendrier** (`features/calendar`, route `/calendrier`) : grille du mois (`monthWeeks`) sur grand écran, agenda en liste sur petit écran (bascule en CSS à 760 px). Les dates sont des chaînes `YYYY-MM-DD` ; les helpers (`addDays`, `shiftMonth`, `todayIsoDate`…) sont dans `shared/utils/date.utils.ts`. Dans Playwright, `page.clock.setFixedTime()` fixe « aujourd'hui ».
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
