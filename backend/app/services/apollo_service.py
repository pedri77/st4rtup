"""Servicio de enriquecimiento de leads via Apollo.io."""
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.lead import Lead

logger = logging.getLogger(__name__)

APOLLO_BASE_URL = "https://api.apollo.io/v1"


def is_configured() -> bool:
    """Verifica si Apollo.io está configurado."""
    return bool(settings.APOLLO_API_KEY)


async def enrich_lead(db: AsyncSession, lead_id: UUID) -> dict:
    """Enriquece un lead usando Apollo.io People/Organization Enrichment."""
    if not is_configured():
        return {"error": "Apollo API key not configured", "configured": False}

    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        return {"error": "Lead not found"}

    enrichment = {}

    # 1. Organization enrichment (by domain)
    domain = _extract_domain(lead.company_website)
    if domain:
        org_data = await _enrich_organization(domain)
        if org_data and not org_data.get("error"):
            enrichment["organization"] = org_data
            # Update lead fields from org data
            _apply_org_enrichment(lead, org_data)

    # 2. Person enrichment (by email)
    if lead.contact_email:
        person_data = await _enrich_person(lead.contact_email)
        if person_data and not person_data.get("error"):
            enrichment["person"] = person_data
            _apply_person_enrichment(lead, person_data)

    if not enrichment:
        return {
            "error": "No enrichment data found. Provide company_website or contact_email.",
            "enriched": False,
        }

    # Save enrichment data
    lead.enrichment_data = enrichment
    lead.enriched_at = datetime.now(timezone.utc)
    lead.enrichment_source = "apollo"
    await db.commit()
    await db.refresh(lead)

    return {
        "enriched": True,
        "source": "apollo",
        "fields_updated": list(enrichment.keys()),
        "enrichment_data": enrichment,
    }


async def _enrich_organization(domain: str) -> Optional[dict]:
    """Llama a Apollo Organization Enrichment API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{APOLLO_BASE_URL}/organizations/enrich",
                headers={"Content-Type": "application/json"},
                params={
                    "api_key": settings.APOLLO_API_KEY,
                    "domain": domain,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                org = data.get("organization", {})
                return {
                    "name": org.get("name"),
                    "website_url": org.get("website_url"),
                    "industry": org.get("industry"),
                    "estimated_num_employees": org.get("estimated_num_employees"),
                    "annual_revenue": org.get("annual_revenue_printed"),
                    "city": org.get("city"),
                    "state": org.get("state"),
                    "country": org.get("country"),
                    "linkedin_url": org.get("linkedin_url"),
                    "phone": org.get("phone"),
                    "founded_year": org.get("founded_year"),
                    "technologies": org.get("technologies", [])[:10],
                    "keywords": org.get("keywords", [])[:10],
                    "short_description": org.get("short_description"),
                }
            else:
                logger.warning("Apollo org enrichment failed: %s", resp.status_code)
                return {"error": f"API error {resp.status_code}"}
    except Exception as e:
        logger.error("Apollo org enrichment error: %s", str(e))
        return {"error": str(e)}


async def _enrich_person(email: str) -> Optional[dict]:
    """Llama a Apollo People Enrichment API."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{APOLLO_BASE_URL}/people/match",
                headers={"Content-Type": "application/json"},
                json={
                    "api_key": settings.APOLLO_API_KEY,
                    "email": email,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                person = data.get("person", {})
                if not person:
                    return None
                return {
                    "name": person.get("name"),
                    "title": person.get("title"),
                    "linkedin_url": person.get("linkedin_url"),
                    "city": person.get("city"),
                    "country": person.get("country"),
                    "departments": person.get("departments", []),
                    "seniority": person.get("seniority"),
                    "phone_numbers": [
                        p.get("sanitized_number")
                        for p in person.get("phone_numbers", [])
                        if p.get("sanitized_number")
                    ][:3],
                }
            else:
                logger.warning("Apollo person enrichment failed: %s", resp.status_code)
                return {"error": f"API error {resp.status_code}"}
    except Exception as e:
        logger.error("Apollo person enrichment error: %s", str(e))
        return {"error": str(e)}


def _apply_org_enrichment(lead: Lead, org: dict):
    """Aplica datos de organización al lead (solo campos vacíos)."""
    if not lead.company_sector and org.get("industry"):
        lead.company_sector = org["industry"]
    if not lead.company_size and org.get("estimated_num_employees"):
        emp = org["estimated_num_employees"]
        if emp < 50:
            lead.company_size = "1-50"
        elif emp < 200:
            lead.company_size = "51-200"
        elif emp < 1000:
            lead.company_size = "201-1000"
        else:
            lead.company_size = "1000+"
    if not lead.company_revenue and org.get("annual_revenue"):
        lead.company_revenue = org["annual_revenue"]
    if not lead.company_city and org.get("city"):
        lead.company_city = org["city"]
    if not lead.company_country and org.get("country"):
        lead.company_country = org["country"]


def _apply_person_enrichment(lead: Lead, person: dict):
    """Aplica datos de persona al lead (solo campos vacíos)."""
    if not lead.contact_title and person.get("title"):
        lead.contact_title = person["title"]
    if not lead.contact_linkedin and person.get("linkedin_url"):
        lead.contact_linkedin = person["linkedin_url"]
    if not lead.contact_phone and person.get("phone_numbers"):
        lead.contact_phone = person["phone_numbers"][0]


async def search_prospects(
    title_keywords: list[str] | None = None,
    industries: list[str] | None = None,
    employee_ranges: list[str] | None = None,
    countries: list[str] | None = None,
    limit: int = 25,
) -> dict:
    """Busca prospectos en Apollo.io por ICP (Ideal Customer Profile).

    Args:
        title_keywords: Cargos objetivo (CEO, CTO, DPO, Director TI)
        industries: Sectores (financial services, healthcare, government...)
        employee_ranges: Rangos de empleados (51-200, 201-1000, 1001-5000)
        countries: Países ISO (ES, DE, FR, IT, PT)
        limit: Máximo resultados (1-100)
    """
    if not is_configured():
        return {"error": "Apollo API key not configured", "configured": False}

    # Build person search query
    body: dict = {
        "api_key": settings.APOLLO_API_KEY,
        "page": 1,
        "per_page": min(limit, 100),
    }

    if title_keywords:
        body["person_titles"] = title_keywords
    if industries:
        body["organization_industry_tag_ids"] = industries
    if employee_ranges:
        body["organization_num_employees_ranges"] = employee_ranges
    if countries:
        body["person_locations"] = countries

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{APOLLO_BASE_URL}/mixed_people/search",
                headers={"Content-Type": "application/json"},
                json=body,
            )
            if resp.status_code != 200:
                return {"error": f"Apollo API error: {resp.status_code}"}

            data = resp.json()
            people = data.get("people", [])
            prospects = []
            for p in people:
                org = p.get("organization", {})
                prospects.append({
                    "name": p.get("name"),
                    "title": p.get("title"),
                    "email": p.get("email"),
                    "linkedin_url": p.get("linkedin_url"),
                    "city": p.get("city"),
                    "country": p.get("country"),
                    "seniority": p.get("seniority"),
                    "company": org.get("name"),
                    "company_domain": org.get("primary_domain"),
                    "company_industry": org.get("industry"),
                    "company_size": org.get("estimated_num_employees"),
                    "company_country": org.get("country"),
                })

            return {
                "total": data.get("pagination", {}).get("total_entries", 0),
                "prospects": prospects,
            }
    except Exception as e:
        logger.error("Apollo search error: %s", str(e))
        return {"error": str(e)}


async def bulk_enrich_leads(
    db: AsyncSession,
    lead_ids: list[UUID],
) -> dict:
    """Enriquece múltiples leads en batch."""
    results = {"enriched": 0, "failed": 0, "skipped": 0, "details": []}

    for lead_id in lead_ids:
        result = await enrich_lead(db, lead_id)
        if result.get("enriched"):
            results["enriched"] += 1
        elif result.get("error") == "Lead not found":
            results["skipped"] += 1
        else:
            results["failed"] += 1
        results["details"].append({"lead_id": str(lead_id), **result})

    return results


def _extract_domain(url: Optional[str]) -> Optional[str]:
    """Extrae dominio de una URL."""
    if not url:
        return None
    url = url.strip().lower()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.hostname
        if domain and domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return None
