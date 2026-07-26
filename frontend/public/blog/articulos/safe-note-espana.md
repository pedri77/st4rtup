# SAFE note en España: qué es, cómo funciona y cómo adaptarlo al derecho español

El SAFE (Simple Agreement for Future Equity) se ha convertido en el instrumento más utilizado en rondas pre-seed y seed a nivel mundial. Creado por Y Combinator en 2013, permite a una startup captar inversión sin negociar una valoración en el momento, algo que en fases tempranas es casi imposible de determinar con rigor.

En España, el SAFE no tiene regulación específica, pero puede adaptarse al marco jurídico mercantil si se estructura correctamente. Esta guía explica qué es un SAFE, cómo funciona la conversión, y las consideraciones legales para usarlo en una [SL española](/blog/como-crear-una-sl).

## Qué es un SAFE

> **SAFE (Simple Agreement for Future Equity):** contrato entre un inversor y una startup por el cual el inversor entrega capital ahora a cambio del derecho a recibir participaciones en una futura ronda de financiación cualificada, en condiciones preferentes (descuento o cap de valoración). No es deuda, no genera intereses y no tiene fecha de vencimiento.

La clave del SAFE es diferir la discusión de la valoración a un momento en el que haya más datos (la siguiente ronda con inversores profesionales). El inversor asume más riesgo y a cambio obtiene condiciones más favorables en la conversión.

### SAFE vs préstamo convertible (convertible note)

| Criterio | SAFE | Préstamo convertible |
|----------|------|---------------------|
| **Naturaleza jurídica** | Contrato de inversión | Deuda |
| **Intereses** | No | Sí (2-8% anual) |
| **Vencimiento** | No tiene | 12-24 meses típico |
| **Conversión** | En ronda cualificada | En vencimiento o ronda |
| **Complejidad legal** | Baja | Media |
| **Coste para la startup** | Solo el cap/descuento | Cap/descuento + intereses |
| **Riesgo para el inversor** | Mayor (sin fecha límite) | Menor (puede exigir devolución) |
| **Uso en España** | Creciente (post-2020) | Tradicional |
| **Tratamiento contable** | Fondos propios o pasivo (depende) | Pasivo financiero |

Para startups en [fase pre-seed o seed](/blog/pre-seed-seed-serie-a-diferencias), el SAFE es generalmente más favorable: no genera deuda en el balance, no acumula intereses y no tiene un vencimiento que obligue a renegociar o devolver el dinero.

## Mecánicas de conversión del SAFE

El SAFE convierte en participaciones cuando ocurre un evento de conversión (trigger event). Los dos mecanismos principales son el valuation cap y el discount rate.

### Valuation cap (techo de valoración)

El valuation cap establece la valoración máxima a la que el SAFE convertirá, independientemente de la valoración real de la siguiente ronda.

**Ejemplo práctico:**

- Un [business angel](/blog/angel-investor-que-es) invierte 100.000 EUR con un SAFE con cap de 2.000.000 EUR.
- La startup levanta una Serie Seed con valoración pre-money de 5.000.000 EUR.
- El business angel convierte como si la valoración fuera de 2.000.000 EUR (el cap), obteniendo el 5% de la empresa (100K/2M) en lugar del 2% (100K/5M).

El cap protege al inversor temprano: cuanto mejor le vaya a la startup, más participación obtiene por su inversión original.

### Discount rate (tasa de descuento)

El discount aplica un porcentaje de descuento sobre el precio por participación de la siguiente ronda.

**Ejemplo práctico:**

- Un inversor pone 100.000 EUR con SAFE con 20% de descuento.
- En la siguiente ronda, el precio por participación es de 10 EUR.
- El inversor SAFE convierte a 8 EUR por participación (10 EUR x 80%).
- Obtiene 12.500 participaciones en lugar de 10.000.

### Cap + discount combinado

Lo más habitual es que un SAFE incluya ambos mecanismos. En la conversión, se aplica el que resulte más favorable para el inversor.

**Ejemplo con ambos:**

- Inversión SAFE: 100.000 EUR, cap 2M EUR, 20% descuento.
- Ronda siguiente: pre-money 5M EUR, precio por participación 10 EUR.
- Con cap: convierte como si valoración fuera 2M EUR, precio efectivo 4 EUR. Resultado: 25.000 participaciones.
- Con descuento: precio efectivo 8 EUR. Resultado: 12.500 participaciones.
- Se aplica el cap (más favorable para el inversor): 25.000 participaciones.

### MFN (Most Favored Nation)

Algunos SAFEs incluyen una cláusula MFN: si la startup emite SAFEs posteriores con mejores condiciones (cap más bajo, mayor descuento), los SAFEs anteriores se actualizan automáticamente a esas condiciones.

Es una protección para inversores que entran primero. Si la incluyes, ten cuidado con la cadena de SAFEs que emitas después.

## Adaptación del SAFE al derecho español

### El problema jurídico

En España no existe una figura mercantil equivalente al SAFE de Delaware. El derecho societario español (Ley de Sociedades de Capital) no contempla un "acuerdo para equity futuro" como categoría contractual tipificada.

Esto no significa que sea ilegal. Significa que hay que estructurarlo correctamente como contrato atípico dentro del marco del Código Civil y la LSC.

### Opciones de estructuración

**Opción 1: contrato de inversión atípico con obligación de ampliación futura**

El SAFE se redacta como un contrato privado entre el inversor y los socios actuales (no la sociedad, para evitar problemas con la prohibición de asistencia financiera). Los socios se obligan a promover una ampliación de capital en las condiciones pactadas cuando ocurra el evento trigger.

Esta es la opción más utilizada en la práctica española.

**Opción 2: préstamo participativo convertible**

Se estructura como un préstamo participativo (art. 20 del RDL 7/1996) con cláusula de conversión obligatoria. Tiene la ventaja de que el préstamo participativo se considera fondos propios a efectos de la reducción de capital obligatoria (art. 363 LSC).

Inconveniente: técnicamente genera deuda y debería devengar intereses (aunque sean mínimos).

**Opción 3: aportación a cuenta de futura ampliación de capital**

El inversor realiza una aportación que se contabiliza en el patrimonio neto como "aportaciones de socios" (o futuros socios). Requiere que la ampliación se formalice en plazo razonable para no generar problemas contables.

### Consideraciones legales críticas

1. **Escritura pública:** la ampliación de capital cuando se ejecuta la conversión requiere escritura notarial e inscripción en el Registro Mercantil. No basta con un contrato privado.

2. **Derecho de suscripción preferente:** los socios existentes tienen derecho de suscripción preferente en las ampliaciones de capital (art. 304 LSC). Para que el SAFE funcione, este derecho debe ser excluido por la junta de socios con las mayorías reforzadas necesarias, o los socios deben renunciar expresamente en el [pacto de socios](/blog/pacto-socios).

3. **Prohibición de asistencia financiera:** la sociedad no puede financiar la adquisición de sus propias participaciones (art. 143 LSC). Por eso el SAFE debe ser un contrato con los socios, no con la sociedad, o estructurarse como préstamo participativo.

4. **Valoración razonable:** la LIS (Ley del Impuesto sobre Sociedades) exige que las operaciones vinculadas se realicen a valor de mercado. Si la conversión del SAFE resulta en participaciones a precio significativamente inferior al de mercado en ese momento, podría haber implicaciones fiscales.

5. **[Contratos complementarios](/blog/contratos-startups-mas-importantes):** el SAFE debe coordinarse con el pacto de socios, los estatutos y cualquier otro acuerdo de inversión existente. Especialmente las cláusulas de anti-dilución, tag-along y drag-along.

## Estructura de un SAFE para una SL española

### Elementos esenciales del contrato

Un SAFE adaptado al derecho español debe incluir como mínimo:

**1. Partes del contrato**
- Inversor (persona física o jurídica).
- Socios actuales de la SL (no la sociedad como parte contratante principal).
- La sociedad puede adherirse a ciertos compromisos (como facilitar información).

**2. Importe de la inversión**
- Cantidad que el inversor entrega a la sociedad.
- Forma de pago (transferencia bancaria, cuenta escrow).
- Plazo de desembolso.

**3. Eventos de conversión (triggers)**
- **Ronda cualificada:** ampliación de capital de al menos X euros con inversores externos.
- **Cambio de control:** venta de más del 50% del capital.
- **Salida a bolsa (IPO):** poco frecuente en fase temprana.
- **Disolución y liquidación:** qué ocurre si la empresa cierra.

**4. Mecánica de conversión**
- Valuation cap.
- Discount rate.
- Fórmula de cálculo del número de participaciones.
- Quién asume los costes de la ampliación (notario, registro).

**5. Protecciones del inversor**
- Derecho de información (financiera y societaria).
- Compromiso de los socios de no vender participaciones sin consentimiento.
- Cláusula MFN (si procede).
- Compromiso de no emitir más SAFEs por encima de un límite.

**6. Contingencias**
- Qué pasa si no hay ronda cualificada en X años.
- Conversión forzosa a una valoración pre-acordada.
- Derecho de devolución del importe (con o sin intereses).

**7. Ley aplicable y jurisdicción**
- Ley española.
- Jurisdicción de los juzgados mercantiles del domicilio social.

### Modelo de cláusula de conversión

A continuación, una estructura tipo (no sustituye asesoramiento legal):

```
CLÁUSULA X. CONVERSIÓN EN RONDA CUALIFICADA

X.1. Si la Sociedad realiza una ampliación de capital por importe igual o
superior a [IMPORTE] EUR con inversores externos (Ronda Cualificada),
los Socios se obligan a promover y votar favorablemente una ampliación
de capital adicional en la que el Inversor suscribirá participaciones
al precio que resulte más favorable de entre:

   a) El precio por participación de la Ronda Cualificada multiplicado
      por [1 menos el descuento, ej. 0,80 para 20%]; o

   b) El precio por participación que resulte de dividir el Valuation Cap
      ([IMPORTE CAP] EUR) entre el número total de participaciones
      post-ampliación de la Ronda Cualificada.

X.2. El número de participaciones a suscribir por el Inversor será el
resultado de dividir el Importe de la Inversión entre el precio por
participación determinado conforme a X.1.

X.3. Los Socios renuncian expresamente a su derecho de suscripción
preferente respecto de las participaciones que deba suscribir el
Inversor en virtud del presente acuerdo.
```

## Cuándo usar un SAFE (y cuándo no)

### Usar SAFE cuando:

- Estás en [fase pre-seed](/blog/pre-seed-seed-serie-a-diferencias) y no tienes métricas suficientes para justificar una [valoración](/blog/valoracion-startup).
- Necesitas cerrar financiación rápidamente (semanas, no meses).
- El importe es relativamente pequeño (25.000-300.000 EUR).
- Vas a hacer una ronda priced en los próximos 12-18 meses.
- El inversor está familiarizado con el instrumento (business angels, micro-VCs).

### No usar SAFE cuando:

- La ronda es grande (más de 500.000 EUR): mejor hacer una ronda priced directamente.
- No tienes plan realista de hacer una ronda posterior (el SAFE se queda en limbo).
- Los inversores son familiares o amigos no sofisticados que no entienden el riesgo.
- Ya tienes métricas sólidas para justificar una valoración: haz ronda priced y ahorra complejidad futura.
- Tienes muchos SAFEs acumulados sin convertir: cada SAFE adicional diluye más en la conversión y puede ahuyentar a inversores de la siguiente ronda.

## Errores frecuentes con SAFEs en España

### 1. No involucrar a un abogado mercantilista español

Los templates de Y Combinator están pensados para Delaware corporations. Traducirlos literalmente al español sin adaptación jurídica crea contratos inválidos o inejecutables.

### 2. Acumular demasiados SAFEs

Cada SAFE acumula dilución futura. Si has emitido 5 SAFEs por 500.000 EUR antes de tu primera ronda priced, los inversores de esa ronda verán una dilución oculta significativa que puede romper la negociación.

### 3. Cap demasiado alto o demasiado bajo

Un cap de 10M EUR para una startup sin ingresos no protege al inversor. Un cap de 500.000 EUR cuando la startup ya tiene 50.000 EUR MRR infravalora al fundador. El cap debe reflejar la realidad del momento, con un premium razonable por el riesgo temprano.

### 4. No informar a los socios existentes

Si tu SL tiene otros socios, todos deben estar informados y, idealmente, ser parte del contrato SAFE (al menos para renunciar al derecho de suscripción preferente). Un SAFE firmado sin consentimiento de los socios puede ser impugnado.

### 5. Ignorar las implicaciones fiscales

La conversión del SAFE en participaciones puede tener implicaciones en IRPF (para el inversor persona física) o IS (para la sociedad) si el precio de conversión es significativamente diferente al valor razonable de las participaciones en ese momento. Consulta con un asesor fiscal antes de emitir o convertir.

## Preguntas frecuentes

### ¿El SAFE es legal en España?

Sí. No existe una prohibición legal para este tipo de contratos. Se ampara en la libertad contractual del artículo 1.255 del Código Civil. La clave está en estructurarlo correctamente para que sea compatible con la Ley de Sociedades de Capital, especialmente en lo relativo al derecho de suscripción preferente y la prohibición de asistencia financiera.

### ¿Cuánto cuesta preparar un SAFE en España?

Un abogado mercantilista cobra entre 1.500 y 4.000 EUR por redactar un SAFE adaptado al derecho español. Si ya tienes una plantilla validada y solo necesitas adaptarla a los términos concretos de tu ronda, el coste puede bajar a 500-1.500 EUR. No uses plantillas de internet sin validación legal.

### ¿Qué pasa si la startup cierra antes de que el SAFE convierta?

En caso de disolución y liquidación, el inversor SAFE tiene derecho a recuperar su inversión (el importe original) del remanente de la liquidación, con prioridad sobre los socios ordinarios pero subordinado a los acreedores. Si no hay remanente suficiente, pierde total o parcialmente su inversión. Este escenario debe estar expresamente contemplado en el contrato.

### ¿Puedo emitir un SAFE si soy autónomo y no tengo una SL?

No en sentido estricto. El SAFE contempla la entrega futura de participaciones sociales, que solo existen en una sociedad mercantil. Si eres autónomo, primero necesitas [constituir una SL](/blog/como-crear-una-sl) y luego emitir el SAFE. En la práctica, muchos fundadores constituyen la sociedad como parte del proceso de captación de la primera inversión.

### ¿Cuál es el valuation cap típico en España para una startup pre-seed?

Los caps más habituales en España para pre-seed oscilan entre 1.000.000 y 3.000.000 EUR, dependiendo del sector, equipo y tracción inicial. En SaaS B2B con algo de tracción (primeros clientes, LOIs), los caps pueden llegar a 3-5M EUR. Para proyectos sin producto ni ingresos, lo más frecuente es un cap entre 1M y 2M EUR con un descuento del 15-25%.

## Conclusión

El SAFE es un instrumento potente para cerrar inversión rápidamente en fases tempranas. En España, funciona si se adapta correctamente al marco jurídico de la LSC y se cuenta con asesoramiento legal especializado.

**Puntos clave:**

- El SAFE no es deuda: no genera intereses ni tiene vencimiento.
- Los dos mecanismos de conversión son el valuation cap y el discount rate.
- En España, se estructura como contrato atípico entre el inversor y los socios.
- Requiere renuncia al derecho de suscripción preferente de los socios existentes.
- Caps típicos pre-seed en España: 1M-3M EUR.
- No acumular más de 2-3 SAFEs antes de una ronda priced.

¿Necesitas estructurar un SAFE para tu startup? En [st4rtup.com](https://st4rtup.com) te ayudamos con la estrategia de tu ronda de [financiación](/blog/como-financiar-una-startup), desde la elección del instrumento hasta la negociación con inversores. [Conoce nuestros servicios](https://st4rtup.com/servicios).
