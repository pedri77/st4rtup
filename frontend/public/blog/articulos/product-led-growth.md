# Product led growth: qué es, cómo implementarlo y ejemplos reales

El 58% de las empresas SaaS con más de 100 millones de dólares en ARR utilizan una estrategia de product led growth. Según [OpenView Partners](https://openviewpartners.com/product-benchmarks/), las empresas PLG cotizan a un múltiplo un 30% superior al de sus competidores sales-led y tienen un CAC entre 2x y 5x menor. No es una moda. Es un cambio estructural en la forma de vender software.

Product led growth (PLG) es una estrategia de crecimiento en la que el propio producto es el principal motor de adquisición, conversión y expansión. El usuario primero prueba, después paga. El producto se vende solo, o al menos hace la mayor parte del trabajo.

Si quieres entender primero las tácticas generales de crecimiento, consulta [growth hacking para startups](/blog/growth-hacking-startups). Si necesitas contexto sobre métricas, empieza por [métricas startup](/blog/metricas-startup).

## Qué es el product led growth

PLG es un modelo go-to-market donde el producto sustituye (o complementa) al equipo de ventas como principal canal de conversión. En lugar de demos de 45 minutos con un SDR, el usuario se registra, prueba el producto y decide si paga, todo sin intervención humana.

### PLG vs sales-led vs marketing-led

| Aspecto | Product-Led | Sales-Led | Marketing-Led |
|---------|------------|-----------|---------------|
| **Motor principal** | El producto | El equipo de ventas | El contenido y la publicidad |
| **Primer contacto** | El usuario prueba el producto | Demo con un comercial | Contenido, webinar, whitepaper |
| **Ciclo de venta** | Días o semanas | Semanas o meses | Semanas |
| **CAC típico** | 1-500 EUR | 5.000-50.000 EUR | 500-5.000 EUR |
| **Escalabilidad** | Muy alta (sin proporcionalidad lineal de vendedores) | Limitada (necesitas más vendedores) | Alta |
| **Mejor para** | SaaS horizontal, herramientas de productividad | Enterprise B2B, ventas complejas | B2B mid-market |

### No es solo freemium

PLG no es simplemente "tener un plan gratuito". Es una filosofía de producto donde cada decisión de diseño, onboarding y pricing está orientada a que el usuario experimente el valor lo antes posible.

Componentes de una estrategia PLG:

1. **Self-serve onboarding.** El usuario puede registrarse y obtener valor sin ayuda humana.
2. **Time-to-value corto.** El "momento aha" llega en minutos, no en días.
3. **Modelo de monetización progresivo.** Free trial, freemium o usage-based pricing.
4. **Viral loops integrados.** El uso del producto genera exposición a nuevos usuarios.
5. **Product-qualified leads (PQLs).** El equipo de ventas contacta a usuarios que ya demuestran engagement.

## Los tres modelos de PLG

### Freemium

El usuario accede a una versión limitada del producto de forma gratuita e indefinida.

| Ventaja | Desventaja |
|---------|------------|
| Máxima base de usuarios | Baja tasa de conversión (2-5% típico) |
| Alto potencial viral | Coste de servir usuarios gratuitos |
| Barrera de entrada cero | Risk de que el plan gratuito sea "suficiente" |

**Ejemplos:** Slack (hasta 10.000 mensajes archivados), Notion (un workspace personal gratuito), Figma (3 proyectos gratis), Trello (boards ilimitados con limitaciones).

**Cuándo funciona:** cuando el producto tiene efectos de red, cuando los usuarios gratuitos generan valor para los de pago (creando templates, integraciones, comunidad).

### Free trial

El usuario accede a todas las funcionalidades durante un periodo limitado (7, 14 o 30 días).

| Ventaja | Desventaja |
|---------|------------|
| El usuario experimenta el producto completo | Presión temporal puede generar abandono |
| Tasa de conversión más alta (8-15%) | Menor base de usuarios que freemium |
| Menos coste de servir usuarios gratuitos | El usuario necesita motivación para activarse rápido |

**Ejemplos:** HubSpot (14 días), Salesforce (30 días), Ahrefs (7 días).

**Cuándo funciona:** cuando el valor del producto es claro pero requiere ver todas las funcionalidades. Mejor para herramientas con ciclos de uso más largos.

### Usage-based / open core

El usuario paga por lo que usa. La versión base es gratuita y los costes escalan con el consumo.

| Ventaja | Desventaja |
|---------|------------|
| Alineación perfecta entre valor y precio | Ingresos más impredecibles |
| Barrera de entrada baja | Difícil de modelar financieramente |
| Expansión natural a medida que el cliente crece | El usuario puede optimizar para gastar menos |

**Ejemplos:** AWS, Twilio, Snowflake, Vercel.

## Métricas PLG que debes dominar

### PQL (Product-Qualified Lead)

Un PQL es un usuario que ha demostrado, a través de su comportamiento en el producto, que es un buen candidato para convertirse en cliente de pago.

| Criterio PQL típico | Ejemplo |
|---------------------|---------|
| Uso recurrente | Ha vuelto 5 de los últimos 7 días |
| Activación completa | Ha completado el onboarding + acción clave |
| Volumen | Ha superado el 80% de los límites del plan gratuito |
| Colaboración | Ha invitado a 3+ compañeros de equipo |
| Integración | Ha conectado una herramienta externa |

**Diferencia con MQL (Marketing-Qualified Lead):**

```
MQL = Ha descargado un whitepaper, asistido a un webinar, llenado un formulario.
PQL = Ha usado el producto de forma significativa.
```

Los PQLs convierten entre 5x y 10x mejor que los MQLs porque ya han experimentado el valor del producto.

### Activation rate (tasa de activación)

El porcentaje de usuarios que completan la acción clave que indica que han experimentado el valor del producto.

```
Activation Rate = Usuarios que completan la acción clave / Registros nuevos x 100
```

| Benchmark PLG | Excelente | Bueno | Problema |
|---------------|-----------|-------|----------|
| Activation rate | > 40% | 20-40% | < 20% |

Para profundizar en cómo medirla, consulta las [métricas startup](/blog/metricas-startup).

### Time-to-value (TTV)

El tiempo que tarda un usuario nuevo desde el registro hasta experimentar el valor del producto.

| TTV | Calificación |
|-----|-------------|
| < 5 minutos | Excepcional |
| 5-30 minutos | Bueno |
| 30 min - 2 horas | Aceptable para productos complejos |
| > 1 día | Problema. Demasiada fricción |

**Cómo reducirlo:**

1. Elimina campos innecesarios en el registro.
2. Usa onboarding guiado con checklists.
3. Precarga datos de ejemplo para que el usuario vea el valor inmediatamente.
4. Permite explorar antes de obligar a registrarse.

### Expansion revenue rate

```
Expansion Revenue Rate = MRR de expansion / MRR total al inicio del periodo x 100
```

En empresas PLG, la expansion revenue es crítica porque los usuarios entran en planes pequeños y crecen. Las mejores empresas PLG generan más del 30% de su nuevo MRR mensual por expansión.

### Viral coefficient (K)

```
K = Invitaciones enviadas por usuario x Tasa de conversión de invitaciones
```

| K | Significado |
|---|------------|
| > 1 | Crecimiento viral: cada usuario trae más de uno |
| 0,5 - 1 | Crecimiento asistido: viral + otros canales |
| < 0,5 | Sin viralidad significativa |

## Ejemplos reales de PLG

### Slack

- **Modelo:** Freemium.
- **Time-to-value:** < 2 minutos (creas un workspace, invitas al equipo, empiezas a chatear).
- **Viral loop:** cada nuevo miembro del equipo necesita Slack para comunicarse. El producto se extiende por la organización de abajo hacia arriba.
- **Conversión:** el 30% de los equipos que superan los 10 usuarios pasan a planes de pago.
- **Dato clave:** el 50% de los clientes enterprise empezaron como equipos gratuitos.

### Calendly

- **Modelo:** Freemium.
- **Time-to-value:** < 3 minutos (creas un enlace, lo compartes).
- **Viral loop:** cada vez que alguien reserva una reunión contigo a través de Calendly, ve el producto. Es publicidad gratuita en cada interacción.
- **Dato clave:** Calendly pasó de 0 a 100M ARR en 8 años, con un equipo de ventas mínimo.

### Notion

- **Modelo:** Freemium.
- **Time-to-value:** < 5 minutos con templates.
- **Viral loop:** los templates creados por la comunidad atraen nuevos usuarios a través de SEO y redes sociales.
- **Conversión:** la expansión a equipos completos (pasando de personal a team) es el principal motor de monetización.

### Figma

- **Modelo:** Freemium (3 proyectos).
- **Time-to-value:** inmediato si vienes de Sketch/Adobe.
- **Viral loop:** la colaboración en tiempo real requiere que los diseñadores inviten a devs y stakeholders, expandiendo el uso dentro de la organización.
- **Dato clave:** Figma fue adquirida por Adobe por 20.000 millones de dólares. El 80% de su adopción fue bottom-up (sin equipo de ventas).

## Playbook de implementación PLG

### Fase 1: diseña el onboarding (semana 1-4)

| Paso | Acción |
|------|--------|
| 1 | Define tu "momento aha" (qué acción demuestra valor) |
| 2 | Reduce los pasos entre registro y momento aha al mínimo |
| 3 | Crea un checklist de onboarding visible en el producto |
| 4 | Configura emails de onboarding (D0, D1, D3, D7) |
| 5 | Mide activation rate y time-to-value |

### Fase 2: construye el modelo de monetización (semana 4-8)

| Decisión | Criterio |
|----------|---------|
| Freemium vs free trial | Si el valor crece con el uso, freemium. Si el valor es claro pero necesita exploración completa, free trial |
| Límites del plan gratuito | Lo suficiente para demostrar valor, no tanto como para no necesitar pagar nunca |
| Pricing tiers | 3 tiers máximo. Nomenclatura clara (Free, Pro, Enterprise) |
| Billing | Mensual + anual con descuento (20% es estándar) |

### Fase 3: implementa viral loops (semana 8-12)

| Tipo de loop | Implementación |
|-------------|----------------|
| Invitaciones directas | "Invita a tu equipo" prominente en el dashboard |
| Producto como canal | Logo/badge en outputs compartidos (como "Made with Canva") |
| Templates/contenido | Galería pública de templates creados por usuarios |
| Integraciones | Conectar con herramientas existentes expone tu marca |

### Fase 4: define PQLs y activa ventas (semana 12-16)

1. Define los criterios de PQL basándote en datos de conversión.
2. Configura alertas cuando un usuario cumple los criterios.
3. El equipo de ventas contacta a PQLs con contexto (sabe qué features usa, cuántos del equipo están activos).
4. Mide la tasa de conversión PQL-to-paid y optimiza los criterios.

### Fase 5: mide y optimiza (continuo)

Dashboard PLG mínimo:

| Métrica | Frecuencia |
|---------|-----------|
| Registros | Diario |
| Activation rate | Semanal |
| Time-to-value | Semanal |
| PQLs generados | Semanal |
| Conversión free-to-paid | Mensual |
| Expansion revenue | Mensual |
| K (coeficiente viral) | Mensual |
| NPS | Trimestral |

## Cuándo PLG no funciona

PLG no es para todos. Estas son las situaciones donde un modelo sales-led es mejor:

| Situación | Por qué PLG no encaja |
|-----------|----------------------|
| Producto complejo con setup largo | El TTV es demasiado largo para self-serve |
| ACV > 50.000 EUR | El comprador necesita demos, negociación y procurement |
| Comprador no es usuario | El CFO compra, pero no usa el producto |
| Mercado regulado con procurement formal | Hospitales, gobiernos, banca |
| Producto invisible para el usuario | Infraestructura backend, herramientas de DevOps |

En [marketing startup bajo presupuesto](/blog/marketing-startup-bajo-presupuesto) exploramos estrategias alternativas para startups que no pueden implementar PLG.

## PLG + sales: el modelo híbrido

Las mejores empresas PLG no eliminan las ventas. Las complementan. Este modelo se llama product-led sales (PLS).

```
PLG puro:    Usuario → Producto → Pago self-serve
PLG + Sales: Usuario → Producto → PQL → Equipo de ventas → Enterprise deal
```

**Ejemplo:** Slack. Los equipos pequeños se auto-sirven. Cuando una empresa tiene 50+ usuarios, el equipo de ventas contacta para ofrecer Slack Enterprise Grid.

El PLG crea demanda y el equipo de ventas captura el valor enterprise. Es la combinación más eficiente.

## Preguntas frecuentes

### ¿Cuál es la diferencia entre PLG y freemium?

Freemium es un modelo de pricing. PLG es una estrategia de crecimiento completa. Puedes tener freemium sin PLG (si el onboarding es malo y no hay viral loops) y puedes tener PLG sin freemium (con free trials o modelos usage-based). PLG implica que todo el producto, desde el diseño hasta las métricas, está orientado a que el usuario se convierta en cliente por sí mismo.

### ¿Cuánto cuesta implementar PLG en una startup en fase seed?

El coste principal es ingeniería. Necesitas invertir en onboarding guiado, analytics de producto (herramientas como PostHog, Mixpanel o Amplitude), infraestructura self-serve y billing automatizado. En fase seed, esto puede suponer 2-4 meses del equipo de producto. El ahorro viene después: un CAC entre 5x y 10x menor que sales-led.

### ¿PLG funciona en España o solo en mercados anglosajones?

Funciona, pero con matices. El mercado español tiene menor cultura de self-serve en B2B (especialmente en enterprise). Sin embargo, para SMB y mid-market, PLG es perfectamente viable. Empresas como Factorial (HR) o Holded (ERP) han usado modelos PLG con éxito en España. La clave está en el [MVP](/blog/mvp-que-es-startup) y en que el producto resuelva un problema claro sin necesidad de explicación.

### ¿Cómo mido si mi PLG está funcionando?

Las tres métricas más reveladoras son: activation rate (¿los usuarios llegan al momento aha?), conversión free-to-paid (¿los usuarios pagan?) y expansion revenue (¿los clientes crecen?). Si las tres son positivas, PLG funciona. Si la activación es alta pero la conversión baja, el problema es el pricing o el packaging. Revisa las [métricas de tu startup](/blog/metricas-startup) para un framework completo.

### ¿Puedo hacer PLG si mi startup está en la fase de [MVP](/blog/mvp-que-es-startup)?

Es el mejor momento para empezar. Diseña el onboarding pensando en PLG desde el día 1. No necesitas todas las features, pero sí un [product market fit](/blog/product-market-fit) claro en un segmento y un time-to-value corto. Slack empezó como herramienta interna. Calendly empezó con un solo tipo de evento. Empieza simple.

## Conclusión

Product led growth no es una táctica de marketing. Es una forma de construir y vender software donde el producto hace el trabajo pesado de adquisición y conversión. Funciona porque los usuarios prefieren probar antes de comprar, y porque la tecnología permite ofrecer valor antes de cobrar.

No todas las startups pueden ser PLG. Pero si tu producto es self-serve, tu mercado es horizontal y tu time-to-value es corto, PLG es probablemente la estrategia con mejor retorno de inversión que puedes implementar.

¿Necesitas ayuda para diseñar tu estrategia PLG o tu modelo de pricing? En [st4rtup.com](https://st4rtup.com) ofrecemos servicios de consultoría de producto y go-to-market para startups SaaS. [Descubre nuestros servicios](https://st4rtup.com/servicios).
