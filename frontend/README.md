# Nursery — Frontend (Angular)

Interface web de l'application Nursery, en Angular 21 (composants standalone, signals).

## Prérequis

- Node.js 24+ (Angular 21 ; Angular 22 demande Node ≥ 24.15)
- npm 10+

> Le projet contient un `.npmrc` avec `legacy-peer-deps=true` pour contourner un bug de résolution des peer-dependencies de npm 10.

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
│   └── home/
│       ├── models/           # modèles de la fonctionnalité
│       ├── pages/            # composants routés
│       └── services/         # accès aux données de la fonctionnalité
└── shared/                   # éléments réutilisables
    ├── components/           # composants génériques
    └── utils/                # fonctions utilitaires
```

Pour ajouter une page : créer `features/<nom>/pages/...`, déclarer la route enfant dans `app.routes.ts` et ajouter l'entrée dans `core/constants/navigation.constants.ts`.
