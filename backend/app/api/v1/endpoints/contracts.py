"""Contract management — generación y tracking de contratos/firmas."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.pipeline import Opportunity, Offer

router = APIRouter()


@router.post("/{opportunity_id}/generate")
async def generate_contract(
    opportunity_id: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Genera un contrato PDF basado en la oportunidad y su pricing."""
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    # Build contract markdown
    from datetime import datetime
    now = datetime.now()
    tier_names = {"pilot_poc": "Pilot PoC (90 días)", "enterprise": "Enterprise Anual", "smb": "SMB Mensual"}
    tier = tier_names.get(opp.pricing_tier, opp.pricing_tier or "Standard")
    value = opp.value or 19500
    modules = ", ".join(opp.pricing_modules or ["GRC Core"])

    md = f"""# Contrato de Servicios — St4rtup

**Nº Contrato:** RS-{now.strftime('%Y%m%d')}-{str(opp.id)[:8].upper()}
**Fecha:** {now.strftime('%d/%m/%Y')}

---

## 1. Partes

**PROVEEDOR:** St4rtup
CIF: [CIF St4rtup]
Domicilio: [Domicilio St4rtup]

**CLIENTE:** {opp.name}
CIF: [CIF Cliente]
Domicilio: [Domicilio Cliente]

---

## 2. Objeto del Contrato

St4rtup proporcionará al CLIENTE acceso a la plataforma SaaS de GRC (Governance, Risk & Compliance) en la modalidad **{tier}**, incluyendo los siguientes módulos:

- {modules.replace(', ', chr(10) + '- ')}

---

## 3. Duración

| Concepto | Detalle |
|----------|---------|
| Modalidad | {tier} |
| Fecha inicio | {now.strftime('%d/%m/%Y')} |
| Duración | {'90 días' if opp.pricing_tier == 'pilot_poc' else '12 meses'} |
| Renovación | {'Conversión a anual tras evaluación' if opp.pricing_tier == 'pilot_poc' else 'Automática salvo aviso 30 días antes'} |

---

## 4. Precio y Condiciones de Pago

| Concepto | Importe |
|----------|---------|
| Licencia {tier} | €{value:,.0f} |
| Descuento aplicado | {opp.pricing_discount_pct or 0}% |
| **Total** | **€{value * (1 - (opp.pricing_discount_pct or 0) / 100):,.0f}** |
| Forma de pago | Transferencia bancaria |
| Plazo de pago | 30 días desde factura |

---

## 5. Nivel de Servicio (SLA)

- Disponibilidad plataforma: 99.5%
- Soporte técnico: L-V 9:00-18:00 (CET)
- Tiempo respuesta incidencias críticas: < 4 horas
- Actualizaciones de seguridad: incluidas

---

## 6. Protección de Datos

El tratamiento de datos se realizará conforme al RGPD y la LOPDGDD. Se adjunta como Anexo I el Acuerdo de Encargado de Tratamiento.

---

## 7. Firmas

| PROVEEDOR | CLIENTE |
|-----------|---------|
| St4rtup | {opp.name} |
| Nombre: _________________ | Nombre: _________________ |
| Cargo: _________________ | Cargo: _________________ |
| Firma: _________________ | Firma: _________________ |
| Fecha: {now.strftime('%d/%m/%Y')} | Fecha: _________________ |

---

*Documento generado automáticamente por St4rtup CRM.*
"""

    from app.services.pdf_service import markdown_to_pdf
    pdf_bytes = markdown_to_pdf(md, f"Contrato — {opp.name}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="contrato_{opp.name.replace(" ", "_")}.pdf"'},
    )


@router.get("/{opportunity_id}/status")
async def contract_status(
    opportunity_id: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Estado del contrato de una oportunidad."""
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    # Check offers for this opportunity
    offers = (await db.execute(
        select(Offer).where(Offer.opportunity_id == opportunity_id).order_by(Offer.created_at.desc())
    )).scalars().all()

    return {
        "opportunity_id": str(opportunity_id),
        "opportunity_name": opp.name,
        "stage": opp.stage.value if opp.stage else None,
        "pricing_tier": opp.pricing_tier,
        "value": opp.value,
        "offers": [
            {"id": str(o.id), "status": o.status.value if o.status else None, "created_at": o.created_at.isoformat() if o.created_at else None}
            for o in offers
        ],
        "has_contract": any(o.status and o.status.value == "accepted" for o in offers),
    }
