# Manual de Usuario: Encuestas

## Descripcion

El modulo de Encuestas permite crear y gestionar encuestas de satisfaccion (NPS y CSAT) para medir la experiencia del cliente y recopilar feedback.

## Acceso

Navegar a **Encuestas** en la barra lateral o acceder a `/surveys`.

## Vista principal

Panel con estadisticas:
- Total de encuestas
- Enviadas
- Completadas
- Tasa de respuesta

Listado de encuestas con estado, tipo, destinatario y puntuacion.

## Tipos de encuesta

| Tipo | Descripcion | Escala |
|------|------------|--------|
| NPS | Net Promoter Score | 0-10 |
| CSAT | Customer Satisfaction | 1-5 |

## Crear una encuesta

1. Pulsar **Nueva Encuesta**
2. Completar:
   - **Tipo**: NPS o CSAT
   - **Lead/Cliente**: Destinatario
   - **Titulo**: Titulo de la encuesta
   - **Preguntas**: Configurar preguntas
   - **Plantilla de email**: Seleccionar plantilla para el envio
3. Pulsar **Guardar**

## Estados

| Estado | Descripcion |
|--------|------------|
| draft | Borrador |
| sent | Enviada al cliente |
| completed | Respondida por el cliente |
| expired | Caducada sin respuesta |

## Enviar encuesta

1. Seleccionar la encuesta en estado borrador
2. Verificar el destinatario y el contenido
3. Pulsar **Enviar**
4. El cliente recibira un email con enlace a la encuesta

## Puntuacion NPS

- **Promotores (9-10)**: Clientes satisfechos que recomendarian
- **Pasivos (7-8)**: Clientes neutrales
- **Detractores (0-6)**: Clientes insatisfechos

**NPS = % Promotores - % Detractores**

## Puntuacion CSAT

- **1-2**: Insatisfecho
- **3**: Neutral
- **4-5**: Satisfecho

**CSAT = (Respuestas 4-5 / Total) x 100**

## Analiticas

La seccion de analiticas muestra:
- Evolucion del NPS/CSAT en el tiempo
- Distribucion de respuestas
- Comentarios de clientes
- Comparativa por periodo

## Encuesta publica

Las encuestas generan una URL publica que el cliente puede acceder sin autenticacion para responder.

## Consejos

- Enviar encuestas NPS tras el cierre de oportunidades
- Programar encuestas CSAT trimestrales para clientes activos
- Analizar los comentarios de detractores para mejorar
- Mantener las encuestas breves para maximizar la tasa de respuesta
