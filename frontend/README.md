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
npm test                      # tests unitaires (Vitest)
npx ng generate component ... # générer un élément Angular
```

L'application appelle l'API à l'URL définie dans `src/environments/environment*.ts` (`http://localhost:3000/api` par défaut). Lancer le backend pour que la page d'accueil affiche les données de la crèche.

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

- **Accueil** (`/accueil`) : informations sur la crèche.
- **Rapports du jour** (`/rapports`) : la liste des enfants du jour (jours de semaine uniquement), avec un indicateur par ligne (à remplir, à compléter, complet, absent) et l'heure de dernière modification. Au clic, la liste se décale à gauche et le formulaire s'ouvre. Il contient la présence (avec un bouton Absent), les repas (en g), les biberons (heure + ml), la sieste, les selles (commentaire obligatoire si « Autre ») et la transmission aux parents. Chaque formulaire s'enregistre avec son bouton.

Pour ajouter une page : créer `features/<nom>/pages/...`, déclarer la route enfant dans `app.routes.ts` et ajouter l'entrée dans `core/constants/navigation.constants.ts`.
