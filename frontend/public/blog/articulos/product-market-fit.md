# Product market fit: qué es, cómo medirlo y cómo encontrarlo en tu startup

El 90% de las startups fracasan. Pero si filtras solo las que alcanzaron product market fit, la tasa de supervivencia se invierte. Según [Marc Andreessen](https://pmarchive.com/guide_to_startups_part4.html), "lo único que importa" en una startup es encontrar el product market fit. Y según un análisis de [CB Insights](https://www.cbinsights.com/research/startup-failure-reasons-top/), la primera causa de fracaso de startups (35%) es que no existe demanda real para su producto.

El product market fit (PMF) es el punto en el que tu producto satisface una necesidad real del mercado con suficiente intensidad como para generar crecimiento orgánico. No es un evento binario ni un momento mágico. Es un proceso iterativo que se puede medir, acelerar y, sobre todo, validar antes de escalar.

Si todavía estás en la fase de idea, empieza por [validar tu idea de negocio](/blog/validar-idea-de-negocio). Si ya tienes un [MVP](/blog/mvp-que-es-startup), este artículo te ayudará a saber si estás cerca del PMF o si necesitas pivotar.

## Qué es el product market fit

El concepto fue popularizado por Marc Andreessen en 2007, aunque su origen se remonta a Andy Rachleff (cofundador de Wealthfront y Benchmark Capital). La definición más citada es:

> "Product market fit significa estar en un buen mercado con un producto que puede satisfacer ese mercado."

En términos prácticos, el PMF se manifiesta cuando:

- Los clientes usan tu producto de forma recurrente sin que tengas que perseguirlos.
- El boca a boca genera una parte significativa de tus nuevos usuarios.
- La retención se estabiliza en un nivel saludable (la curva deja de caer).
- Los usuarios se quejan cuando les quitas el producto o cuando hay caídas de servicio.
- El equipo de ventas (si existe) empieza a cerrar deals más rápido.

### PMF no es lo mismo que tracción

Tener 10.000 registros no es PMF. Tener 500 usuarios que vuelven cada semana sí puede serlo. La tracción sin retención es un cubo agujereado: por mucho que viertas arriba, se vacía por abajo.

## Cómo medir el product market fit

### Test de Sean Ellis (40%)

Sean Ellis, creador del término "growth hacking", propuso la forma más directa de medir PMF. La pregunta es:

**"¿Cómo te sentirías si ya no pudieras usar [producto]?"**

Las opciones son:

| Respuesta | Significado |
|-----------|-------------|
| Muy decepcionado | Usuario con alta dependencia del producto |
| Algo decepcionado | Usuario que ve valor, pero podría sustituirlo |
| No me importaría | Usuario sin engagement real |
| Ya no lo uso | Usuario inactivo |

**Benchmark:** si más del 40% de tus usuarios responden "muy decepcionado", tienes product market fit. Por debajo del 25%, tienes un problema serio. Entre 25% y 40%, estás cerca pero necesitas iterar.

Superhuman usó este test de forma sistemática. Cuando empezaron, estaban en un 22%. Iteraron durante 18 meses hasta superar el 58%.

### Curvas de retención

La retención es la señal más honesta del PMF. Si trazas una curva de retención (% de usuarios que siguen activos a lo largo del tiempo), buscas que se aplane, no que caiga a cero.

| Forma de la curva | Interpretación |
|-------------------|----------------|
| Cae a cero | No hay PMF. Los usuarios prueban y abandonan |
| Se aplana en 10-20% | PMF débil. Funciona para un segmento pequeño |
| Se aplana en 30-50% | PMF sólido. Base de usuarios comprometida |
| Se aplana en 50%+ | PMF excepcional. Producto esencial |

**Cómo medirla:**

```
Retención D7 = Usuarios activos en el día 7 / Usuarios registrados en la cohorte x 100
Retención D30 = Usuarios activos en el día 30 / Usuarios registrados en la cohorte x 100
Retención D90 = Usuarios activos en el día 90 / Usuarios registrados en la cohorte x 100
```

Para SaaS B2B, la retención mensual es más relevante que la diaria. Para apps de consumo, la retención diaria o semanal es crítica.

### NPS (Net Promoter Score)

El NPS mide la disposición de tus usuarios a recomendarte. Es un proxy útil del PMF, aunque no suficiente por sí solo. Consulta la guía completa en [métricas startup](/blog/metricas-startup).

| NPS | Relación con PMF |
|-----|------------------|
| > 50 | Fuerte indicador de PMF |
| 30-50 | PMF probable, pero hay fricción |
| 0-30 | PMF dudoso |
| < 0 | No hay PMF |

### Métricas de engagement orgánico

| Métrica | Señal de PMF | Señal de no PMF |
|---------|-------------|-----------------|
| Coeficiente viral (K) | > 0,5 | < 0,2 |
| % de registros por referral | > 20% | < 5% |
| Ratio de DAU/MAU | > 25% (B2C) | < 10% |
| Tiempo medio de sesión | Creciente o estable | Decreciente |
| Tasa de activación | > 40% | < 15% |

## Cómo encontrar el product market fit

### Paso 1: identifica tu segmento objetivo

No busques PMF "en general". Búscalo en un segmento específico. Las startups que encuentran PMF lo hacen primero con un nicho concreto y después expanden.

**Preguntas clave:**

- ¿Quién tiene este problema con más intensidad?
- ¿Quién ya está pagando por soluciones alternativas (aunque sean malas)?
- ¿Quién tiene presupuesto y capacidad de decisión?
- ¿En qué segmento tienes una ventaja injusta (conocimiento, acceso, red)?

### Paso 2: resuelve un problema real con alta frecuencia

La intensidad del problema importa más que el tamaño del mercado. Un problema "nice to have" no genera PMF. Un problema "must have" sí.

| Categoría | Ejemplo | Intensidad |
|-----------|---------|------------|
| Hair on fire | "Perdemos 50.000 EUR/mes en cumplimiento normativo" | Máxima |
| Must have | "Necesitamos un CRM para gestionar 200 clientes" | Alta |
| Nice to have | "Sería genial automatizar nuestros informes semanales" | Baja |

### Paso 3: itera rápido con ciclos cortos

El framework build-measure-learn de Eric Ries sigue siendo válido:

1. **Construye** la versión más simple que pueda validar tu hipótesis.
2. **Mide** las métricas correctas (retención, Sean Ellis, NPS).
3. **Aprende** qué segmentos responden mejor y por qué.
4. **Repite** con ciclos de 2-4 semanas.

Cada iteración debe responder una pregunta específica. "¿Funcionará?" no es una buena pregunta. "¿Los directores de compliance de empresas de 50-200 empleados completarán una evaluación de riesgos en menos de 30 minutos?" sí lo es.

### Paso 4: escucha a tus mejores usuarios

No a todos tus usuarios. A los que más usan tu producto, los que más pagan, los que te recomiendan. Son tu "grupo de amor" (Rahul Vohra de Superhuman acuñó este concepto).

- Identifica a los usuarios que respondieron "muy decepcionado" en el test de Sean Ellis.
- Pregúntales qué es lo que más valoran.
- Construye más de eso. Reduce todo lo demás.

### Paso 5: elige un canal de distribución

El PMF no es solo producto. Es producto + canal. Un producto perfecto con un canal equivocado no tiene PMF funcional.

| Canal | Mejor para | CAC típico |
|-------|-----------|------------|
| SEO / contenido | SaaS B2B con ciclo largo | 50-500 EUR |
| Paid ads (Google/Meta) | B2C y SMB | 10-200 EUR |
| Outbound sales | Enterprise B2B | 5.000-50.000 EUR |
| Product-led growth | SaaS self-serve | 1-50 EUR |
| Partnerships | Mercados regulados | Variable |
| Community / boca a boca | Developer tools | Cercano a 0 EUR |

Para profundizar en estrategias de crecimiento con presupuesto limitado, consulta [marketing startup bajo presupuesto](/blog/marketing-startup-bajo-presupuesto).

## Señales de que tienes product market fit

### Señales cuantitativas

- Sean Ellis test > 40%.
- Retención mensual > 80% (SaaS B2B) o retención D30 > 25% (B2C).
- Crecimiento orgánico > 50% de los nuevos usuarios.
- Net Revenue Retention > 100%.
- NPS > 40.

### Señales cualitativas

- Los usuarios se quejan cuando hay downtime (les importa tu producto).
- Recibes emails no solicitados de agradecimiento.
- Los usuarios piden features avanzadas, no features básicas.
- Los comerciales empiezan a decir "se vende solo".
- Los competidores empiezan a copiarte.

### Señales de que NO tienes PMF

- Necesitas descuentos agresivos para cerrar ventas.
- Los usuarios prueban pero no vuelven.
- El ciclo de ventas es cada vez más largo.
- Los testimonios son tibios ("está bien", "es útil").
- El churn supera el 8% mensual.

## Qué hacer antes del PMF

Antes del PMF, tu único objetivo es encontrarlo. Todo lo demás es distracción.

| Hacer | No hacer |
|-------|----------|
| Hablar con clientes cada semana | Contratar equipo de ventas |
| Iterar el producto rápidamente | Invertir en branding |
| Medir retención y engagement | Medir vanity metrics |
| Optimizar para un segmento | Atacar múltiples mercados |
| Gastar poco y ser frugal | Levantar rondas grandes |

Si estás en esta [fase de tu startup](/blog/fases-de-una-startup), mantén el equipo pequeño y el burn rate bajo.

## Qué hacer después del PMF

Una vez confirmado el PMF, el juego cambia de "buscar" a "escalar".

| Prioridad | Acción |
|-----------|--------|
| 1 | Documentar y sistematizar el proceso de ventas |
| 2 | Invertir en el canal de adquisición que funciona |
| 3 | Contratar para escalar (ventas, CS, ingeniería) |
| 4 | Levantar capital para acelerar (si aplica) |
| 5 | Expandir a segmentos adyacentes |

Es el momento de medir CAC, LTV y todas las [métricas de crecimiento](/blog/metricas-startup). Y de explorar tácticas de [growth hacking](/blog/growth-hacking-startups) para multiplicar tu tracción.

## Casos reales de PMF

### Superhuman (email)

Rahul Vohra midió el PMF con el test de Sean Ellis y obtuvo un 22%. Insuficiente. Analizó las respuestas de los usuarios "muy decepcionados", identificó que valoraban la velocidad, y reconstruyó el producto alrededor de ese atributo. En 18 meses llegó al 58%.

### Slack

Stewart Butterfield notó que los equipos internos de Tiny Speck (su empresa de videojuegos) usaban la herramienta de chat más que el propio juego. La señal de PMF fue obvia: la herramienta interna generaba más engagement que el producto principal. Pivotaron.

### Notion

Notion falló dos veces antes de encontrar PMF. Las primeras versiones eran demasiado complejas. Simplificaron hasta llegar a un editor de bloques que combinaba docs, wikis y bases de datos. El PMF llegó cuando los usuarios empezaron a crear templates y compartirlos orgánicamente.

### Lecciones comunes

1. El PMF no fue instantáneo. Tardaron meses o años.
2. Requirió iterar sobre feedback real, no sobre intuición.
3. El segmento inicial era más pequeño de lo esperado.
4. La señal más clara fue el comportamiento de los usuarios, no las encuestas.

## Preguntas frecuentes

### ¿Cuánto tiempo se tarda en encontrar el product market fit?

No hay una respuesta universal. Las startups más exitosas tardan entre 12 y 36 meses. Superhuman tardó 2 años. Slack pivotó después de 4 años trabajando en otro producto. Lo importante no es la velocidad, sino la disciplina de medir, aprender e iterar de forma constante.

### ¿Se puede perder el product market fit?

Sí. El mercado cambia, la competencia evoluciona y las necesidades de los clientes se transforman. Empresas como Blackberry y MySpace tuvieron PMF sólido y lo perdieron. La clave es seguir midiendo las señales (retención, NPS, Sean Ellis) incluso después de alcanzar el PMF.

### ¿Es posible tener PMF en un segmento y no en otro?

Es lo habitual. La mayoría de startups encuentran PMF primero en un nicho específico. Slack encontró PMF primero en equipos de desarrollo de software. Notion primero en startups y equipos pequeños. Expandir a otros segmentos requiere, a menudo, adaptar el producto y el mensaje.

### ¿Cómo sé si debo pivotar o seguir iterando?

Si después de 6 meses de iteración con un segmento concreto no ves mejora en las métricas de retención ni en el test de Sean Ellis, es momento de considerar un pivote. Pero pivote no significa empezar de cero. Significa cambiar el segmento, el problema o la solución, manteniendo lo que has aprendido.

### ¿Los inversores invierten antes del product market fit?

Sí, pero con expectativas diferentes. En [pre-seed y seed](/blog/pre-seed-seed-serie-a-diferencias), los inversores apuestan por el equipo y el mercado, no por el PMF demostrado. En Serie A, esperan señales claras de PMF (retención estable, crecimiento orgánico, unit economics positivos). Para entender qué buscan los inversores en cada fase, consulta [qué es el venture capital](/blog/que-es-el-venture-capital).

## Conclusión

El product market fit no es un destino, es un proceso. No se descubre en un brainstorming ni se declara en un pitch deck. Se construye a base de iterar, medir y escuchar al mercado.

Antes del PMF, tu trabajo es buscar. Después del PMF, tu trabajo es escalar. Confundir estas dos fases es el error más caro que puede cometer un founder.

¿Necesitas ayuda para medir tu product market fit o diseñar tu estrategia de crecimiento? En [st4rtup.com](https://st4rtup.com) ofrecemos servicios de consultoría estratégica para startups en todas las fases. [Descubre nuestros servicios](https://st4rtup.com/servicios).
