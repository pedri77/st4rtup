# Manual de Usuario: Visitas

## Descripcion

El modulo de Visitas permite registrar, planificar y hacer seguimiento de las visitas comerciales a clientes y prospectos.

## Acceso

Navegar a **Visitas** en la barra lateral o acceder a `/visits`.

## Vista principal

Tabla con listado de visitas mostrando:
- Fecha de la visita
- Lead/Empresa asociada
- Tipo de visita
- Estado
- Asistentes
- Notas

## Crear una visita

1. Pulsar **Nueva Visita**
2. Completar el formulario:
   - **Lead**: Seleccionar el lead asociado (obligatorio)
   - **Fecha**: Fecha y hora de la visita
   - **Tipo**: Presencial, online, telefonica
   - **Objetivo**: Proposito de la visita
   - **Asistentes**: Personas que asistiran
   - **Notas**: Observaciones previas
3. Pulsar **Guardar**

## Estados de la visita

| Estado | Descripcion |
|--------|------------|
| scheduled | Visita programada |
| completed | Visita realizada |
| cancelled | Visita cancelada |
| rescheduled | Visita reprogramada |

## Completar una visita

Tras realizar la visita:
1. Abrir la visita desde el listado
2. Cambiar estado a **Completada**
3. Anadir notas del resultado
4. Registrar proximos pasos
5. Guardar cambios

## Filtros

- **Estado**: Filtrar por estado de la visita
- **Fecha**: Rango de fechas
- **Lead**: Buscar por empresa
- **Tipo**: Filtrar por tipo de visita

## Integracion con otros modulos

- Las visitas completadas pueden generar automaticamente acciones de seguimiento
- Se vinculan al historial del lead
- Aparecen en el calendario

## Consejos

- Registrar siempre el resultado de la visita el mismo dia
- Anadir todos los asistentes para mantener trazabilidad
- Utilizar las notas para documentar compromisos adquiridos
