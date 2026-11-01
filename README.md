# HelloLocal 🗺️

> Modern, többnyelvű helyi turisztikai platformvezető rendszer eseménykezeléssel és térkép integrációval.

[![Version](https://img.shields.io/badge/version-0.1.0--beta-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

## 🌟 Főbb Funkciók

### Tartalom Kezelés
- **Többnyelvű támogatás** (Magyar, Angol, Német)
- **Helyek (Places) kezelése** - Kategóriák, címkék, ár sávok
- **Események (Events)** - Időzített események, pinned funkció
- **Rich Text Editor** - TipTap alapú WYSIWYG szerkesztő
- **SEO optimalizáció** - Dinamikus meta tagek, slugok

### Felhasználói Felület
- **Interaktív térkép** - MapLibre GL alapú
- **Drag-and-drop szűrők** - Pozíció megőrzéssel
- **Események lista** - Real-time frissítések
- **Reszponzív design** - Mobil-optimalizált
- **Modern UI** - Inter font, gradiensek, árnyékok

### Admin Funkciók
- **Role-based hozzáférés** (superadmin, admin, editor, viewer)
- **2FA autentikáció** - TOTP alapú
- **Többbérlős (Multi-site)** rendszer - [Site Architecture dokumentáció](./docs/site-architecture.md)
- **Automatikus slug generálás**
- **Push értesítések** - Web Push API

### Technikai Jellemzők
- **SSR-ready** - SEO meta tagek server-side
- **PWA támogatás** - Service Worker
- **Real-time** - React Query cache invalidation
- **I18n** - react-i18next
- **Type-safe** - 100% TypeScript

## 🏗️ Technológiai Stack

### Frontend
- **React 19** - UI framework
- **Vite 7** - Build tool
- **TypeScript 5.9** - Type safety
- **React Router 7** - Routing
- **TanStack Query 5** - Server state management
- **MapLibre GL** - Maps
- **TipTap** - Rich text editor
- **i18next** - Internationalization

### Backend
- **NestJS 11** - Backend framework
- **Prisma 7** - ORM
- **PostgreSQL** - Database
- **Passport JWT** - Authentication
- **Web Push** - Notifications
- **Node.js 18+** - Runtime

## 📋 Előfeltételek

- **Node.js** 18.x vagy újabb
- **pnpm** 10.x (javasolt package manager)
- **PostgreSQL** 14.x vagy újabb
- **Git**

## 🚀 Telepítés

### 1. Repository klónozása

```bash
git clone <repository-url>
cd hellolocal
```

### 2. Függőségek telepítése

```bash
pnpm install
```

### 3. Környezeti változók beállítása

Hozd létre a `.env` fájlokat:

**Backend** (`apps/api/.env`):
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hellolocal"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3002
FRONTEND_URL="http://localhost:5173"

# Web Push (opcionális)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:your-email@example.com"
```

**Frontend** (`apps/web/.env`):
```env
VITE_API_URL=http://localhost:3002
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### 4. Adatbázis migrálás és seed

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed
```

### 5. Fejlesztői szerverek indítása

Három helyi mód (párhuzamosan is futhatnak, külön portokon):

```bash
# Helyi docker/dev DB (apps/api/.env) — web 5173, API 3002
pnpm local:dev

# Staging / beta DB (apps/api/.env.staging) — web 5174, API 3003
pnpm local:staging

# Éles adatok böngészése — web 5175, /api → https://api.hello-local.io (Vite proxy)
# Nincs helyi API production DATABASE_URL-lel. NE seed/migrate/truncate live ellen.
pnpm local:live
```

Külön terminálokban továbbra is:

```bash
pnpm run dev:api   # 3002
pnpm run dev:web   # 5173
```

Ha `http://localhost:5173/hu/etyek-budai` üres: a **local** DB-ben nincs site/hely.
Csak a helyi (127.0.0.1) DB-n: `pnpm -C apps/api db:seed` (TRUNCATE + minta).
`db:fill-etyek` csak meglévő etyek helyeket frissít; üres DB-n nem elég.
Staging/live/production URL ellen soha ne futtass seedet.

## 📦 Production Build

### Backend

```bash
cd apps/api
pnpm run build
pnpm start
```

### Frontend

```bash
cd apps/web
pnpm run build
pnpm preview  # Production preview
```

## 🐳 Docker Deployment

### Docker Compose (legegyszerűbb)

```bash
docker-compose up -d
```

Ez elindítja:
- PostgreSQL adatbázist
- Backend API-t (port 3002)
- Frontend-et (port 5173)

### Egyedi Docker build

```bash
# Backend
docker build -f apps/api/Dockerfile -t hellolocal-api .
docker run -p 3002:3002 --env-file apps/api/.env hellolocal-api

# Frontend
docker build -f apps/web/Dockerfile -t hellolocal-web .
docker run -p 5173:5173 hellolocal-web
```

## ☁️ Cloud Deployment Opciók

### 🎯 Ajánlott: Render.com (Ingyenes kezdéshez)

**Előnyök:**
- Ingyenes PostgreSQL adatbázis (90 nap után inaktív)
- Automatikus HTTPS
- GitHub integration
- Egyszerű setup

**Lépések:**
1. Fork-old a repository-t
2. Hozz létre egy új **Web Service**-t Render-en a backend-hez
3. Hozz létre egy **Static Site**-ot a frontend-hez
4. Hozz létre egy **PostgreSQL** adatbázist
5. Állítsd be a környezeti változókat

[Részletes útmutató](docs/deployment-render.md)

### Alternatívák

| Platform | Ár | Előnyök | Hátrányok |
|----------|-----|---------|----------|
| **Railway.app** | $5/hó után ingyenes | Egyszerű, gyors | Ingyenes limit kicsi |
| **Fly.io** | $0-5/hó | Global edge, Docker | Bonyolultabb config |
| **Vercel (Frontend)** | Ingyenes | Nagyon gyors, CDN | Csak frontend |
| **Heroku** | $7/hó | Megbízható | Nincs ingyenes tier |
| **VPS (Hetzner, DigitalOcean)** | €4-5/hó | Teljes kontroll | Több setup munka |

## 🔐 Alapértelmezett Admin Felhasználók

A seed script létrehozza a következő felhasználókat:

- **Superadmin**: `superadmin@hellolocal.com` / `password123`
- **Admin**: `admin@hellolocal.com` / `password123`
- **Editor**: `editor@hellolocal.com` / `password123`

⚠️ **FONTOS**: Változtasd meg ezeket a jelszavakat production környezetben!

## 📚 Dokumentáció

- [Fejlesztői útmutató](docs/readme_dev.md)
- [API dokumentáció](docs/hellolocal-backend-api-first-brief.md)
- [Frontend architektúra](docs/hellolocal-frontend-brief.md)
- [Roadmap](docs/hellolocal-roadmap.md)
- [Changelog](CHANGELOG.md)

## 🧪 Tesztelés

```bash
# Unit tesztek (TODO)
pnpm test

# E2E tesztek (TODO)
pnpm test:e2e
```

## 🛠️ Karbantartás

### Slug generálás meglévő helyekhez

```bash
curl -X POST http://localhost:3002/api/admin/maintenance/generate-missing-slugs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Adatbázis backup

```bash
pg_dump -h localhost -U user -d hellolocal > backup.sql
```

### Log monitoring

Production környezetben használd a Render.com vagy más szolgáltatás beépített log nézőjét.

## 🤝 Közreműködés

1. Fork-old a projektet
2. Hozz létre egy feature branch-et (`git checkout -b feature/amazing-feature`)
3. Commit-old a változásokat (`git commit -m 'feat: Add amazing feature'`)
4. Push-old a branch-et (`git push origin feature/amazing-feature`)
5. Nyiss egy Pull Request-et

## 📄 Licenc

Proprietary License - All Rights Reserved. Lásd [LICENSE](LICENSE) fájlt

## 🐛 Ismert Problémák

Lásd a [GitHub Issues](https://github.com/yourusername/hellolocal/issues) oldalt.

## 💬 Támogatás

- Email: support@hellolocal.com
- Dokumentáció: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/yourusername/hellolocal/issues)

## 🎉 Köszönetnyilvánítás

- [MapLibre GL](https://maplibre.org/)
- [NestJS](https://nestjs.com/)
- [React](https://react.dev/)
- [Prisma](https://www.prisma.io/)

---

**HelloLocal** - Készítve ❤️ -vel

