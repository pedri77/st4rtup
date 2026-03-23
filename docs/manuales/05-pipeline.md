# Manual de Usuario: Pipeline

## Descripcion

El Pipeline visualiza el embudo de ventas con todas las oportunidades comerciales organizadas por etapas. Permite gestionar el ciclo de venta desde la identificacion hasta el cierre.

## Acceso

Navegar a **Pipeline** en la barra lateral o acceder a `/pipeline`.

## Vistas disponibles

### Vista Kanban
- Columnas por etapa del pipeline
- Arrastrar y soltar oportunidades entre etapas
- Resumen de valor por columna

### Vista Lista
- Tabla con todas las oportunidades
- Ordenacion por columnas
- Mayor detalle por registro

## Etapas del Pipeline

| Etapa | Descripcion |
|-------|------------|
| Identificacion | Oportunidad identificada |
| Cualificacion | Validando requisitos y presupuesto |
| Propuesta | Propuesta enviada al cliente |
| Negociacion | En negociacion de terminos |
| Cierre | Pendiente de firma/confirmacion |
| Ganada | Oportunidad ganada |
| Perdida | Oportunidad perdida |

## Crear una oportunidad

1. Pulsar **Nueva Oportunidad**
2. Completar:
   - **Nombre**: Titulo de la oportunidad
   - **Lead**: Lead asociado
   - **Valor**: Valor estimado en EUR
   - **Etapa**: Etapa actual del pipeline
   - **Probabilidad**: Porcentaje estimado de cierre
   - **Fecha cierre prevista**: Fecha estimada de cierre
   - **Notas**: Observaciones
3. Pulsar **Guardar**

## Metricas del Pipeline

En la cabecera se muestran:
- **Valor total**: Suma del valor de todas las oportunidades abiertas
- **Numero de oportunidades**: Total de oportunidades activas
- **Valor ponderado**: Valor ajustado por probabilidad de cierre

## Filtros

- **Etapa**: Filtrar por fase del pipeline
- **Comercial**: Filtrar por usuario asignado
- **Valor**: Rango de valor
- **Fecha**: Rango de fecha de cierre prevista

## Mover oportunidades

- En vista Kanban: arrastrar la tarjeta a la nueva columna
- En vista lista: editar la oportunidad y cambiar la etapa

## Consejos

- Mantener actualizada la probabilidad de cierre
- Revisar semanalmente las oportunidades estancadas
- Documentar las razones de oportunidades perdidas para aprender
- Usar la fecha de cierre prevista de forma realista
