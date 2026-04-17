# Plan de Migracion: Riskitera Sales → st4rtup

## Hallazgo critico

Tras analizar ambos repos, la situacion real es:

| | riskitera-sales | st4rtup |
|---|---|---|
| Commits | 380 | 229 |
| Base de datos | `dszhaxyzrnsgjlabtvqx.supabase.co` | **LA MISMA DB** |
| Fly.io app | `riskitera-sales-backend` | **LA MISMA app** |
| Supabase project | `dszhaxyzrnsgjlabtvqx` | **EL MISMO** |
| Modelos exclusivos | **0** | +7 (organization, subscription, affiliate, pipeline_rule, rss_feed, service_catalog, usage_event) |
| Endpoints exclusivos | **0** | +10 (admin, auth, billing, linkedin, organizations, pipeline_rules, security, service_catalog, affiliates, analytics_internal) |
| Servicios exclusivos | **0** | +6 (chat_context, drip_emails, linkedin_api/content, pdf_reports, ws_manager) |
| RLS | No | Si (88 tablas) |
| Multi-tenancy | No | Scaffold ready |

**Conclusion: st4rtup es un SUPERSET de riskitera-sales. Comparten la misma DB y el mismo deploy. riskitera-sales no tiene NADA exclusivo. No hay migracion de datos — solo consolidacion de repos.**

---

## Plan (5 dias)

### FASE 1: Verificacion y preparacion (dia 1)

- [x] Confirmar misma DB y Supabase (VERIFICADO)
- [x] Confirmar st4rtup superset de riskitera-sales (VERIFICADO)
- [ ] Verificar que Cloudflare Pages apunta a st4rtup (no riskitera-sales)
- [ ] Verificar URLs de n8n workflows (si apuntan a riskitera-sales-backend.fly.dev → no cambiar, es la misma app)
- [ ] Backup DB: `pg_dump` del Supabase actual

### FASE 2: Activar multi-tenancy (dias 2-3)

- [ ] Crear Organization "Riskitera" en DB
- [ ] UPDATE org_id en todas las tablas existentes (datos actuales = Riskitera)
- [ ] Activar TenantMiddleware en main.py
- [ ] Anadir filtro org_id en los 15 endpoints core
- [ ] Test aislamiento: crear org "test" → verificar separacion

### FASE 3: Signup para nuevos clientes (dia 4)

- [ ] Implementar POST /api/v1/organizations/
- [ ] Implementar onboard_new_org() con seed de automatizaciones
- [ ] Branding por org (logo, colores en settings JSONB)

### FASE 4: Archivar riskitera-sales (dia 5)

- [ ] Archivar repo en GitHub (solo lectura)
- [ ] Actualizar CLAUDE.md y README de st4rtup
- [ ] Documentar proceso para futuros clientes

---

## Ahorro principal

No es economico (ya compartian infra) sino de **claridad**: 1 repo, 1 deploy, 1 lugar donde buscar codigo. Ahorro ~2h/semana en mantenimiento dual.
