# Manual de Usuario: Automatizaciones

## Descripcion

El modulo de Automatizaciones gestiona los 22 workflows automaticos del CRM basados en n8n. Permite activar, desactivar y monitorizar las automatizaciones.

## Acceso

Navegar a **Automatizaciones** en la barra lateral o acceder a `/automations`.

## Vista principal

Listado de automatizaciones con:
- Nombre y descripcion
- Categoria
- Estado (activa/inactiva)
- Prioridad
- Ultima ejecucion
- Numero de ejecuciones

## Categorias de automatizaciones

| Categoria | Automatizaciones | Descripcion |
|-----------|-----------------|------------|
| Email Automation | EM-01 a EM-04 | Secuencias de email, tracking, follow-ups |
| Leads y Captacion | LD-01 a LD-04 | Webhooks, Apollo, enriquecimiento, scoring |
| Visitas | VI-01 a VI-03 | Post-visita, recordatorios, Google Calendar |
| Acciones y Alertas | AC-01 a AC-03 | Resumen diario, escalado, auto-cierre |
| Pipeline | PI-01 a PI-03 | Triggers etapa, reporte semanal, alertas |
| Seguimiento Mensual | MR-01, MR-02 | Auto-generacion, informe consolidado |
| Encuestas | SV-01, SV-02 | NPS post-cierre, CSAT trimestral |
| Integraciones | IN-01, IN-02 | Scraping leads, Telegram hub |

## Activar/Desactivar

1. Localizar la automatizacion en el listado
2. Usar el interruptor (toggle) para activar o desactivar
3. La automatizacion cambiara de estado inmediatamente

## Historial de ejecuciones

Para ver el historial de una automatizacion:
1. Hacer clic en la automatizacion
2. Se muestra el listado de ejecuciones con:
   - Fecha y hora
   - Estado (exito/error)
   - Duracion
   - Detalles del resultado

## Seed de automatizaciones

Para cargar las 22 automatizaciones predefinidas:
1. Pulsar **Seed** en la cabecera
2. Confirmar la accion
3. Se crearan las automatizaciones con su configuracion por defecto

## Prioridades

| Prioridad | Descripcion |
|-----------|------------|
| Critica | Esencial para el funcionamiento del CRM |
| Alta | Importante para la productividad |
| Media | Util pero no imprescindible |

## Integracion con n8n

Las automatizaciones se ejecutan mediante webhooks de n8n:
- Cada automatizacion tiene un `webhook_url` configurable
- n8n recibe el webhook y ejecuta el workflow correspondiente
- Los resultados se registran en el historial de ejecuciones

## Consejos

- Activar primero las automatizaciones de prioridad critica
- Monitorizar el historial de ejecuciones para detectar errores
- Configurar los webhook URLs de n8n antes de activar
- Revisar periodicamente las ejecuciones fallidas
