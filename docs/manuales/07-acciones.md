# Manual de Usuario: Acciones

## Descripcion

El modulo de Acciones gestiona las tareas y actividades comerciales pendientes. Permite crear, asignar, priorizar y hacer seguimiento de todas las acciones del equipo.

## Acceso

Navegar a **Acciones** en la barra lateral o acceder a `/actions`.

## Vista principal

Panel con KPIs superiores:
- Total de acciones
- Pendientes
- Completadas
- Vencidas

Debajo, listado de acciones con prioridad, titulo, lead, fecha limite y estado.

## Crear una accion

1. Pulsar **Nueva Accion**
2. Completar:
   - **Titulo**: Descripcion de la tarea (obligatorio)
   - **Lead**: Lead asociado
   - **Tipo**: Llamada, email, visita, seguimiento, otro
   - **Prioridad**: Baja, media, alta, urgente
   - **Fecha limite**: Fecha de vencimiento
   - **Descripcion**: Detalle de la tarea
   - **Asignado a**: Usuario responsable
3. Pulsar **Guardar**

## Prioridades

| Prioridad | Uso recomendado |
|-----------|----------------|
| Baja | Tareas sin urgencia, mejoras |
| Media | Seguimientos rutinarios |
| Alta | Acciones con impacto en pipeline |
| Urgente | Requiere atencion inmediata |

## Estados

| Estado | Descripcion |
|--------|------------|
| pending | Pendiente de realizar |
| in_progress | En curso |
| completed | Completada |
| cancelled | Cancelada |

## Completar una accion

1. Localizar la accion en el listado
2. Pulsar el boton de completar o abrir y cambiar estado
3. Opcionalmente anadir notas del resultado

## Filtros

- **Estado**: Pendientes, en curso, completadas, canceladas
- **Prioridad**: Baja, media, alta, urgente
- **Tipo**: Llamada, email, visita, etc.
- **Fecha**: Rango de fechas limite
- **Lead**: Buscar por empresa
- **Asignado a**: Filtrar por responsable

## Acciones automaticas

Algunas acciones se crean automaticamente mediante automatizaciones:
- Seguimiento post-visita
- Recordatorio de propuesta pendiente
- Escalado por inactividad

## Consejos

- Revisar acciones pendientes al inicio de cada dia
- Priorizar las acciones urgentes y de alta prioridad
- Documentar el resultado al completar cada accion
- Utilizar fechas limite realistas
