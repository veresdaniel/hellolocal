# HelloLocal – Frontend + Backend Roadmap (v1)

This roadmap is designed for **parallel learning and development** of frontend (React) and backend (NestJS),
with realistic weekly goals for someone transitioning into backend development.

---

## Phase 0 – Foundations (Week 0)
**Goal:** Stable dev environment and shared understanding

### Deliverables
- Project briefs finalized (FE + BE)
- Mockoon API working for all public endpoints
- Vite proxy configured (/api)
- Git repository initialized
- docs/ folder created

---

## Phase 1 – Frontend Core + Backend Basics (Week 1)

### Frontend
- Finalize routing structure
  - /:lang
  - /:lang/explore
  - /:lang/place/:slug
  - /:lang/legal/:page
- Explore page
  - Category filter via URL (?category=)
  - Search input (?q=)
- PlaceCard UI polish

### Backend (learning-first)
- NestJS project scaffold
- Understand:
  - modules
  - controllers
  - services
  - dependency injection
- Create first controller:
  - GET /health

---

## Phase 2 – Backend API v1 + Frontend Integration (Week 2)

### Backend
- Configure environment handling
  - DEFAULT_TENANT_SLUG
- Tenant resolution service
- Implement endpoints:
  - GET /api/:lang/places
  - GET /api/:lang/places/:slug
- In-memory data or JSON seed (no DB yet)

### Frontend
- Switch API base from Mockoon to NestJS
- Verify Explore + Detail works with real backend
- Error state handling

---

## Phase 3 – Database & Prisma (Week 3)

### Backend
- PostgreSQL setup (local)
- Prisma schema:
  - Tenant
  - Town
  - Place
  - LegalPage
- Seed script
- Replace in-memory data with DB queries

### Frontend
- No major changes
- Adjust typings if needed
- Loading & empty states refinement

---

## Phase 4 – SEO & Content Hardening (Week 4)

### Backend
- SEO object normalization
- Legal pages endpoint
- HTML content sanitization strategy

### Frontend
- useSeo hook finalization
- Canonical URLs
- OpenGraph verification

---

## Phase 5 – Quality & Polish (Week 5)

### Backend
- Error handling standardization
- DTO validation
- Basic logging

### Frontend
- Header & Footer
- Language switcher
- Static page links

---

## Phase 6 – Future-ready Enhancements (Week 6+)

### Backend
- Auth strategy planning
- Admin API design
- Tenant in URL (v2)

### Frontend
- Map integration
- Favorites
- Review UI (read-only)

---

## Definition of Done (v1)
- Explore + Detail fully functional
- Backend replaces Mockoon 1:1
- Default tenant configurable
- SEO metadata driven by API
- Clean, readable codebase

---

## Guiding Principle
> Build something that would not embarrass you in a Finnish technical interview.

