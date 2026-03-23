# Manual de Usuario: Ofertas

## Descripcion

El modulo de Ofertas permite crear, gestionar y enviar propuestas comerciales formales a clientes. Incluye generacion de documentos PDF con partidas detalladas.

## Acceso

Navegar a **Ofertas** en la barra lateral o acceder a `/offers`.

## Vista principal

Listado de ofertas con:
- Numero de oferta
- Cliente/Lead
- Estado
- Valor total
- Fecha de creacion
- Fecha de validez

## Crear una oferta

1. Pulsar **Nueva Oferta**
2. Completar la informacion general:
   - **Lead/Oportunidad**: Asociar a un lead u oportunidad
   - **Titulo**: Titulo descriptivo de la oferta
   - **Fecha de validez**: Hasta cuando es valida la oferta
   - **Condiciones**: Terminos y condiciones
   - **Notas**: Observaciones internas
3. Anadir partidas (line items):
   - **Concepto**: Descripcion del servicio/producto
   - **Cantidad**: Unidades
   - **Precio unitario**: Precio por unidad en EUR
   - **Descuento**: Porcentaje de descuento (opcional)
4. Revisar el total calculado
5. Pulsar **Guardar**

## Estados de la oferta

| Estado | Descripcion |
|--------|------------|
| draft | Borrador en preparacion |
| sent | Oferta enviada al cliente |
| accepted | Oferta aceptada |
| rejected | Oferta rechazada |
| expired | Oferta caducada |

## Generacion de PDF

1. Abrir la oferta deseada
2. Pulsar **Generar PDF**
3. El sistema genera un documento profesional con:
   - Datos de la empresa
   - Datos del cliente
   - Partidas detalladas con subtotales
   - Total con/sin IVA
   - Condiciones

## Duplicar oferta

Para crear una oferta similar a una existente:
1. Abrir la oferta original
2. Pulsar **Duplicar**
3. Modificar los datos necesarios
4. Guardar como nueva oferta

## Filtros

- **Estado**: Filtrar por estado
- **Fecha**: Rango de fechas
- **Lead**: Buscar por empresa
- **Valor**: Rango de importes

## Consejos

- Establecer fechas de validez realistas (15-30 dias)
- Incluir notas internas para contexto del equipo
- Duplicar ofertas similares para ahorrar tiempo
- Hacer seguimiento de ofertas enviadas sin respuesta
