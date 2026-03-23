# Manual de Usuario: Llamadas IA

## Descripcion

El modulo de Llamadas IA permite realizar llamadas comerciales automatizadas mediante Retell AI. Incluye consola de llamadas, gestion de prompts/guiones, dashboard de metricas e historial.

## Acceso

Navegar a **Llamadas IA** en la barra lateral o acceder a `/calls`.

## Submodulos

El modulo se compone de 4 secciones accesibles desde los botones superiores:

| Seccion | Ruta | Descripcion |
|---------|------|------------|
| Consola | /calls | Iniciar y gestionar llamadas |
| Prompts | /calls/prompts | Gestionar guiones de llamada |
| Dashboard | /calls/dashboard | Metricas y graficos |
| Historial | /calls/history | Registro de llamadas anteriores |

---

## 1. Consola de Llamadas

### KPIs superiores
- Total llamadas
- Finalizadas
- Duracion media
- Coste total

### Iniciar una llamada

1. **Buscar lead**: Usar el buscador para encontrar el lead
2. **Seleccionar lead**: Elegir del desplegable
3. **Seleccionar prompt**: Elegir el guion de la llamada
4. **Numero (opcional)**: Introducir numero si se quiere sobrescribir el del lead
5. Pulsar **Iniciar llamada**

### Panel de llamada activa

Cuando hay una llamada en curso:
- Se muestra el Call ID y Retell ID
- Estado de la llamada en tiempo real
- Indicador de llamada simulada (si Retell no esta configurado)

### Completar una llamada

1. Seleccionar el **Resultado** de la llamada:
   - Demo agendada
   - Interesado
   - Propuesta solicitada
   - Callback
   - Sin respuesta
   - No interesado
2. Opcionalmente completar **Siguiente accion**
3. Opcionalmente anadir **Notas del agente**
4. Pulsar **Completar llamada**

---

## 2. Prompts de Llamadas

### Crear un prompt

1. Pulsar **Nuevo prompt**
2. Completar el formulario:
   - **Nombre**: Identificador del prompt
   - **Objetivo**: Prospeccion, seguimiento demo, cierre, reactivacion, cualificacion
   - **Persona target**: Roles objetivo (CISO, DPO, CTO)
   - **Regulatory focus**: Normativas (ENS, NIS2, DORA)
   - **System Prompt**: Instrucciones para el agente IA
   - **Primer mensaje**: Mensaje inicial de la llamada (soporta variables como `{{lead_nombre}}`)
   - **Objetivo llamada**: Meta concreta de la llamada
   - **Duracion objetivo**: Duracion ideal en minutos
   - **Max duracion**: Limite maximo en minutos
   - **Variables dinamicas**: Variables que se sustituyen automaticamente
   - **Activo**: Si el prompt esta disponible para usar
3. Pulsar **Guardar**

### Seed GRC

Pulsar **Seed GRC** para crear automaticamente 5 prompts de ejemplo orientados a ciberseguridad y compliance.

### Filtrar por objetivo

Usar los botones de filtro para ver prompts por tipo:
- Prospeccion
- Seguimiento demo
- Cierre
- Reactivacion
- Cualificacion

### Editar/Eliminar

- Pulsar el icono de lapiz para editar
- Pulsar el icono de papelera para eliminar
- Expandir con la flecha para ver el contenido completo

---

## 3. Dashboard

### KPIs
- Total llamadas
- Tasa de conversion
- Duracion media
- Coste total
- Activas ahora

### Graficos
- **Resultados por tipo**: Grafico de barras con distribucion de resultados
- **Distribucion de resultados**: Grafico circular con proporciones

### Estado de Retell AI
Un indicador en la parte inferior muestra si Retell AI esta conectado o si las llamadas se simulan.

---

## 4. Historial

### Filtros
- **Estado**: Finalizada, activa, fallida, no contesta, buzon
- **Resultado**: Demo agendada, interesado, propuesta, callback, sin respuesta, no interesado

### Tabla de llamadas

Cada fila muestra:
- Fecha de inicio
- Lead (enlace a ficha)
- Estado
- Resultado
- Duracion
- Score (antes y despues de la llamada)
- Coste en EUR

### Detalle expandido

Al hacer clic en una fila se expande mostrando:
- Resumen generado por IA
- Notas del agente
- Siguiente accion
- Sentiment y puntuacion
- Turnos de conversacion
- Latencia media
- Minutos facturados
- Transcripcion completa

### Paginacion
Navegar entre paginas con los botones Anterior/Siguiente.

---

## Configuracion de Retell AI

Si Retell AI no esta configurado, las llamadas se simularan. Para configurar:
1. Ir a **Integraciones** o **Configuracion**
2. Introducir la API Key de Retell AI
3. Las llamadas pasaran a ejecutarse de forma real

## Consejos

- Empezar con los prompts de Seed GRC y personalizar
- Revisar el dashboard regularmente para optimizar los guiones
- Analizar las transcripciones de llamadas exitosas
- Ajustar la duracion objetivo segun los resultados
- Documentar siempre el resultado y la siguiente accion
