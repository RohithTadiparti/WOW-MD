# WOW - World of Weddingz PRD

## Original Problem Statement
UI/UX redesign only of the World of Weddingz (WOW) matrimony platform. Transform the visual identity from maroon/ivory to Royal Navy & Gold with Soft Blush accents. No functionality changes — only the way the site looks.

## Architecture
- **Backend**: NestJS (TypeScript) + PostgreSQL + Redis — hosted on Railway
- **Frontend**: React 19 + Vite + Tailwind CSS v4 — SPA with React Router
- **Mobile**: React Native (Expo)
- **Infrastructure**: Docker, Kubernetes (K8s), Terraform (AWS)

## User Personas
1. **Individual** (bride, groom, family member) — build profile, browse matches, chat, book vendors/planners
2. **Marriage Agent** — manage client profiles, circulate biodata, propose matches
3. **Vendor** — publish service listings, respond to bookings, get paid via escrow
4. **Wedding Planner** — publish planning listings, manage engaged weddings
5. **Administrator** — approve agencies/vendors/planners, resolve disputes, analytics
6. **Verification Officer** — field verification visits

## Core Requirements (Static)
- Matrimonial matching with compatibility scoring
- Real-time chat via Redis
- Vendor/planner marketplace with escrow payments
- Wedding timeline planning
- Guest management with RSVP
- Multi-persona RBAC
- Agency circulation model (phone-first intake)

## What's Been Implemented — 2026-10-09
### UI-002: Royal Navy & Gold Premium Redesign
- **Color System**: Complete CSS variable overhaul — royal navy (#0A1128-#1B2A4A) brand, struck gold (#C5A059) accents, soft blush (#FFF5F7) backgrounds, warm ivory (#FAF7F2) canvas
- **Typography**: Plus Jakarta Sans Variable as primary body font, Cormorant Garamond retained for display
- **Component Classes**: Navy buttons with gold borders, gold-tinted input focus rings, gold hairline card borders, glassmorphic headers
- **Page Redesigns**: Home (navy hero + gold patterns), Login (navy panel), Register (navy aside), Dashboard (navy masthead)
- **Visual Polish**: Subtle border-radius (2-6px), refined shadows, gold dot pattern textures, gold active navigation states
- **Testing**: TypeScript ✅, Vite build ✅, CSS tokens ✅, data-testid ✅, routing unchanged ✅

### PR Created
- **PR #79**: https://github.com/RohithTadiparti/WOW-MD/pull/79
- Branch: `ui/royal-navy-gold-redesign`
- 11 files changed, zero functionality changes

## Prioritized Backlog
### P0 (Critical)
- None — current task is design-only

### P1 (Important)
- Dark mode activation (tokens already defined in CSS)
- Mobile-responsive polish for all new design tokens
- Admin portal visual alignment with new color scheme

### P2 (Nice-to-have)
- Animated page transitions with new gold accent
- Loading skeleton shimmer in gold tint
- Custom scrollbar styling with navy/gold theme

## Next Tasks
1. Review PR #79 on a preview deployment
2. Merge after visual approval
3. Test dark mode by enabling `DARK_MODE_ENABLED = true` in theme.ts
4. Polish remaining inner pages (Vendors, Chat, Bookings) for gold accent consistency
