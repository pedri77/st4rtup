"""MOD-LINKEDIN-001 — LinkedIn Content Generation Engine.

Motor de generacion de contenido optimizado para LinkedIn.
8 frameworks probados + analisis de engagement potencial.
"""
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Frameworks de escritura LinkedIn ────────────────────────────

FRAMEWORKS = {
    "hook_story_cta": {
        "name": "Hook → Story → CTA",
        "description": "Gancho potente, historia personal/caso real, llamada a la accion",
        "template": (
            "Escribe un post de LinkedIn usando el framework Hook-Story-CTA.\n\n"
            "1. HOOK (primera linea): Frase impactante que detenga el scroll. "
            "Usa datos, preguntas provocativas o afirmaciones contraintuitivas.\n"
            "2. STORY (cuerpo): Historia personal o caso real en 3-5 parrafos cortos. "
            "Usa saltos de linea frecuentes. Cada parrafo = 1-2 frases.\n"
            "3. CTA (final): Pregunta abierta que invite al debate."
        ),
        "example": (
            "El 90% de los founders que conozco cometen el mismo error.\n\n"
            "Pasan 6 meses construyendo el producto perfecto.\n\n"
            "Sin hablar con un solo cliente.\n\n"
            "Yo lo hice en 2024. Perdi 4 meses y 15K EUR.\n\n"
            "Ahora mi regla es simple:\n"
            "→ Semana 1: 20 entrevistas\n"
            "→ Semana 2: MVP feo pero funcional\n"
            "→ Semana 3: Primeros pagos\n\n"
            "¿Cual fue tu error mas caro como founder?"
        ),
        "best_for": ["personal branding", "storytelling", "engagement"],
    },
    "aida": {
        "name": "AIDA (Atencion-Interes-Deseo-Accion)",
        "description": "Framework clasico de copywriting adaptado a LinkedIn",
        "template": (
            "Escribe un post de LinkedIn usando el framework AIDA:\n\n"
            "1. ATENCION: Primera linea que capture atencion inmediata.\n"
            "2. INTERES: Datos o insight que genere curiosidad.\n"
            "3. DESEO: Beneficio concreto o transformacion.\n"
            "4. ACCION: CTA claro (seguir, comentar, visitar)."
        ),
        "example": (
            "Las empresas espanolas pierden 4.200M EUR al ano por ciberataques.\n\n"
            "El 73% no tienen un plan de respuesta a incidentes.\n\n"
            "Con ENS Alto + NIS2, la multa puede ser del 2% de facturacion.\n\n"
            "En Riskitera automatizamos el cumplimiento en 90 dias.\n\n"
            "→ DM para una demo sin compromiso."
        ),
        "best_for": ["ventas", "lead generation", "B2B"],
    },
    "listicle": {
        "name": "Listicle (lista numerada)",
        "description": "Lista de consejos, errores o aprendizajes con formato escaneable",
        "template": (
            "Escribe un post de LinkedIn tipo lista:\n\n"
            "1. Titulo/hook con el numero de items\n"
            "2. Items numerados (5-10), cada uno con emoji + frase corta\n"
            "3. Cierre con reflexion o CTA\n\n"
            "Formato: una idea por linea, usa → o bullet points."
        ),
        "example": (
            "7 herramientas que uso a diario como founder:\n\n"
            "1. Claude Code → desarrollo con IA\n"
            "2. Linear → gestion de producto\n"
            "3. Supabase → backend + auth\n"
            "4. Hetzner → infra soberana EU\n"
            "5. n8n → automatizaciones\n"
            "6. Figma → diseno\n"
            "7. Notion → documentacion\n\n"
            "Coste total: <200 EUR/mes.\n\n"
            "¿Cual anadiriais?"
        ),
        "best_for": ["consejos", "herramientas", "aprendizajes"],
    },
    "contrarian": {
        "name": "Opinion contraria",
        "description": "Desafia una creencia popular del sector para generar debate",
        "template": (
            "Escribe un post de LinkedIn con una opinion contraria:\n\n"
            "1. Abre con una afirmacion provocativa que contradiga la opinion popular\n"
            "2. Argumenta por que la mayoria esta equivocada (3-4 puntos)\n"
            "3. Ofrece tu alternativa basada en experiencia real\n"
            "4. Cierra con pregunta que invite al debate\n\n"
            "Tono: respetuoso pero firme. No buscar confrontacion gratuita."
        ),
        "example": (
            "Unpopular opinion: Las certificaciones ISO 27001 no te protegen.\n\n"
            "Son un checklist. Un documento. Un sello.\n\n"
            "Pero un atacante no lee tu SGSI antes de entrar.\n\n"
            "Lo que realmente protege:\n"
            "→ Deteccion en <15 min\n"
            "→ Respuesta automatizada\n"
            "→ Cultura de seguridad real\n\n"
            "La certificacion es el minimo. No el objetivo.\n\n"
            "¿Estais de acuerdo?"
        ),
        "best_for": ["thought leadership", "debate", "visibilidad"],
    },
    "personal_story": {
        "name": "Historia personal",
        "description": "Experiencia personal con leccion aplicable al negocio",
        "template": (
            "Escribe un post de LinkedIn tipo historia personal:\n\n"
            "1. Empieza con un momento concreto (fecha, lugar, situacion)\n"
            "2. Describe el problema o fracaso con honestidad\n"
            "3. Explica que aprendiste (la leccion)\n"
            "4. Conecta con algo universal que tu audiencia viva\n"
            "5. Cierra con la leccion en una frase memorable\n\n"
            "Tono: vulnerable pero no victimista. Autentico."
        ),
        "example": (
            "En marzo de 2025 nos quedamos sin runway.\n\n"
            "2 meses de caja. 3 personas dependiendo del proyecto.\n\n"
            "Habia dos opciones:\n"
            "A) Buscar inversion (3-6 meses)\n"
            "B) Vender antes de estar listos\n\n"
            "Elegimos B.\n\n"
            "Primera demo: un desastre. Se cayo el backend en directo.\n\n"
            "Pero el cliente dijo: \"Me gusta la vision. ¿Cuando empezamos?\"\n\n"
            "Leccion: Tu MVP nunca estara listo. Pero tu mercado no espera."
        ),
        "best_for": ["autenticidad", "conexion", "founders"],
    },
    "data_driven": {
        "name": "Data-driven insight",
        "description": "Post basado en datos y estadisticas con analisis propio",
        "template": (
            "Escribe un post de LinkedIn basado en datos:\n\n"
            "1. Abre con un dato impactante (fuente incluida)\n"
            "2. Contextualiza: por que importa este dato\n"
            "3. Anade 2-3 datos complementarios\n"
            "4. Tu interpretacion / what it means\n"
            "5. Implicacion practica para tu audiencia\n\n"
            "Incluye fuentes reales o plausibles."
        ),
        "example": (
            "El mercado de ciberseguridad en Espana crecera un 12.4% en 2026 (IDC).\n\n"
            "Pero aqui esta el dato que nadie comenta:\n\n"
            "→ El 67% de ese gasto ira a compliance, no a proteccion real\n"
            "→ Solo el 23% de las pymes tienen un CISO (INCIBE)\n"
            "→ El coste medio de un breach en Espana: 3.6M EUR (IBM)\n\n"
            "Traduccion: Las empresas gastan en papeles, no en defensas.\n\n"
            "La oportunidad esta en quien conecte compliance con proteccion real.\n\n"
            "¿Vuestras empresas invierten en cumplir o en proteger?"
        ),
        "best_for": ["autoridad", "sector", "B2B"],
    },
    "poll": {
        "name": "Pregunta/Encuesta",
        "description": "Post corto con pregunta que genera participacion",
        "template": (
            "Escribe un post de LinkedIn tipo encuesta/pregunta:\n\n"
            "1. Contexto breve (2-3 lineas)\n"
            "2. Pregunta clara con opciones\n"
            "3. Comparte tu propia respuesta primero\n\n"
            "Post corto: maximo 100 palabras. Las polls funcionan mejor breves."
        ),
        "example": (
            "Pregunta seria para founders B2B:\n\n"
            "¿Cual es vuestro canal de captacion principal?\n\n"
            "A) LinkedIn outbound\n"
            "B) Referidos/boca a boca\n"
            "C) SEO/contenido\n"
            "D) Cold email\n\n"
            "Yo: 80% referidos. El mejor marketing es un cliente contento.\n\n"
            "¿Y vosotros?"
        ),
        "best_for": ["engagement", "comunidad", "research"],
    },
    "carousel": {
        "name": "Carousel (guion)",
        "description": "Outline para un carousel de 8-12 slides",
        "template": (
            "Genera el guion de un carousel de LinkedIn (8-12 slides):\n\n"
            "Slide 1: PORTADA — titulo gancho + subtitulo\n"
            "Slides 2-9: una idea por slide, frase corta + visual\n"
            "Slide 10: RESUMEN — los 3 takeaways clave\n"
            "Slide final: CTA + perfil\n\n"
            "Formato: [Slide N] Titulo // Texto (max 20 palabras por slide)\n"
            "Los carousels funcionan mejor con frases muy cortas y directas."
        ),
        "example": (
            "[Slide 1] 5 errores que matan tu startup B2B // Lo que aprendi perdiendo 50K EUR\n"
            "[Slide 2] Error 1: Producto antes que mercado // Construyes sin validar. 4 meses perdidos.\n"
            "[Slide 3] Error 2: Pricing demasiado bajo // Si cobras poco, atraes mal cliente.\n"
            "[Slide 4] Error 3: Ignorar churn // Captar sin retener es llenar un cubo agujereado.\n"
            "[Slide 5] Error 4: Contratar antes de vender // Primero revenue, luego equipo.\n"
            "[Slide 6] Error 5: No medir CAC/LTV // Sin metricas, vuelas a ciegas.\n"
            "[Slide 7] Resumen // Valida → Cobra justo → Retiene → Mide → Escala\n"
            "[Slide 8] CTA // Sigueme para mas contenido de founder real."
        ),
        "best_for": ["educacion", "thought leadership", "viral"],
    },
}

# ─── Best posting times (aggregate data) ────────────────────────

BEST_TIMES = [
    {"day": "martes", "hour": 8, "score": 95, "reason": "Inicio de jornada, maxima atencion"},
    {"day": "martes", "hour": 10, "score": 90, "reason": "Pausa mid-morning"},
    {"day": "miercoles", "hour": 8, "score": 92, "reason": "Dia de maxima actividad LinkedIn"},
    {"day": "miercoles", "hour": 12, "score": 85, "reason": "Pausa almuerzo"},
    {"day": "jueves", "hour": 8, "score": 88, "reason": "Buen engagement pre-viernes"},
    {"day": "jueves", "hour": 17, "score": 82, "reason": "Fin de jornada, scroll mode"},
    {"day": "lunes", "hour": 9, "score": 80, "reason": "Arranque de semana"},
    {"day": "viernes", "hour": 9, "score": 70, "reason": "Menos engagement pero menos competencia"},
]

# ─── Hashtag database ────────────────────────────────────────────

HASHTAG_POOLS = {
    "ciberseguridad": ["Ciberseguridad", "InfoSec", "CyberSecurity", "SOC", "CISO"],
    "compliance": ["ENS", "NIS2", "DORA", "ISO27001", "Compliance", "RGPD"],
    "startup": ["Startup", "Founder", "Emprendimiento", "SaaS", "B2B"],
    "ia": ["IA", "AI", "MachineLearning", "LLM", "GenAI", "ClaudeAI"],
    "ventas": ["Ventas", "Sales", "B2BSales", "Revenue", "Growth"],
    "tech": ["Tech", "SoftwareEngineering", "DevOps", "Cloud", "OpenSource"],
    "liderazgo": ["Liderazgo", "Leadership", "Management", "CEO", "CTO"],
    "productividad": ["Productividad", "Automation", "Efficiency", "RemoteWork"],
}


def _select_hashtags(topic: str, max_tags: int = 5) -> list[str]:
    """Selecciona hashtags relevantes segun el topic."""
    topic_lower = topic.lower()
    selected = []
    for category, tags in HASHTAG_POOLS.items():
        if category in topic_lower or any(t.lower() in topic_lower for t in tags):
            selected.extend(tags[:2])
    if not selected:
        selected = ["B2B", "Startup", "Emprendimiento"]
    return [f"#{t}" for t in selected[:max_tags]]


def _estimate_reading_time(content: str) -> int:
    """Estima tiempo de lectura en segundos."""
    words = len(content.split())
    return max(15, int(words / 3.5))


def _extract_hook(content: str) -> Optional[str]:
    """Extrae la primera linea como hook."""
    lines = [l.strip() for l in content.strip().split("\n") if l.strip()]
    return lines[0] if lines else None


async def generate_linkedin_post(
    topic: str,
    framework: str = "hook_story_cta",
    tone: str = "expert",
    language: str = "es",
    include_hashtags: bool = True,
    include_emoji: bool = True,
    max_words: int = 250,
    context: Optional[str] = None,
) -> dict:
    """Genera un post de LinkedIn usando un framework especifico."""
    fw = FRAMEWORKS.get(framework)
    if not fw:
        return {"generated": False, "error": f"Framework '{framework}' no existe. Disponibles: {list(FRAMEWORKS.keys())}"}

    tone_instructions = {
        "expert": "Tono profesional y autoritario. Habla desde la experiencia.",
        "casual": "Tono cercano y conversacional. Como hablar con un colega.",
        "inspirational": "Tono motivador y positivo. Inspira accion.",
        "provocative": "Tono directo y desafiante. Cuestiona el status quo.",
    }

    lang_instructions = {
        "es": "Escribe en espanol de Espana (no latinoamericano). Usa 'vosotros', no 'ustedes'.",
        "en": "Write in professional English. Target: international B2B audience.",
    }

    emoji_note = "Usa emojis relevantes (→, ✅, 🔐, 📊, 💡, etc.) para mejorar la legibilidad." if include_emoji else "NO uses emojis."
    hashtag_note = "Incluye 3-5 hashtags relevantes al final." if include_hashtags else "NO incluyas hashtags."
    context_note = f"\nContexto adicional del usuario: {context}" if context else ""

    system_prompt = (
        "Eres un experto en contenido de LinkedIn para founders B2B y profesionales de ciberseguridad. "
        "Tu contenido genera engagement real: comentarios, compartidos y conexiones de calidad. "
        "Conoces las mejores practicas del algoritmo de LinkedIn 2026."
    )

    user_prompt = (
        f"{fw['template']}\n\n"
        f"TEMA: {topic}\n"
        f"TONO: {tone_instructions.get(tone, tone_instructions['expert'])}\n"
        f"IDIOMA: {lang_instructions.get(language, lang_instructions['es'])}\n"
        f"LONGITUD: Maximo {max_words} palabras.\n"
        f"{emoji_note}\n"
        f"{hashtag_note}\n"
        f"IMPORTANTE: Usa saltos de linea frecuentes. Parrafos de 1-2 frases maximo. "
        f"LinkedIn penaliza bloques de texto largos.{context_note}"
    )

    try:
        from app.agents.lead_intelligence import _call_llm
        result = await _call_llm(system_prompt, user_prompt)
        content = result.get("content", "")
        if not content:
            return {"generated": False, "error": result.get("error", "Sin respuesta del LLM")}

        hashtags = _select_hashtags(topic) if include_hashtags else []
        hook = _extract_hook(content)
        reading_time = _estimate_reading_time(content)

        return {
            "generated": True,
            "content": content,
            "hook": hook,
            "framework": framework,
            "hashtags": hashtags,
            "estimated_reading_time": reading_time,
            "model": result.get("model"),
        }
    except Exception as e:
        logger.error("Error generando post LinkedIn: %s", e, exc_info=True)
        return {"generated": False, "error": str(e)}


def get_templates() -> list[dict]:
    """Devuelve todos los frameworks/templates disponibles."""
    return [
        {
            "id": key,
            "name": fw["name"],
            "framework": key,
            "description": fw["description"],
            "template": fw["template"],
            "example": fw["example"],
            "best_for": fw["best_for"],
        }
        for key, fw in FRAMEWORKS.items()
    ]


def get_best_times() -> list[dict]:
    """Devuelve los mejores horarios para publicar."""
    return sorted(BEST_TIMES, key=lambda x: x["score"], reverse=True)
