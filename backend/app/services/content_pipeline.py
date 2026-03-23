"""
Pipeline de contenido con 4 agentes IA (SEO Senior Level):
1. Keyword Agent — research profundo con clustering semántico
2. Draft Agent — redacción con estructura SEO avanzada
3. SEO Agent — optimización on-page completa
4. Meta Agent — meta tags, schema, OG, distribución
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def _call_llm(system: str, prompt: str, provider: str = None, model: str = None) -> dict:
    """Wrapper LLM call — usa provider/model específico o fallback por defecto."""
    if provider:
        from app.services.ai_chat_service import AIChatService
        service = AIChatService()
        return await service.chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=system,
            provider=provider,
            model=model,
        )
    # Fallback: cadena vLLM → Mistral → OpenAI
    from app.agents.lead_intelligence import _call_llm as llm_call
    return await llm_call(system, prompt)


async def agent_keywords(topic: str, target_audience: str = "founders, CTOs y growth managers de startups", provider: str = None, model: str = None) -> dict:
    """Agente 1: Research de keywords con clustering semántico y análisis de intención."""
    result = await _call_llm(
        "Eres un SEO strategist senior con 10+ años en B2B SaaS para startups. "
        "Dominas keyword research semántico, topic clustering y análisis de intención de búsqueda. "
        "Tu enfoque es data-driven y orientado a capturar tráfico cualificado que convierte.",

        f"""Realiza un keyword research completo para un artículo sobre: {topic}
Audiencia objetivo: {target_audience}
Sector: Startup growth & ventas B2B — mercado español y europeo.

Necesito que devuelvas EXACTAMENTE esta estructura:

## 1. PRIMARY KEYWORD
- Keyword principal (la que tiene mayor volumen + relevancia + viabilidad de ranking)
- Volumen estimado mensual en España
- Dificultad estimada (0-100)
- Intención de búsqueda: informational / commercial investigation / transactional

## 2. KEYWORD CLUSTER (8-12 keywords secundarias)
Agrupa por intención semántica:
- Cluster informacional (qué es, cómo funciona, guía de...)
- Cluster comparativo (vs, alternativas, mejor...)
- Cluster transaccional (precio, demo, contratar...)
- Cluster long-tail (preguntas específicas tipo "People Also Ask")

Para cada keyword indica: keyword | intención | dificultad estimada

## 3. PREGUNTAS PAA (People Also Ask)
Lista 5-8 preguntas reales que los usuarios buscan relacionadas con el tema.
Estas se usarán como H2/H3 en el artículo para capturar featured snippets.

## 4. ENTIDADES SEMÁNTICAS
Lista 10-15 entidades/conceptos relacionados que Google espera encontrar en un artículo
autoritative sobre este tema (metodologías, herramientas, tecnologías, organizaciones).
Ejemplo: Product-Led Growth, ABM, SaaS metrics, CAC, LTV, Series A, MRR, churn, etc.

## 5. COMPETENCIA SERP
Describe qué tipo de contenido rankea actualmente para la keyword principal:
- Tipo de contenido (guía, listado, comparativa, tutorial)
- Longitud media estimada
- Ángulo diferenciador que St4rtup puede explotar

## 6. ESTRATEGIA DE CONTENIDO
Recomienda:
- Tipo de artículo óptimo (guía definitiva, checklist, caso de estudio, comparativa)
- Longitud recomendada (palabras)
- Formato ideal (texto, texto+infografía, texto+vídeo)
- Ángulo único para St4rtup (posicionamiento como CRM integral para startups)
""",
        provider=provider, model=model,
    )
    return {"agent": "keywords", "output": result.get("content", ""), "model": result.get("model")}


async def agent_draft(topic: str, keywords: str, word_count: int = 1500, provider: str = None, model: str = None) -> dict:
    """Agente 2: Redacción profesional con estructura SEO avanzada."""
    result = await _call_llm(
        "Eres un copywriter SEO senior especializado en contenido B2B para startups. "
        "Escribes para St4rtup, una plataforma CRM que ayuda a startups con "
        "ventas, marketing y crecimiento. "
        "Tu contenido rankea en primera página porque combinas profundidad técnica con "
        "legibilidad, estructura impecable y señales E-E-A-T (Experience, Expertise, "
        "Authoritativeness, Trustworthiness).",

        f"""Escribe un artículo de {word_count} palabras sobre: {topic}

RESEARCH DE KEYWORDS (del agente anterior):
{keywords}

═══════════════════════════════════════════════
INSTRUCCIONES DE ESTRUCTURA (OBLIGATORIAS):
═══════════════════════════════════════════════

### TÍTULO (H1)
- Incluye la keyword principal en las primeras 5 palabras
- Máximo 65 caracteres
- Usa un power word (Guía, Definitiva, Completa, Cómo, Todo sobre)
- Formato: [Power word]: [Keyword] + [Beneficio/Año]
- Ejemplo: "Guía Definitiva: Estrategias de Ventas B2B para Startups en 2026"

### INTRODUCCIÓN (150-200 palabras)
- Hook en la primera frase: dato impactante, pregunta retórica o pain point
- Keyword principal en las primeras 100 palabras (natural, no forzado)
- Contexto del problema que resuelve el artículo
- Promesa clara de lo que el lector aprenderá
- Mini-índice con lo que se va a cubrir (bullet points)
- NO uses frases genéricas tipo "En este artículo vamos a..."

### CUERPO
- H2 cada 200-300 palabras (incluir keyword secundaria o variación en cada H2)
- H3 para subsecciones dentro de cada H2
- Al menos 1 H2 debe ser una pregunta del PAA (People Also Ask)
- Párrafos de máximo 3 líneas (legibilidad móvil)
- Usa bullet points o listas numeradas cada 300-400 palabras
- Incluye al menos 1 tabla comparativa o de datos
- Incluye al menos 1 cita textual o dato con fuente
- Usa negritas para keywords y conceptos clave (2-3 por párrafo máximo)
- Transiciones naturales entre secciones

### SEÑALES E-E-A-T
- Menciona experiencia práctica ("en nuestra experiencia con clientes del sector...")
- Referencia fuentes oficiales y datos de mercado con precisión
- Incluye datos cuantitativos (porcentajes, métricas, benchmarks)
- Usa terminología del sector correctamente

### ENLACES INTERNOS SUGERIDOS
Indica entre corchetes [ENLACE INTERNO: descripción de la página de destino] donde
debería ir un enlace interno a otras páginas de st4rtup.app:
- Página de producto/solución relevante
- Artículos relacionados del blog
- Página de demo/contacto
- Calculadora ROI o herramientas

### CALL TO ACTION
- CTA intermedio (soft) a mitad del artículo: invitar a descargar un recurso o ver demo
- CTA final (hard): acción concreta (solicitar demo, contactar, descargar whitepaper)
- El CTA debe sentirse como paso lógico natural, no como venta agresiva

### CONCLUSIÓN (100-150 palabras)
- Resumen de los 3-5 puntos clave (bullet points)
- Keyword principal mencionada de forma natural
- Proyección a futuro o next step claro
- CTA final

### FORMATO MARKDOWN
- Usa # para H1, ## para H2, ### para H3
- **negrita** para keywords y conceptos clave
- Listas con - para bullet points
- Tablas con | sintaxis markdown |
- > para citas o datos destacados

### LO QUE NO DEBES HACER
- No uses relleno ni frases vacías
- No repitas la misma idea con diferentes palabras
- No uses jerga innecesaria sin explicar
- No hagas keyword stuffing (densidad natural 1-2%)
- No uses IA-speak: "en el panorama actual", "es importante destacar", "en conclusión"
- No uses emojis
""",
        provider=provider, model=model,
    )
    return {"agent": "draft", "output": result.get("content", ""), "model": result.get("model")}


async def agent_seo(draft: str, primary_keyword: str, provider: str = None, model: str = None) -> dict:
    """Agente 3: Auditoría y optimización SEO on-page completa."""
    result = await _call_llm(
        "Eres un consultor SEO técnico senior. Auditas y optimizas contenido para "
        "alcanzar primera página en Google.es. Conoces las últimas actualizaciones del "
        "algoritmo (Helpful Content, E-E-A-T, spam update). Tu trabajo es quirúrgico: "
        "mejoras sin destruir la calidad editorial.",

        f"""Audita y optimiza este artículo para la keyword principal: '{primary_keyword}'

ARTÍCULO:
{draft[:6000]}

═══════════════════════════════════════════════
DEVUELVE DOS SECCIONES:
═══════════════════════════════════════════════

## SECCIÓN 1: ARTÍCULO OPTIMIZADO

Devuelve el artículo completo con estas optimizaciones aplicadas:

### Keyword Placement (verificar y corregir):
- [ ] Keyword en H1 (primeras 5 palabras)
- [ ] Keyword en primer párrafo (primeras 100 palabras)
- [ ] Keyword en al menos 2 H2s (variaciones naturales)
- [ ] Keyword en último párrafo / conclusión
- [ ] Keyword en alt text sugerido para imágenes
- [ ] Densidad global 1-1.5% (ni más ni menos)

### Estructura de headings:
- [ ] Solo 1 H1
- [ ] H2s descriptivos con keyword secundaria
- [ ] H3s donde haya subsecciones
- [ ] Jerarquía lógica (no saltar de H2 a H4)
- [ ] Al menos 1 H2 como pregunta (para featured snippet)

### Legibilidad:
- [ ] Párrafos máximo 3 líneas
- [ ] Frases máximo 20-25 palabras
- [ ] Nivel de lectura: profesional pero accesible (Flesch ~60)
- [ ] Conectores de transición entre secciones
- [ ] Variedad en la longitud de frases

### Señales de calidad:
- [ ] Al menos 3 datos cuantitativos con fuente
- [ ] Al menos 1 tabla o lista estructurada
- [ ] Contenido original (no genérico)
- [ ] Responde search intent completamente

---

## SECCIÓN 2: INFORME SEO

### Checklist On-Page
| Elemento | Estado | Nota |
|----------|--------|------|
| Keyword en H1 | ✅/❌ | detalle |
| Keyword en intro | ✅/❌ | detalle |
| Keyword density | X.X% | ideal 1-1.5% |
| H2 count | N | ideal 4-8 para {len(draft.split())} palabras |
| Internal links sugeridos | N | mínimo 3 |
| External links sugeridos | N | mínimo 1-2 autoridades |
| Imágenes sugeridas | N | con alt text propuesto |
| Longitud | N palabras | vs competencia |

### Internal Links Recomendados
Lista 3-5 enlaces internos con:
- Anchor text exacto
- URL de destino sugerida en st4rtup.app
- Dónde insertarlo en el artículo (en qué H2/párrafo)

### External Links Recomendados
Lista 2-3 enlaces a fuentes autoritativas:
- Fuentes oficiales, estudios de mercado, informes de referencia
- Anchor text y URL

### Schema Markup Recomendado
Sugiere el tipo de schema más apropiado:
- Article / BlogPosting / TechArticle / HowTo / FAQ
- Propiedades clave a incluir

### SEO Score: X/100
Desglose:
- Keyword optimization: /25
- Content quality: /25
- Structure & readability: /25
- E-E-A-T signals: /25
""",
        provider=provider, model=model,
    )
    return {"agent": "seo", "output": result.get("content", ""), "model": result.get("model")}


async def agent_meta(article: str, primary_keyword: str, provider: str = None, model: str = None) -> dict:
    """Agente 4: Meta tags, OG, schema JSON-LD y plan de distribución."""
    result = await _call_llm(
        "Eres un especialista en SEO técnico y distribución de contenido. "
        "Generas meta tags que maximizan CTR en SERPs y OG tags que optimizan "
        "compartibilidad en redes sociales.",

        f"""Genera todos los meta tags y plan de distribución para este artículo.
Keyword principal: '{primary_keyword}'

ARTÍCULO (resumen):
{article[:3000]}

═══════════════════════════════════════════════
DEVUELVE EXACTAMENTE:
═══════════════════════════════════════════════

## 1. TITLE TAG
- Versión principal (máx 60 chars) — keyword al inicio + power word + marca
- Versión alternativa A/B para testing
- Regla: [Keyword]: [Beneficio] | St4rtup

## 2. META DESCRIPTION
- Versión principal (máx 155 chars) — incluir keyword, beneficio, CTA implícito
- Versión alternativa A/B
- Debe provocar el clic: usa números, pregunta retórica o promesa concreta

## 3. URL / SLUG
- Slug optimizado (3-5 palabras, keyword incluida, sin stop words)
- Canonical URL completa: https://st4rtup.app/blog/[slug]

## 4. OPEN GRAPH TAGS
```
og:title — (puede ser diferente al title tag, más engaging para redes)
og:description — (más conversacional que meta description)
og:type — article
og:image — descripción detallada de la imagen ideal (para que diseño la cree)
og:image:alt — alt text de la imagen OG
```

## 5. TWITTER CARD
```
twitter:card — summary_large_image
twitter:title — (optimizado para Twitter, más directo)
twitter:description — (máx 200 chars)
```

## 6. SCHEMA JSON-LD
Genera el JSON-LD completo listo para copiar/pegar:
- @type: Article o BlogPosting
- headline, description, author, publisher, datePublished
- image (placeholder URL)
- Si aplica: FAQ schema con 3-5 preguntas del artículo

## 7. PLAN DE DISTRIBUCIÓN
Para cada canal, genera el copy específico listo para publicar:

### LinkedIn Post (máx 1300 chars)
- Hook en primera línea (antes del "ver más")
- 3-5 bullet points con valor
- CTA al artículo
- 3-5 hashtags relevantes

### Twitter/X (hilo de 3-5 tweets)
- Tweet 1: hook + link
- Tweets 2-4: puntos clave del artículo
- Tweet final: CTA + hashtags

### Email Newsletter Snippet
- Subject line (A/B: 2 versiones)
- Preview text (40-90 chars)
- Cuerpo: 3 párrafos + CTA button text

### WhatsApp / Telegram
- Mensaje corto (2-3 líneas) para compartir en grupos profesionales
""",
        provider=provider, model=model,
    )
    return {"agent": "meta", "output": result.get("content", ""), "model": result.get("model")}


async def run_full_pipeline(topic: str, target_audience: str = "", word_count: int = 1500, provider: str = None, model: str = None) -> dict:
    """Ejecuta el pipeline completo de 4 agentes en secuencia."""
    results = {}

    # Step 1: Keywords
    kw_result = await agent_keywords(topic, target_audience or "founders, CTOs y growth managers de startups", provider=provider, model=model)
    results["keywords"] = kw_result

    # Step 2: Draft (recibe keywords completos)
    draft_result = await agent_draft(topic, kw_result["output"], word_count, provider=provider, model=model)
    results["draft"] = draft_result

    # Extract primary keyword from topic as fallback
    primary_kw = topic

    # Step 3: SEO optimization
    seo_result = await agent_seo(draft_result["output"], primary_kw, provider=provider, model=model)
    results["seo_optimized"] = seo_result["output"]
    results["seo"] = seo_result

    # Step 4: Meta + distribution
    meta_result = await agent_meta(seo_result["output"], primary_kw, provider=provider, model=model)
    results["meta"] = meta_result

    return {
        "topic": topic,
        "keywords": kw_result["output"],
        "draft": draft_result["output"],
        "seo_optimized": seo_result["output"],
        "meta": meta_result["output"],
        "stages": results,
        "status": "completed",
    }
