"""tawk.to integration — live chat widget + webhook handler."""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.lead import Lead

logger = logging.getLogger(__name__)


async def handle_webhook(db: AsyncSession, payload: dict) -> dict:
    """Procesa webhook de tawk.to — crea lead si es nuevo contacto."""
    payload.get("event", "")
    visitor = payload.get("visitor", {})
    message = payload.get("message", {})

    email = visitor.get("email", "")
    name = visitor.get("name", "")
    city = visitor.get("city", "")

    if not email:
        return {"action": "ignored", "reason": "no_email"}

    # Check if lead exists
    existing = await db.scalar(select(Lead).where(Lead.contact_email == email))
    if existing:
        return {"action": "existing_lead", "lead_id": str(existing.id)}

    # Create new lead from chat
    lead = Lead(
        company_name=name or "Chat visitor",
        contact_name=name,
        contact_email=email,
        company_city=city,
        acquisition_channel="tawkto",
        notes=f"Lead desde tawk.to chat. Mensaje: {message.get('text', '')[:200]}",
        score=15,
    )
    db.add(lead)
    await db.commit()

    return {"action": "lead_created", "lead_id": str(lead.id), "email": email}


def get_widget_script(property_id: str, widget_id: str = "default") -> str:
    """Genera el script de tawk.to para embed."""
    return f"""<!--Start of Tawk.to Script-->
<script type="text/javascript">
var Tawk_API=Tawk_API||{{}}, Tawk_LoadStart=new Date();
(function(){{
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/{property_id}/{widget_id}';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
}})();
</script>
<!--End of Tawk.to Script-->"""
