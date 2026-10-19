# Nursery — Frontend (Angular)

Interface web de l'application Nursery, en Angular 21 (composants standalone, signals).

## Prérequis

- Node.js 24+ (Angular 21 ; Angular 22 demande Node ≥ 24.15)
- npm 11+ (via corepack : `corepack install -g npm@11`)

## Commandes de base

```bash
npm install                   # installer les dépendances
npm start                     # serveur de dev sur http://localhost:4200
npm run build                 # build de production dans dist/frontend/browser
npm run watch                 # build de dev en continu
npm test                      # tests unitaires et d'intégration des composants (Vitest)
npm run test:ui               # tests UI dans un vrai navigateur (Playwright)
npm run lint                  # ESLint (TS + templates) puis Stylelint (SCSS)
npm run lint:fix              # corrige automatiquement ce qui peut l'être
npx ng generate component ... # générer un élément Angular
```

### Tests UI (Playwright)

Les tests de `e2e/` pilotent Chromium sur l'application et vérifient ce que voit l'utilisateur : navigation, barre latérale rétractable, liste des rapports et ses indicateurs, ouverture du formulaire à côté de la liste, saisie, enregistrement, bouton Absent, validation des selles, confirmation avant de perdre des modifications, choix du jour, affichage sur petit écran.

L'API est **simulée** (`e2e/support/mock-api.ts`) : pas besoin du backend, et les données sont identiques à chaque exécution. Le serveur de dev Angular est démarré automatiquement, ou réutilisé s'il tourne déjà.

```bash
npx playwright install chromium   # une seule fois : télécharger le navigateur
npm run test:ui                   # lancer les tests
npm run test:ui:watch             # interface graphique de Playwright (pas à pas, traces)
npm run test:ui:report            # ouvrir le dernier rapport HTML
```

```
e2e/
├── support/mock-api.ts       # fausse API (interception réseau)
├── pages/                    # page objects : sélecteurs regroupés par page
└── *.spec.ts                 # scénarios
```

L'application appelle l'API à l'URL définie dans `src/environments/environment*.ts` (`http://localhost:3000/api` par défaut). Lancer le backend pour que la page des rapports affiche ses données.

### Avec Docker (seul)

```bash
docker build -t nursery-frontend .
docker run -p 4200:80 nursery-frontend
```

L'image construit l'application puis la sert via Nginx.

## Architecture

```
src/app/
├── app.ts / app.config.ts / app.routes.ts   # racine, providers, routes
├── core/                     # éléments uniques, chargés une fois
│   ├── constants/            # constantes (entrées de navigation…)
│   ├── layout/               # coquille de l'app
│   │   ├── main-layout/      # layout : sidebar + zone de contenu
│   │   └── sidebar/          # navbar latérale gauche
│   ├── models/               # interfaces transverses
│   └── services/             # services transverses (ApiService)
├── features/                 # un dossier par fonctionnalité, chargé en lazy-loading
│   ├── home/
│   │   ├── models/           # modèles de la fonctionnalité
│   │   ├── pages/            # composants routés
│   │   └── services/         # accès aux données de la fonctionnalité
│   └── daily-reports/        # rapports journaliers par enfant (/rapports)
│       ├── components/       # liste, formulaire, badge de statut
│       ├── constants/        # libellés des statuts
│       ├── models/
│       ├── pages/            # page : liste + formulaire
│       ├── services/
│       ├── testing/          # données de test partagées entre les specs
│       └── utils/            # conversion formulaire <-> payload API
└── shared/                   # éléments réutilisables
    ├── components/           # composants génériques
    └── utils/                # fonctions utilitaires
```

## Pages

- **Accueil** (`/accueil`) : page d'accueil, avec un accès aux rapports du jour.
- **Rapports du jour** (`/rapports`) : la liste des enfants du jour (jours de semaine uniquement), avec un indicateur par ligne (à remplir, à compléter, complet, absent) et l'heure de dernière modification. Au clic, la liste se décale à gauche et le formulaire s'ouvre. Il contient la présence (avec un bouton Absent), les repas (en g), les biberons (heure + ml), la sieste, les selles (commentaire obligatoire si « Autre ») et la transmission aux parents. Chaque formulaire s'enregistre avec son bouton.

Pour ajouter une page : créer `features/<nom>/pages/...`, déclarer la route enfant dans `app.routes.ts` et ajouter l'entrée dans `core/constants/navigation.constants.ts`.

## Lint

- **ESLint** (`eslint.config.mjs`) : typescript-eslint en mode typé et angular-eslint, pour le TypeScript comme pour les templates HTML.
  - Angular : composants `OnPush`, signals, standalone, control flow (`@if`, `@for`), accessibilité des templates, pas de `style` inline dans les templates.
  - Typage et promesses : comme le backend (pas de `any`, `switch` exhaustifs, conditions booléennes strictes...).
  - Pas d'URL en dur hors de `src/environments/`, pas de piège de date hors de `shared/utils/date.utils.ts`.
  - Règles du projet (`eslint-rules/`) :
    - `nursery/layer-boundaries` : une feature n'importe pas une autre feature, `shared/` ne dépend ni de `core/` ni de `features/`, `core/` ne dépend pas de `features/`.
    - `nursery/subscribe-handles-errors` : tout `subscribe()` gère les erreurs (`{ next, error }` ou `catchError`), sauf sur `valueChanges` / `statusChanges`.
- **Stylelint** (`stylelint.config.mjs`) : `stylelint-config-standard-scss` et la règle `nursery/colors-in-root-only` (`stylelint-rules/`). **Les couleurs ne se déclarent que comme variables dans `:root`** (`src/styles.scss`). Partout ailleurs, y compris dans les variables SCSS ou les variables CSS locales, on utilise `var(--…)`. Seuls `transparent`, `currentcolor` et `color-mix()` à partir de variables restent autorisés.
