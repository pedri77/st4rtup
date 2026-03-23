# Manual de Usuario: Leads

## Descripcion

El modulo de Leads gestiona la captacion y cualificacion de prospectos comerciales. Permite crear, editar, filtrar, puntuar y hacer seguimiento de empresas potenciales.

## Acceso

Navegar a **Leads** en la barra lateral o acceder a `/leads`.

## Vista principal

La pantalla muestra una tabla con todos los leads del sistema, incluyendo:
- Nombre de empresa
- Contacto principal
- Email de contacto
- Estado actual
- Puntuacion (score)
- Fecha de creacion
- Comercial asignado

## Crear un lead

1. Pulsar el boton **Nuevo Lead**
2. Completar el formulario:
   - **Empresa**: Nombre de la empresa (obligatorio)
   - **Contacto**: Nombre del contacto principal
   - **Email**: Email del contacto
   - **Telefono**: Telefono de contacto
   - **Sector**: Sector de la empresa
   - **Tamano**: Tamano de la empresa
   - **Origen**: Canal de captacion (web, referido, Apollo, etc.)
   - **Notas**: Observaciones adicionales
3. Pulsar **Guardar**

## Estados del lead

| Estado | Descripcion |
|--------|------------|
| new | Lead recien creado |
| contacted | Se ha establecido contacto |
| qualified | Lead cualificado como oportunidad |
| proposal | Se ha enviado propuesta |
| negotiation | En fase de negociacion |
| won | Cliente ganado |
| lost | Lead perdido |
| dormant | Lead inactivo/dormido |

## Filtros disponibles

- **Busqueda**: Buscar por nombre de empresa, contacto o email
- **Estado**: Filtrar por estado del lead
- **Origen**: Filtrar por canal de captacion
- **Puntuacion**: Rango de score
- **Fecha**: Rango de fechas de creacion
- **Comercial**: Filtrar por usuario asignado

## Puntuacion (Lead Scoring)

Cada lead tiene una puntuacion de 0 a 100 que indica su potencial:
- **0-25**: Bajo potencial
- **26-50**: Potencial medio
- **51-75**: Alto potencial
- **76-100**: Muy alto potencial

La puntuacion se actualiza automaticamente segun las interacciones.

## Detalle del lead

Al hacer clic en un lead se accede a su ficha completa con:
- Informacion de la empresa
- Historial de actividad
- Emails enviados
- Visitas realizadas
- Acciones pendientes
- Oportunidades asociadas

## Importacion de leads

1. Pulsar **Importar** en la cabecera
2. Seleccionar archivo CSV
3. Mapear las columnas del CSV a los campos del CRM
4. Confirmar la importacion

## Exportacion

Pulsar el boton de exportar para descargar los leads filtrados en formato CSV o Excel.

## Consejos

- Usar filtros avanzados para segmentar leads por criterios especificos
- Revisar regularmente los leads con estado "dormant" para reactivar
- Mantener actualizada la informacion de contacto
- Utilizar tags para clasificar leads por normativa (ENS, NIS2, DORA)
