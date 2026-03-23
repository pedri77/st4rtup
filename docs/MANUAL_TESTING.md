# Pruebas Manuales — Riskitera Sales

## Pre-requisitos
- [ ] Acceso a https://sales.riskitera.com con usuario admin
- [ ] API keys configuradas (Mistral/OpenAI) — verificar en `/integrations`
- [ ] Seeds GTM cargados — botón "🚀 Cargar todos los datos GTM" en `/gtm`

---

## 1. DASHBOARD
- [ ] Dashboard carga sin errores
- [ ] Onboarding wizard aparece la primera vez
- [ ] Botón ⚙️ abre panel de personalización
- [ ] Ocultar/mostrar widgets funciona
- [ ] Reordenar widgets persiste al recargar
- [ ] Exportar PDF funciona

## 2. LEADS
- [ ] Crear lead manualmente
- [ ] Editar lead existente
- [ ] Scoring ICP auto-ejecuta al crear (si LLM configurado)
- [ ] Ficha del lead muestra sección "Scoring ICP — AGENT-LEAD-001" (si evaluado)
- [ ] Timeline de actividad aparece al final de la ficha
- [ ] Botón "Vista ABM" abre `/leads/{id}/abm`
- [ ] Import CSV: subir archivo con columnas company_name, contact_email → leads creados
- [ ] Deduplicación: POST /leads/deduplicate detecta duplicados
- [ ] Enriquecer con Apollo funciona (si API key configurada)

## 3. PIPELINE
- [ ] Crear oportunidad con lead vinculado
- [ ] Drag & drop entre etapas actualiza stage
- [ ] Select tier (Pilot PoC / Enterprise / SMB) en la card
- [ ] Input competidor en la card → auto-save
- [ ] Botón "Generar Propuesta" → modal con Markdown (requiere LLM)
- [ ] Botón PDF en modal de propuesta → descarga PDF con branding
- [ ] Botón "Generar Contrato" → descarga PDF de contrato
- [ ] Propuesta interactiva: `/proposal?lead_id=UUID` genera y muestra
- [ ] Compartir link de propuesta funciona

## 4. ACCIONES
- [ ] Vista lista normal en `/actions`
- [ ] Vista Kanban en `/actions/kanban`
- [ ] Drag & drop entre columnas (Pendiente → En curso → Completada)
- [ ] Acciones vencidas aparecen en columna "Vencida"

## 5. AGENTES IA
- [ ] `/agents` muestra 4 agentes registrados
- [ ] Lead Intelligence: seleccionar lead → ejecutar → muestra score ICP
- [ ] BANT Qualifier: pegar transcripción → ejecutar → muestra BANT score
- [ ] Proposal Generator: seleccionar lead → generar → muestra Markdown
- [ ] Customer Success: seleccionar lead → analizar → muestra health score
- [ ] Audit trail muestra ejecuciones recientes

## 6. GTM DASHBOARD
- [ ] `/gtm` muestra 20 KPIs con semáforos RAG
- [ ] 4 star KPIs siempre visibles (ARR, Win Rate, Velocity, MQL→SQL)
- [ ] Filtros por categoría funcionan (Pipeline, Revenue, Activity, etc.)
- [ ] Filtros por prioridad (Críticos, Alta)
- [ ] Click en "Target ✏️" → editar inline → Enter → guarda
- [ ] Sparklines visibles en cada card
- [ ] Budget GTM con barra de progreso
- [ ] Board Pack PDF se descarga correctamente
- [ ] Botón "🚀 Cargar todos los datos GTM" carga seeds

## 7. GTM — PRICING
- [ ] `/gtm/pricing` muestra tiers (después de seed)
- [ ] Calculadora: seleccionar tier + módulos + descuento → calcular
- [ ] Botón "Limpiar" resetea la calculadora
- [ ] "Nuevo Tier" → modal → crear tier custom
- [ ] Stats de impacto por tier (si hay deals con tier asignado)

## 8. GTM — COMPETIDORES
- [ ] `/gtm/competitors` muestra competidores (después de seed)
- [ ] Filtro por región (🇪🇸/🇪🇺/🌐) funciona
- [ ] Filtro por nivel amenaza (Crítica/Alta/Media) funciona
- [ ] Toggle Grid ↔ Tabla
- [ ] Click en competidor → drawer lateral con 3 tabs
- [ ] Tab "vs. Riskitera" muestra debilidad (rojo) + ventaja (verde)
- [ ] Descargar Battle Card PDF
- [ ] Export CSV
- [ ] Botón "Añadir" → modal → crear competidor
- [ ] Búsqueda por nombre/scope/tags

## 9. GTM — PLAYBOOK
- [ ] `/gtm/playbook` muestra 14 tácticas (después de seed)
- [ ] Filtros por categoría (Inbound/Outbound/Relacional/Transaccional)
- [ ] Toggle status (Activa/Planificada/Pausada) en cada card
- [ ] "Abrir →" lleva a la sub-página de detalle
- [ ] Sub-página: acciones rápidas con links correctos
- [ ] Sub-página: KPIs de la táctica
- [ ] Sub-página: editar responsable + budget
- [ ] Sub-página: notas auto-save
- [ ] Sub-página: checklist (añadir + toggle done)
- [ ] Export PDF del playbook completo

## 10. GTM — BRAND
- [ ] `/gtm/brand` carga configuración
- [ ] Editar misión, visión, valores → guardar
- [ ] Frameworks regulatorios: checkboxes funcionan
- [ ] Presupuesto GTM (anual + Q1-Q4) editable

## 11. GTM — MEDIA TRIFECTA
- [ ] `/gtm/media` muestra 3 columnas (Owned/Earned/Paid)
- [ ] "Nueva campaña" → modal con campos de planning
- [ ] "Registrar mención" → modal con tipo/plataforma/rating
- [ ] Tabla de campañas muestra targeting + modelo compra

## 12. GTM — OKRs
- [ ] `/gtm/okr` muestra objetivos (después de seed)
- [ ] Progress auto-calculado desde KPIs vinculados
- [ ] Editar valor actual de Key Results inline
- [ ] Crear nuevo objetivo → modal

## 13. GTM — FORECAST + PoC TRACKER
- [ ] `/gtm/forecast` muestra gráfico barras 12 meses
- [ ] Tabla mensual con ARR/MRR proyectado
- [ ] `/gtm/poc-tracker` muestra PoCs activos con countdown
- [ ] Barra de progreso 90 días con colores

## 14. GTM — INVESTOR VIEW
- [ ] `/gtm/investor` muestra hero metrics (ARR, NRR, LTV:CAC)
- [ ] Todas las cards con semáforo RAG
- [ ] Board Pack PDF se descarga

## 15. CUSTOMER HEALTH
- [ ] `/customer-health` muestra clientes (leads con status won)
- [ ] Cards con health score y links a ABM/ficha

## 16. COST CONTROL
- [ ] `/cost-control` muestra herramientas monitorizadas
- [ ] 3 niveles de guardrail (OK/Aviso/Corte) visibles

## 17. INTEGRACIONES
- [ ] `/integrations` muestra banner de env vars configuradas
- [ ] Badge "LLM disponible" si Mistral/OpenAI configurado
- [ ] Content generator (`/marketing/tools`): seleccionar template → generar → muestra resultado
- [ ] 9 templates disponibles (email discovery, post-demo, propuesta, reactivación, post LinkedIn, etc.)

## 18. MARKETING
- [ ] `/marketing` carga hub con 10+ cards de módulos
- [ ] Competitor Tracker en `/marketing/tools` muestra mismos competidores que GTM
- [ ] Calendario, Assets, SEO, LLM Visibility funcionan

## 19. SIDEBAR
- [ ] 4 secciones: Operaciones, Actividad, Inteligencia, Sistema
- [ ] Kanban visible en Actividad
- [ ] Customer Health visible en Inteligencia
- [ ] GTM visible en Inteligencia
- [ ] Links funcionales

## 20. GENERAL
- [ ] Fuente 20px visible
- [ ] Breadcrumbs en todas las sub-páginas GTM
- [ ] Error boundary: no pantallas blancas en errores
- [ ] Responsive: sidebar colapsa en mobile
- [ ] Ctrl+K abre búsqueda
- [ ] Notificaciones (bell) muestra badge con count

## 21. SOCIAL MEDIA
- [ ] POST /social/ — crear post (LinkedIn, Twitter, YouTube)
- [ ] GET /social/ — listar posts, filtrar por plataforma/status
- [ ] POST /social/generate — generar contenido IA por plataforma
- [ ] GET /social/stats — estadísticas por plataforma
- [ ] Programar post con fecha futura → status "scheduled"

## 22. BULK ACTIONS LEADS
- [ ] POST /leads/bulk-action?action=score&lead_ids=id1,id2 — scoring batch
- [ ] POST /leads/bulk-action?action=assign_status&lead_ids=id1&value=qualified
- [ ] POST /leads/bulk-action?action=delete&lead_ids=id1,id2
- [ ] Import CSV con columnas correctas → leads creados
- [ ] Import CSV con emails duplicados → skipped correctamente
- [ ] POST /leads/deduplicate → detecta duplicados por email/empresa

## 23. COST CONTROL AVANZADO
- [ ] GET /costs/predictive — proyección fin de mes por herramienta
- [ ] Alertas predictivas: "warning" si proyección > warn_pct
- [ ] GET /costs/roi — ROI por herramienta vs revenue total
- [ ] Registrar coste → auto-evalúa guardrail
- [ ] Editar topes desde API

## 24. HEALTH CHECK MEJORADO
- [ ] GET /health muestra: database, llm, agents count, integrations status
- [ ] Devuelve 503 si DB desconectada
- [ ] Muestra estado de Telegram, Apollo, Brevo, PostHog

## 25. WIN/LOSS ANALYSIS
- [ ] GET /gtm/win-loss — won/lost by competitor, by tier
- [ ] Win/loss reasons agregados
- [ ] Average deal values (won vs lost)

## 26. WEEKLY DIGEST
- [ ] POST /gtm/weekly-digest — genera resumen texto
- [ ] Envía por Telegram si configurado
- [ ] Incluye KPIs rojos + budget

## 27. REDES SOCIALES (GENERACIÓN IA)
- [ ] Generar post LinkedIn con tema personalizado
- [ ] Generar tweet con límite 280 chars
- [ ] Generar título + descripción YouTube
- [ ] Post generado se puede guardar como draft

## 28. SOCIAL MEDIA PAGE
- [ ] `/social` carga sin errores
- [ ] Stats por plataforma visibles (LinkedIn, Twitter, YouTube, Instagram)
- [ ] Generar contenido IA: seleccionar plataforma + tema → genera texto
- [ ] Contenido generado se puede guardar como draft
- [ ] Crear post manualmente con content + tags
- [ ] Filtrar por plataforma funciona
- [ ] Posts muestran status (draft/scheduled/published)
- [ ] Link "Social Media" visible en sidebar Inteligencia

## 29. COST CONTROL V2 (LIVE)
- [ ] `/cost-control` muestra datos reales del backend
- [ ] Gasto actual por herramienta con barras de progreso
- [ ] Alertas predictivas: tabla con proyección fin de mes
- [ ] ROI: revenue vs coste total + breakdown por herramienta
- [ ] Guardrail levels (OK/Aviso/Corte) visibles

## 30. CHANGELOG IN-APP
- [ ] Popup "Novedades" aparece en la esquina inferior derecha
- [ ] Muestra últimas features de la versión actual
- [ ] Botón "Entendido" lo oculta y no vuelve a aparecer
- [ ] Al actualizar versión en el código, vuelve a aparecer
