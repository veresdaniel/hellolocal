# HelloLocal – Frontend Brief v1

## Purpose
SEO-first public frontend for discovering local tourism places.

## Stack
- React + Vite
- TypeScript
- React Router
- TanStack React Query

## Responsibilities
- Routing (lang-aware)
- Data fetching
- Rendering HTML content
- SEO rendering via useSeo hook

## Routes
- /:lang
- /:lang/explore
- /:lang/place/:slug
- /:lang/legal/:page

## API usage
- Base: /api
- React Query keys:
  - ['places', lang, filters]
  - ['place', lang, slug]

## Notes
- Tenant is implicit
- Language always explicit
