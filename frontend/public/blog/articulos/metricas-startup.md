# Métricas startup: las 9 KPIs esenciales que todo founder debe dominar

"Lo que no se mide no se puede mejorar." La frase es un cliché, pero en startups es una verdad cruda. Según [First Round Capital](https://firstround.com/review/), las startups que definen y rastrean sus métricas clave desde el primer día tienen el doble de probabilidades de llegar a una Serie A exitosa. Y los inversores descalifican al 40% de las startups en la primera reunión porque no conocen sus propios números.

En España, donde el ecosistema ha madurado y los fondos de venture capital gestionan más de 6.000 millones de euros, ya no basta con decir "estamos creciendo". Necesitas demostrar con datos cómo creces, cuánto te cuesta y cuánto tiempo te queda de vida financiera. Esta guía cubre las 9 métricas que todo founder debe conocer, con fórmulas, benchmarks y cuándo importa cada una.

Si todavía no has definido tu modelo de negocio, empieza por [cómo financiar una startup](/blog/como-financiar-una-startup) o revisa las [fases de una startup](/blog/fases-de-una-startup) para entender en qué momento estás.

## Por qué las métricas correctas cambian según la fase

No todas las métricas importan en todo momento. Medir demasiado es tan peligroso como no medir: genera ruido y distrae del foco.

| Fase | Métricas prioritarias | Por qué |
|------|----------------------|---------|
| **Pre-seed / Idea** | Entrevistas realizadas, tasa de interés | ¿El problema existe? |
| **Seed / MVP** | Activación, retención D7/D30, NPS | ¿El producto resuelve el problema? |
| **Post-PMF / Serie A** | MRR, churn, CAC, LTV, burn rate | ¿El negocio es escalable y sostenible? |
| **Crecimiento / Serie B+** | ARR, LTV/CAC ratio, net revenue retention | ¿El modelo genera valor compuesto? |

La tentación de medir ARR cuando no tienes ni 10 clientes de pago es real, pero inútil. Concéntrate en las métricas de tu fase.

## Métrica 1: MRR (Monthly Recurring Revenue)

### Qué mide

Los ingresos mensuales recurrentes. Es la métrica más importante para cualquier startup con modelo de suscripción.

### Fórmula

```
MRR = Número de clientes de pago x Precio medio mensual por cliente (ARPU)
```

### Componentes del MRR

| Componente | Definición |
|------------|------------|
| **New MRR** | Ingresos de clientes nuevos este mes |
| **Expansion MRR** | Ingresos adicionales de clientes existentes (upgrades, add-ons) |
| **Contraction MRR** | Reducción de ingresos de clientes que bajan de plan |
| **Churned MRR** | Ingresos perdidos de clientes que cancelan |
| **Net New MRR** | New + Expansion - Contraction - Churned |

### Benchmarks

| Fase | MRR orientativo | Crecimiento mensual esperado |
|------|-----------------|------------------------------|
| Seed | 1.000-10.000 EUR | 15-30% |
| Serie A | 50.000-200.000 EUR | 10-20% |
| Serie B | 500.000-2.000.000 EUR | 5-15% |

### Cuándo importa

Desde el momento en que tienes tu primer cliente de pago. Es la métrica que los inversores miran primero en una startup SaaS.

## Métrica 2: ARR (Annual Recurring Revenue)

### Qué mide

La versión anualizada del MRR. Sirve para hablar en los mismos términos que los inversores y para calcular múltiplos de [valoración](/blog/valoracion-startup).

### Fórmula

```
ARR = MRR x 12
```

### Contexto

El ARR es la métrica estándar para valorar startups SaaS. Los múltiplos típicos en 2026 son:

| Fase | Múltiplo de ARR | Ejemplo |
|------|-----------------|---------|
| Seed (pre-PMF) | 10-30x | 100K ARR → 1-3M EUR valoración |
| Serie A (con PMF) | 15-40x | 500K ARR → 7.5-20M EUR valoración |
| Serie B+ (escala) | 10-25x | 3M ARR → 30-75M EUR valoración |

Los múltiplos varían enormemente según crecimiento, retención, mercado y sector. Usa estos rangos como referencia, no como regla.

### Cuándo importa

Cuando hablas con inversores o calculas tu valoración. Internamente, trabaja con MRR porque refleja mejor los cambios mes a mes.

## Métrica 3: Churn Rate (tasa de cancelación)

### Qué mide

El porcentaje de clientes (o ingresos) que pierdes cada mes.

### Fórmulas

**Churn de clientes (logo churn):**
```
Customer Churn = Clientes perdidos en el mes / Clientes al inicio del mes x 100
```

**Churn de ingresos (revenue churn):**
```
Revenue Churn = MRR perdido en el mes / MRR al inicio del mes x 100
```

**Net Revenue Retention (NRR):** la métrica más completa.
```
NRR = (MRR inicio + Expansion - Contraction - Churned) / MRR inicio x 100
```

### Benchmarks

| Métrica | Excelente | Bueno | Aceptable | Problema |
|---------|-----------|-------|-----------|----------|
| Customer churn mensual | < 2% | 2-5% | 5-8% | > 8% |
| Revenue churn mensual | < 1% | 1-3% | 3-5% | > 5% |
| Net Revenue Retention anual | > 130% | 110-130% | 100-110% | < 100% |

Un NRR > 100% significa que tus clientes existentes generan más ingresos con el tiempo (expansion > churn). Las mejores startups SaaS tienen NRR de 120-150%.

### Cuándo importa

Desde que tienes clientes de pago. Un churn alto en fase seed es normal (estás iterando el producto). Un churn alto en Serie A es una señal de alarma.

### Cómo reducir el churn

1. **Onboarding.** Los clientes que no activan en los primeros 7 días tienen 3x más probabilidades de cancelar.
2. **Engagement.** Monitoriza la frecuencia de uso. Si un cliente deja de usar el producto, contacta antes de que cancele.
3. **Customer success.** En B2B, un account manager dedicado reduce el churn entre un 20-40%.
4. **Product-market fit.** Si el churn es alto para todos los segmentos, el problema es el producto, no la retención.

## Métrica 4: CAC (Customer Acquisition Cost)

### Qué mide

Cuánto te cuesta adquirir un nuevo cliente de pago.

### Fórmula

```
CAC = Gasto total en ventas y marketing / Nuevos clientes adquiridos en el periodo
```

**Incluye:** salarios del equipo de ventas y marketing, publicidad, herramientas, eventos, contenido.

**No incluye:** costes de producto, soporte post-venta, infraestructura.

### Variantes

| Variante | Fórmula | Uso |
|----------|---------|-----|
| **CAC blended** | Total S&M / Total nuevos clientes | Visión global |
| **CAC por canal** | Gasto en canal X / Clientes de canal X | Comparar eficiencia de canales |
| **CAC pagado** | Solo gasto paid / Clientes de paid | Eficiencia de publicidad |
| **CAC orgánico** | Solo gasto orgánico / Clientes orgánicos | Eficiencia del contenido |

### Benchmarks por modelo

| Modelo | CAC orientativo | Notas |
|--------|-----------------|-------|
| SaaS B2B SMB | 200-1.000 EUR | Self-service, inside sales |
| SaaS B2B Mid-market | 2.000-10.000 EUR | Inside sales + demos |
| SaaS B2B Enterprise | 10.000-50.000 EUR | Field sales, ciclos largos |
| B2C app freemium | 1-10 EUR | Paid + organic |
| Marketplace | 5-50 EUR | Por lado (comprador o vendedor) |

### Cuándo importa

Cuando empiezas a invertir en adquisición (seed/Serie A). En pre-seed, el founder vendiendo directamente no genera un CAC representativo.

## Métrica 5: LTV (Lifetime Value)

### Qué mide

El valor total que un cliente genera durante toda su relación contigo.

### Fórmulas

**Fórmula simple:**
```
LTV = ARPU mensual x Vida media del cliente (en meses)
```

**Fórmula con churn:**
```
LTV = ARPU mensual / Churn rate mensual
```

**Fórmula con margen bruto:**
```
LTV = (ARPU mensual x Margen bruto %) / Churn rate mensual
```

### El ratio LTV/CAC

Es la métrica que los inversores consideran más reveladora sobre la salud del negocio.

| Ratio LTV/CAC | Interpretación |
|----------------|----------------|
| < 1x | Pierdes dinero con cada cliente. Insostenible. |
| 1-2x | Apenas cubres costes. Necesitas mejorar pricing o reducir CAC. |
| 3x | Referencia estándar. Negocio saludable. |
| 5x+ | Excelente, pero quizá estás sub-invirtiendo en crecimiento. |
| > 10x | Probablemente estás creciendo demasiado lento para tu potencial. |

### Payback period (meses para recuperar el CAC)

```
Payback = CAC / (ARPU mensual x Margen bruto %)
```

| Payback | Interpretación |
|---------|----------------|
| < 6 meses | Excelente. Puedes reinvertir rápido. |
| 6-12 meses | Bueno. Estándar para SaaS B2B. |
| 12-18 meses | Aceptable si el LTV es alto. |
| > 18 meses | Problema de cash flow. Necesitas capital externo o mejor unit economics. |

### Cuándo importa

Cuando tienes suficientes datos para calcular un churn fiable (generalmente, 6-12 meses de datos de retención). Antes de eso, usa estimaciones conservadoras.

## Métrica 6: Burn Rate

### Qué mide

Cuánto dinero gastas cada mes por encima de tus ingresos.

### Fórmulas

**Gross burn rate:**
```
Gross Burn = Total de gastos mensuales
```

**Net burn rate:**
```
Net Burn = Total de gastos mensuales - Total de ingresos mensuales
```

### Ejemplo

| Concepto | Importe |
|----------|---------|
| Gastos mensuales totales | 25.000 EUR |
| Ingresos mensuales (MRR) | 8.000 EUR |
| **Gross burn** | **25.000 EUR** |
| **Net burn** | **17.000 EUR** |

### Cuándo importa

Siempre. Desde el momento en que gastas dinero. El burn rate determina tu runway, que es literalmente cuánto tiempo de vida te queda.

## Métrica 7: Runway

### Qué mide

Cuántos meses puedes operar con la caja actual sin ingresos adicionales.

### Fórmula

```
Runway = Caja disponible / Net Burn Rate mensual
```

### Benchmarks

| Runway | Acción |
|--------|--------|
| > 18 meses | Cómodo. Puedes experimentar. |
| 12-18 meses | Saludable. Empieza a pensar en siguiente ronda si aplica. |
| 6-12 meses | Alerta. Inicia proceso de fundraising o ajusta costes. |
| < 6 meses | Emergencia. Reduce gastos y busca financiación ahora. |

### Regla de oro

Nunca empieces a buscar financiación con menos de 6 meses de runway. El proceso de levantar una ronda en España tarda entre 3 y 9 meses. Si empiezas con 3 meses de caja, negociarás desde una posición de debilidad.

Para entender tus opciones de financiación, consulta nuestra guía sobre [cómo financiar una startup](/blog/como-financiar-una-startup).

### Cuándo importa

Siempre. Es la métrica de supervivencia. Revísala semanalmente.

## Métrica 8: NPS (Net Promoter Score)

### Qué mide

La satisfacción y disposición de tus clientes a recomendarte.

### Cómo se calcula

Pregunta: "Del 0 al 10, ¿cuánto recomendarías [producto] a un colega?"

| Puntuación | Categoría |
|------------|-----------|
| 9-10 | Promotores |
| 7-8 | Pasivos |
| 0-6 | Detractores |

```
NPS = % Promotores - % Detractores
```

El resultado va de -100 a +100.

### Benchmarks

| NPS | Interpretación |
|-----|----------------|
| > 70 | Excepcional (Apple, Peloton) |
| 50-70 | Excelente |
| 30-50 | Bueno |
| 0-30 | Aceptable, pero con margen de mejora |
| < 0 | Problema serio. Más detractores que promotores. |

### Cuándo y cómo medirlo

- **Cuándo:** Cuando tengas al menos 30 clientes activos.
- **Frecuencia:** Cada trimestre.
- **Método:** Email con una sola pregunta. Tasa de respuesta esperada: 20-40%.
- **Clave:** No te quedes con el número. Lee las respuestas abiertas ("¿por qué diste esa puntuación?"). Ahí está el insight.

### Cuándo importa

Es un leading indicator de retención y crecimiento orgánico. Un NPS alto predice bajo churn y alto referral. Un NPS bajo predice problemas a 3-6 meses.

## Métrica 9: Activation Rate (tasa de activación)

### Qué mide

El porcentaje de usuarios que completan la acción clave que indica que han experimentado el valor del producto.

### Fórmula

```
Activation Rate = Usuarios que completan la acción clave / Total de registros nuevos x 100
```

### Qué es la "acción clave"

Depende de tu producto. Es el momento "aha" donde el usuario entiende el valor.

| Producto | Acción clave |
|----------|-------------|
| Herramienta de email marketing | Enviar la primera campaña |
| CRM | Añadir el primer deal |
| Software de compliance | Completar la primera evaluación |
| App de contabilidad | Crear la primera factura |
| Herramienta de analítica | Instalar el tracking e ver el primer dashboard |

### Benchmarks

| Activation Rate | Interpretación |
|-----------------|----------------|
| > 50% | Excelente onboarding |
| 30-50% | Bueno, con espacio de mejora |
| 15-30% | Aceptable, pero hay fricción |
| < 15% | Problema grave: los usuarios no entienden tu producto |

### Cómo mejorar la activación

1. **Reduce los pasos hasta el valor.** Cada campo extra en el registro, cada pantalla extra de onboarding reduce la activación.
2. **Muestra el valor antes de pedir compromiso.** Deja que el usuario explore antes de obligarle a registrarse.
3. **Guía el primer uso.** Checklists, tooltips, emails de onboarding con pasos concretos.
4. **Personaliza.** Pregunta el caso de uso en el registro y adapta la experiencia inicial.

### Cuándo importa

Desde el primer día con usuarios reales. La activación es el puente entre adquisición y retención. Si no activas, no retienes.

## Cómo montar un dashboard de métricas

### Herramientas recomendadas

| Herramienta | Precio | Mejor para |
|-------------|--------|------------|
| **Google Sheets** | Gratis | Dashboard manual, fase temprana |
| **PostHog** | Gratis (OSS) | Analytics de producto, activación, retención |
| **Mixpanel** | Gratis hasta 20M eventos | Funnels, cohortes, activación |
| **ChartMogul** | Desde 99 EUR/mes | Métricas SaaS (MRR, churn, LTV) automatizadas |
| **Baremetrics** | Desde 108 EUR/mes | Métricas SaaS conectadas a Stripe |
| **Metabase** | Gratis (OSS) | Dashboards sobre tu propia base de datos |
| **Grafana** | Gratis (OSS) | Métricas de infraestructura + negocio |

### Dashboard mínimo por fase

**Pre-seed (Google Sheets):**
- Entrevistas realizadas
- Tasa de interés (% que dice "avísame cuando esté listo")
- Registros en landing page

**Seed (PostHog + Sheets):**
- Registros, activación, retención D7/D30
- NPS
- Burn rate + runway

**Serie A (ChartMogul + PostHog):**
- MRR (nuevo, expansion, churn)
- CAC por canal
- LTV, LTV/CAC ratio
- Churn (logo + revenue)
- Burn rate + runway

## Vanity metrics: las métricas que no importan

No todas las métricas son igual de útiles. Las vanity metrics parecen impresionantes pero no indican salud real del negocio.

| Vanity metric | Por qué engaña | Métrica real |
|---------------|-----------------|--------------|
| Descargas de app | No indica uso real | Usuarios activos mensuales (MAU) |
| Registros totales | No indica activación | Tasa de activación |
| Seguidores en redes | No indica conversión | Tráfico a web, leads generados |
| Páginas vistas | No indica engagement | Tiempo en página, conversión |
| "Hemos crecido un 200%" | ¿De 1 a 3 clientes? | MRR absoluto + tasa de crecimiento con contexto |

**Regla:** si una métrica te hace sentir bien pero no te ayuda a tomar decisiones, es una vanity metric.

## Preguntas frecuentes

### ¿Cuáles son las 3 métricas más importantes para una startup en fase seed?

Retención (D7 y D30), tasa de activación y NPS. Si retienes usuarios, los activas rápido y les gusta tu producto, todo lo demás se puede construir encima. Las métricas financieras (MRR, CAC, LTV) importan más a partir de la Serie A.

### ¿Cómo calculo el LTV si mi startup tiene menos de un año?

Con menos de 12 meses de datos, usa una estimación conservadora. Calcula el churn de los últimos 3-6 meses y extrapola: LTV = ARPU / Churn mensual. Sé honesto con los inversores sobre la limitación de tus datos. Prefieren estimaciones conservadoras a proyecciones infladas.

### ¿Qué ratio LTV/CAC buscan los inversores?

El estándar es LTV/CAC >= 3x. Por debajo de 3x, el negocio probablemente no es sostenible. Por encima de 5x, los inversores querrán saber por qué no estás invirtiendo más en crecimiento. El payback period (meses para recuperar el CAC) complementa este ratio: idealmente, menor de 12 meses.

### ¿Cada cuánto debo revisar mis métricas?

Burn rate y runway: semanalmente. MRR, activación y retención: mensualmente. NPS: trimestralmente. CAC y LTV: mensualmente cuando tengas datos suficientes. El equipo completo debería ver un dashboard actualizado al menos una vez al mes.

### ¿Qué hago si mis métricas son malas?

Diagnostica antes de actuar. Churn alto puede significar mal producto, mal onboarding o segmento equivocado. CAC alto puede significar canal equivocado o mensaje inadecuado. Usa el framework del plan de negocio para revisarlo: vuelve al [plan de negocio](/blog/plan-de-negocio-startup) y revisa tus supuestos. Para [growth hacking](/blog/growth-hacking-startups), experimenta con tácticas de retención antes que de adquisición.

## Conclusión

Las métricas no son burocracia. Son tu sistema nervioso como founder. Te dicen si el negocio funciona, dónde duele y qué debes priorizar. Sin métricas, estás tomando decisiones a ciegas.

Las 9 métricas de esta guía (MRR, ARR, churn, CAC, LTV, burn rate, runway, NPS, activation rate) cubren los tres pilares de cualquier startup: crecimiento, retención y sostenibilidad financiera. No necesitas todas desde el día 1, pero necesitas las correctas para tu fase.

Mide menos, pero mide bien. Actúa sobre los datos, no sobre las suposiciones. Y sobre todo, no confundas movimiento con progreso. Si estás empezando, nuestra guía de [valoración de startup](/blog/valoracion-startup) te muestra cómo estas métricas afectan directamente al valor de tu empresa ante inversores.

¿Necesitas ayuda para definir tus métricas o preparar tu dashboard para inversores? En [st4rtup.com](https://st4rtup.com) ofrecemos servicios de consultoría estratégica y financiera para startups. [Descubre nuestros servicios](https://st4rtup.com/servicios).
