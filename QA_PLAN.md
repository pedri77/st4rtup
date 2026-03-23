# QA Plan — Riskitera Sales

## Estado Actual de Tests

### Backend (pytest + pytest-asyncio)

| Archivo | Módulo | Estado |
|---------|--------|--------|
| test_dashboard.py | Dashboard stats | ✅ Existente |
| test_leads.py | Leads CRUD | ✅ Existente |
| test_visits.py | Visits CRUD | ✅ Existente |
| test_emails.py | Emails CRUD + envío | ✅ Existente |
| test_opportunities.py | Pipeline CRUD | ✅ Existente |
| test_surveys.py | Surveys CRUD + públicas | ✅ Existente |
| test_contacts.py | Contacts CRUD + stats | ✅ Existente |
| test_actions.py | Actions CRUD + filtros | ✅ Nuevo |
| test_offers.py | Offers CRUD + status | ✅ Nuevo |
| test_users.py | Users CRUD + perfil | ✅ Nuevo |
| test_automations.py | Automations CRUD + seed | ❌ Pendiente |
| test_account_plans.py | Account plans CRUD | ❌ Pendiente |
| test_monthly_reviews.py | Monthly reviews CRUD | ❌ Pendiente |
| test_reports.py | Reports + analytics | ❌ Pendiente |
| test_notifications.py | Notifications CRUD | ❌ Pendiente |
| test_chat.py | AI Chat | ❌ Pendiente |
| test_settings.py | Settings CRUD | ❌ Pendiente |

### Frontend (Vitest + React Testing Library)

| Área | Estado |
|------|--------|
| Configuración Vitest | ⚠️ Setup existe, sin tests |
| Componentes comunes | ❌ Pendiente |
| Páginas | ❌ Pendiente |
| Hooks | ❌ Pendiente |
| Stores (Zustand) | ❌ Pendiente |

## Plan de Implementación (Prioridad)

### Fase 1 — Tests Backend Críticos (Completada parcialmente)
1. ✅ Actions (CRUD + filtros por status/lead)
2. ✅ Offers (CRUD + transiciones de estado + referencia secuencial)
3. ✅ Users (CRUD + auto-creación perfil + duplicados)

### Fase 2 — Tests Backend Restantes
4. Automations (CRUD + seed + toggle + executions)
5. Account Plans (CRUD)
6. Monthly Reviews (CRUD)
7. Settings (CRUD + email config, admin only)
8. Reports (generación de informes)

### Fase 3 — Tests de Servicios
9. Email Service (multi-provider, mock SMTP)
10. Notification Service (in-app + Telegram mock)
11. Integration Service (Apollo, webhooks)

### Fase 4 — Tests Frontend
12. Configurar Vitest con mocks de API
13. Tests de componentes comunes (Layout, Sidebar, etc.)
14. Tests de hooks (useUserRole, useLeads, etc.)
15. Tests de páginas críticas (Login, Dashboard, Leads)

### Fase 5 — Tests E2E
16. Configurar Playwright o Cypress
17. Flujo completo: Login → Crear Lead → Crear Visita → Crear Oportunidad → Crear Oferta
18. Flujo de encuestas públicas
19. Flujo de gestión de usuarios (admin)

## Cobertura Objetivo

| Capa | Actual | Objetivo |
|------|--------|----------|
| Backend endpoints | ~50% | 80%+ |
| Backend services | ~0% | 60%+ |
| Frontend components | 0% | 40%+ |
| E2E flows | 0% | Flujos críticos |

## Convenciones de Testing

- Async tests con `pytest-asyncio` (asyncio_mode=auto)
- Fixtures compartidas en `conftest.py`
- SQLite in-memory para tests de backend (adaptadores UUID)
- Mock de auth via dependency overrides
- Patrón: crear datos → ejecutar acción → verificar resultado
- Nombres descriptivos en español para docstrings
