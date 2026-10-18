# Nursery

Application destinée à faciliter la communication entre les crèches et les parents : informations sur la crèche, et à terme actualités, messagerie, suivi des enfants, etc.

## Structure du dépôt

| Dossier                  | Technologie | Rôle                     |
| ------------------------ | ----------- | ------------------------ |
| [`frontend/`](frontend/) | Angular 21  | Interface web            |
| [`backend/`](backend/)   | NestJS 12   | API REST                 |

L'application est pour l'instant un **monolithe** : un seul backend, organisé en modules métier et en couches (controllers, services, repositories, modèles, DTO, mappers). Chaque projet a son propre README avec ses commandes.

## Démarrage rapide

### En local

```bash
cd backend && npm install && npm run start:dev    # http://localhost:3000/api
cd frontend && npm install && npm start           # http://localhost:4200
```

### Avec Docker Compose

Les deux services sont indépendants et peuvent être lancés séparément :

```bash
docker compose up --build            # les deux
docker compose up --build backend    # backend seul  -> http://localhost:3000/api
docker compose up --build frontend   # frontend seul -> http://localhost:4200
```

## Sécurité : à venir

Aucune authentification ni autorisation n'est en place pour l'instant. La cible est une sécurité basée sur **JWT**, pensée dès le départ pour un futur passage en **micro-services** :

- **Service d'authentification dédié** : à terme, un service (ou un fournisseur d'identité type Keycloak) émet les tokens. Dans le monolithe, il commencera comme un module `auth` isolé, facile à extraire.
- **Tokens signés en asymétrique (RS256/ES256)** : seul le service d'auth détient la clé privée ; chaque service vérifie les tokens avec la clé publique (exposée via JWKS), sans appeler le service d'auth à chaque requête.
- **Access token court + refresh token** : access token de courte durée (~15 min) ; refresh token stocké en cookie `HttpOnly`, `Secure`, `SameSite`, avec rotation et révocation.
- **Claims pour l'autorisation** : rôles (`parent`, `staff`, `admin`) et rattachement (identifiant de la crèche, enfants liés) dans le token, vérifiés par des guards NestJS (RBAC), puis contrôles fins par ressource (un parent ne voit que ses enfants).
- **API Gateway** : en micro-services, une gateway valide le token en entrée et le propage aux services ; les appels service-à-service utilisent leurs propres identités (client credentials ou mTLS).
- **Côté frontend** : un `HttpInterceptor` Angular ajoute l'en-tête `Authorization: Bearer`, et des guards de route protègent les pages selon le rôle.

Mesures complémentaires prévues : HTTPS partout, CORS restreint, rate limiting, validation stricte des entrées (déjà active via `ValidationPipe`), et respect du RGPD pour les données des enfants et des familles.
