# Nursery — Backend (NestJS)

API REST de l'application Nursery. Monolithe NestJS organisé en modules et en couches.

## Prérequis

- Node.js 24+
- npm 10+

> Le projet contient un `.npmrc` avec `legacy-peer-deps=true` pour contourner un bug de résolution des peer-dependencies de npm 10.

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

## Endpoints disponibles

| Méthode | Route          | Description                   |
| ------- | -------------- | ----------------------------- |
| GET     | `/api/health`  | État de santé de l'API        |
| GET     | `/api/nursery` | Informations sur la crèche    |

## Architecture

```
src/
├── main.ts                     # bootstrap (préfixe, CORS, pipes, filtres)
├── app.module.ts               # module racine
├── config/                     # configuration typée (@nestjs/config)
├── common/                     # éléments transverses
│   ├── constants/              # tokens d'injection, constantes
│   ├── filters/                # filtres d'exception globaux
│   └── utils/                  # fonctions utilitaires
└── modules/                    # un dossier par domaine métier
    └── nursery/
        ├── controllers/        # couche présentation (HTTP)
        ├── dtos/               # objets d'entrée/sortie de l'API
        ├── services/           # couche application (logique métier)
        ├── models/             # modèles du domaine
        ├── mappers/            # conversion modèle <-> DTO
        └── repositories/       # couche d'accès aux données (interface + implémentation)
```

Flux d'une requête : `Controller → Service → Repository (interface) → implémentation`.
Le service dépend d'une interface injectée par token (`NURSERY_REPOSITORY`) : l'implémentation en mémoire actuelle pourra être remplacée par une base de données sans modifier la logique métier.

Pour ajouter un domaine : créer `src/modules/<domaine>/` avec la même structure et l'importer dans `app.module.ts`.
