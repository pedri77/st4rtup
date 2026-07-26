# SaaS métricas: las 10 KPIs que definen el éxito de tu negocio de suscripción

Solo el 22% de las empresas SaaS están satisfechas con sus tasas de conversión. Según [Bessemer Venture Partners](https://www.bvp.com/atlas/cloud-index), las empresas SaaS que alcanzan el top quartile en métricas operativas cotizan a múltiplos 3x superiores al resto. Y según [Stripe](https://stripe.com/reports/atlas-guide), las startups SaaS que rastrean al menos 5 métricas clave desde el primer año tienen un 35% más de probabilidades de sobrevivir al tercer año.

Las métricas SaaS no son las mismas que las de cualquier negocio. El modelo de suscripción tiene su propia lógica financiera: ingresos recurrentes, retención compuesta, expansión y unit economics específicos. Esta guía cubre las 10 métricas que todo founder SaaS debe dominar, con fórmulas, benchmarks y cómo construir un dashboard operativo.

Si buscas una visión general de métricas para startups (no solo SaaS), consulta [métricas startup](/blog/metricas-startup). Para entender cómo estas métricas afectan a la valoración, revisa [valoración startup](/blog/valoracion-startup).

## 1. MRR (Monthly Recurring Revenue)

Los ingresos mensuales recurrentes son la métrica fundacional del SaaS. Todo lo demás se construye sobre ella.

```
MRR = Número de clientes de pago x ARPU mensual
```

### Descomposición del MRR

| Componente | Definición | Impacto |
|------------|-----------|---------|
| **New MRR** | Ingresos de clientes nuevos | Crecimiento |
| **Expansion MRR** | Ingresos adicionales de clientes existentes (upgrades, add-ons) | Expansión |
| **Contraction MRR** | Ingresos reducidos por downgrades | Pérdida parcial |
| **Churned MRR** | Ingresos perdidos por cancelaciones | Pérdida total |
| **Reactivation MRR** | Ingresos de clientes que vuelven | Recuperación |

```
Net New MRR = New MRR + Expansion MRR + Reactivation MRR - Contraction MRR - Churned MRR
```

### Benchmarks de crecimiento de MRR

| Fase | MRR típico | Crecimiento mensual esperado |
|------|-----------|----------------------------|
| Pre-seed | 0-5.000 EUR | N/A (buscando PMF) |
| Seed | 5.000-50.000 EUR | 15-30% |
| Serie A | 50.000-300.000 EUR | 10-20% |
| Serie B | 300.000-2.000.000 EUR | 5-15% |
| Growth | > 2.000.000 EUR | 3-10% |

**Importante:** el MRR solo cuenta ingresos recurrentes contractuales. Los pagos únicos (setup fees, servicios profesionales) no cuentan.

## 2. ARR (Annual Recurring Revenue)

```
ARR = MRR x 12
```

El ARR es la moneda de referencia para hablar con inversores. Las valoraciones SaaS se expresan como múltiplos de ARR.

| Etapa | Múltiplo ARR típico (2026) | Ejemplo |
|-------|--------------------------|---------|
| Seed (pre-PMF) | 15-30x | 120K ARR → 1,8-3,6M valoración |
| Serie A (con PMF) | 20-40x | 600K ARR → 12-24M valoración |
| Serie B (escala) | 15-30x | 3M ARR → 45-90M valoración |
| Growth | 10-20x | 15M ARR → 150-300M valoración |

Los múltiplos varían enormemente según crecimiento, NRR, margen bruto y mercado. Una startup con 130% de NRR puede cotizar al doble que una con 100%.

## 3. NDR / NRR (Net Dollar Retention / Net Revenue Retention)

La métrica más reveladora de la salud de un SaaS. Ya la cubrimos en profundidad en [churn rate](/blog/churn-rate-que-es), pero merece una sección aquí por su importancia en el contexto SaaS.

```
NRR = (MRR inicio + Expansion - Contraction - Churn) / MRR inicio x 100
```

| NRR | Cuartil | Ejemplos notables |
|-----|---------|-------------------|
| > 140% | Top 5% | Snowflake (158%), Datadog (142%) |
| 120-140% | Top 25% | Twilio, CrowdStrike, Zscaler |
| 110-120% | Mediana superior | Slack, HubSpot, Monday.com |
| 100-110% | Mediana | Media del mercado SaaS |
| < 100% | Cuartil inferior | Señal de alarma |

**Por qué importa tanto:** un NRR de 120% significa que cada cohorte de clientes genera un 20% más de ingresos año tras año, sin inversión adicional en adquisición. Es crecimiento compuesto gratuito.

## 4. Gross Margin (margen bruto)

```
Gross Margin = (Revenue - COGS) / Revenue x 100
```

### COGS en SaaS

El coste de goods sold en SaaS incluye:

| Incluido en COGS | No incluido |
|-------------------|-------------|
| Hosting / infraestructura cloud | Salarios de ingeniería (producto) |
| Soporte al cliente | Marketing y ventas |
| Customer success (parcial) | G&A |
| Costes de terceros (APIs, integraciones) | I+D |
| DevOps / SRE (parcial) | |

### Benchmarks

| Margen bruto | Calificación | Notas |
|-------------|-------------|-------|
| > 80% | Excelente | Típico de SaaS puro sin servicios |
| 70-80% | Bueno | SaaS con algo de servicios profesionales |
| 60-70% | Aceptable | SaaS con componente de infraestructura alto |
| < 60% | Bajo | Más parecido a servicios que a software |

Un margen bruto inferior al 60% hace que los inversores cuestionen si realmente es un negocio SaaS o uno de servicios con facturación recurrente.

## 5. Magic Number

El magic number mide la eficiencia del gasto en ventas y marketing para generar nuevo ARR.

```
Magic Number = Net New ARR del trimestre / Gasto en S&M del trimestre anterior
```

| Magic Number | Interpretación | Acción |
|-------------|----------------|--------|
| > 1,0 | Muy eficiente. Invierte más en S&M | Acelerar crecimiento |
| 0,75 - 1,0 | Eficiente | Mantener o aumentar ligeramente |
| 0,5 - 0,75 | Moderado | Optimizar canales antes de escalar |
| < 0,5 | Ineficiente | Reducir gasto S&M, mejorar conversión |

**Por qué importa:** un magic number de 0,8 significa que por cada euro que gastas en S&M, generas 0,80 EUR de nuevo ARR. Si ese ARR tiene una retención del 90%, en 15 meses habrás generado más de 1 EUR de ingresos recurrentes por cada euro gastado.

## 6. Rule of 40

La Rule of 40 combina crecimiento y rentabilidad en una sola métrica. Es el benchmark más usado por inversores en growth stage.

```
Rule of 40 = Tasa de crecimiento anual de revenue (%) + Margen EBITDA (%)
```

| Ejemplos | Crecimiento | Margen | Rule of 40 |
|----------|:-----------:|:------:|:----------:|
| Startup en hiper-crecimiento | 100% | -60% | 40% |
| Startup en crecimiento | 60% | -20% | 40% |
| Empresa madura rentable | 20% | 20% | 40% |
| Empresa estancada | 10% | 15% | 25% |

| Resultado | Calificación |
|-----------|-------------|
| > 60% | Excepcional (top decile) |
| 40-60% | Excelente |
| 20-40% | Bueno |
| < 20% | Necesita mejora |

**Cuándo aplicarla:** a partir de 5-10M ARR. Antes de eso, la regla es menos relevante porque se espera que el crecimiento domine.

## 7. Quick Ratio

El SaaS Quick Ratio mide la eficiencia del crecimiento comparando las entradas de MRR con las salidas.

```
Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
```

| Quick Ratio | Interpretación |
|------------|----------------|
| > 4,0 | Crecimiento muy eficiente. Poca fuga |
| 2,0 - 4,0 | Crecimiento saludable |
| 1,0 - 2,0 | Crecimiento lento. El churn frena |
| < 1,0 | Contracción. Pierdes más de lo que ganas |

**Ejemplo:**

| Componente | Valor |
|------------|-------|
| New MRR | 15.000 EUR |
| Expansion MRR | 5.000 EUR |
| Churned MRR | 3.000 EUR |
| Contraction MRR | 2.000 EUR |
| **Quick Ratio** | **(15.000 + 5.000) / (3.000 + 2.000) = 4,0** |

Un quick ratio de 4,0 significa que por cada euro que pierdes, ganas 4. Saludable.

## 8. CAC Payback Period

Cuántos meses necesitas para recuperar la inversión de adquirir un cliente.

```
CAC Payback = CAC / (ARPU mensual x Gross Margin %)
```

Para un análisis completo del CAC, consulta [customer acquisition cost](/blog/customer-acquisition-cost).

| Payback | Benchmarks SaaS |
|---------|----------------|
| < 6 meses | Top quartile. Típico de PLG |
| 6-12 meses | Bueno. Estándar B2B mid-market |
| 12-18 meses | Aceptable para enterprise con alto ACV |
| 18-24 meses | Necesita capital externo para crecer |
| > 24 meses | Problema. Unit economics no funcionan |

## 9. ARPU / ARPA (Average Revenue Per User / Account)

```
ARPU = MRR / Número de clientes de pago
```

### Por qué importa la tendencia

| Tendencia ARPU | Significado |
|---------------|-------------|
| ARPU sube | Estás vendiendo a clientes más grandes o subiendo precios |
| ARPU estable | Mezcla de clientes estable |
| ARPU baja | Atraes clientes más pequeños o hay más downgrades |

Un ARPU creciente es la señal más clara de que estás moviendo tu negocio upmarket (de SMB a mid-market, de mid-market a enterprise).

### Benchmarks ARPU mensual

| Segmento | ARPU mensual típico |
|----------|:-------------------:|
| B2C / prosumer | 5-20 EUR |
| SMB | 30-200 EUR |
| Mid-market | 200-2.000 EUR |
| Enterprise | 2.000-50.000 EUR |

## 10. Burn Multiple

Métrica relativamente nueva, popularizada por David Sacks (Craft Ventures). Mide cuántos euros quemas por cada euro neto de nuevo ARR.

```
Burn Multiple = Net Burn / Net New ARR
```

| Burn Multiple | Calificación |
|:-------------|:-------------|
| < 1x | Excepcional. Crecimiento eficiente |
| 1-1,5x | Bueno |
| 1,5-2x | Aceptable en fases tempranas |
| 2-3x | Necesita mejorar |
| > 3x | Problema. Quemando demasiado para lo que creces |

**Ejemplo:**

| Concepto | Valor |
|----------|-------|
| Net burn mensual | 30.000 EUR |
| Net new ARR del mes | 20.000 EUR (MRR nuevo x 12) |
| **Burn Multiple** | **1,5x** |

## Dashboard SaaS: qué medir en cada fase

### Pre-PMF (0-10K MRR)

| Métrica | Frecuencia | Tool |
|---------|-----------|------|
| Activación | Semanal | PostHog / Mixpanel |
| Retención D7, D30 | Semanal | PostHog |
| NPS | Mensual | Typeform / email |
| Burn rate / runway | Semanal | Sheets |

### Post-PMF (10K-100K MRR)

| Métrica | Frecuencia | Tool |
|---------|-----------|------|
| MRR (desglosado) | Semanal | ChartMogul / Baremetrics |
| NRR | Mensual | ChartMogul |
| CAC por canal | Mensual | CRM + Sheets |
| Quick Ratio | Mensual | ChartMogul |
| Churn (logo + revenue) | Mensual | ChartMogul |
| Burn rate / runway | Semanal | Sheets |

### Growth (100K+ MRR)

| Métrica | Frecuencia | Tool |
|---------|-----------|------|
| ARR | Mensual | ChartMogul |
| NRR | Mensual | ChartMogul |
| Magic Number | Trimestral | Sheets + CRM |
| Rule of 40 | Trimestral | Sheets + contabilidad |
| Burn Multiple | Mensual | Sheets |
| CAC Payback | Trimestral | CRM + Sheets |
| Gross Margin | Trimestral | Contabilidad |
| ARPU trend | Mensual | Stripe / ChartMogul |

### Herramientas recomendadas

| Herramienta | Precio | Especialidad |
|-------------|--------|-------------|
| ChartMogul | Desde 99 EUR/mes | Métricas SaaS completas (MRR, churn, cohortes) |
| Baremetrics | Desde 108 EUR/mes | Métricas SaaS + forecasting |
| ProfitWell | Gratis (freemium) | Métricas SaaS básicas |
| PostHog | Gratis (OSS) | Analytics de producto |
| Stripe Dashboard | Incluido con Stripe | MRR básico, pagos |
| Metabase | Gratis (OSS) | Dashboards custom sobre tu DB |

Para startups en fase temprana que necesitan mantener los costes bajos, consulta nuestro artículo sobre [tech stack para startups en 2026](/blog/tech-stack-startup-2026).

## Errores comunes al medir métricas SaaS

| Error | Consecuencia | Corrección |
|-------|-------------|------------|
| Contar servicios profesionales como MRR | MRR inflado artificialmente | Solo contar revenue contractual recurrente |
| No segmentar churn por plan/cohorte | Perder visibilidad del problema | Cohortes por plan, fecha de alta y canal |
| Calcular NRR sobre base total en lugar de cohorte | NRR distorsionado | Usar cohortes de 12 meses |
| Ignorar la contraction | Quick ratio artificialmente alto | Contabilizar downgrades como pérdida |
| No incluir salarios en CAC | Unit economics falsos | CAC fully loaded |
| Comparar con benchmarks de otra fase | Decisiones erróneas | Usar benchmarks de tu rango de MRR |

## Preguntas frecuentes

### ¿Cuáles son las 3 métricas SaaS más importantes para un inversor de Serie A?

NRR (Net Revenue Retention), crecimiento de MRR mensual y CAC Payback Period. El NRR demuestra que los clientes se quedan y crecen. El crecimiento de MRR demuestra tracción. El payback period demuestra eficiencia. Con estas tres, un inversor puede evaluar si el modelo es escalable.

### ¿Cómo calculo el MRR si tengo clientes con contratos anuales?

Divide el valor anual del contrato entre 12. Si un cliente paga 12.000 EUR anuales, contribuye 1.000 EUR al MRR. Los pagos únicos (setup, implementación) no se incluyen. Si tienes una mezcla de contratos mensuales y anuales, suma ambos tipos de MRR.

### ¿La Rule of 40 aplica a startups en fase seed?

No directamente. La Rule of 40 es más relevante a partir de 5-10M ARR. En fase seed, se espera que el crecimiento sea muy alto y el margen muy negativo. Intentar cumplir la Rule of 40 en seed limitaría tu crecimiento. En esta fase, prioriza crecimiento de MRR, retención y activación sobre rentabilidad.

### ¿Qué es mejor, un margen bruto del 90% con bajo crecimiento o un 70% con alto crecimiento?

Depende de la fase. En fase temprana (seed/Serie A), alto crecimiento con margen del 70% es preferible. Los inversores valoran el crecimiento por encima del margen en etapas tempranas. En growth stage, el mercado premia la combinación de ambos (Rule of 40). Un margen del 70% es aceptable si el COGS incluye infraestructura escalable.

### ¿Cómo me comparo con otras startups SaaS en España?

El ecosistema SaaS español tiene benchmarks ligeramente diferentes al americano: los ciclos de venta son más largos, el ARPU medio es menor (mercado más sensible al precio) y la retención en SMB puede ser inferior. Empresas españolas referentes como Factorial, Holded o Carto publican datos ocasionalmente. Para un análisis detallado de tu posición, usa ChartMogul o Baremetrics y compara con los percentiles de mercado que publican estas herramientas.

## Conclusión

Las métricas SaaS no son un ejercicio académico. Son el lenguaje en el que se evalúa, financia y gestiona un negocio de suscripción. MRR y ARR te dicen cuánto creces. NRR te dice si creces de forma saludable. Gross margin te dice si eres un negocio de software o de servicios. Y la Rule of 40 te dice si el equilibrio entre crecimiento y rentabilidad es sostenible.

Empieza con 3-5 métricas en tu fase actual. Añade complejidad a medida que escales. Y nunca confundas medir mucho con gestionar bien.

¿Necesitas ayuda para definir tu dashboard SaaS o preparar tus métricas para una ronda de inversión? En [st4rtup.com](https://st4rtup.com) ofrecemos servicios de consultoría financiera y estratégica para startups SaaS. [Descubre nuestros servicios](https://st4rtup.com/servicios).
