"""
Automated cost collection from provider APIs.
Runs periodically (via n8n or cron) to update platform_costs with real spend.
"""
import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)
TIMEOUT = 15.0


async def collect_all_costs() -> dict:
    """Collect costs from all configured providers. Returns summary."""
    results = {}

    # OpenAI
    if getattr(settings, 'OPENAI_API_KEY', ''):
        results['openai'] = await _collect_openai()

    # DeepSeek
    if getattr(settings, 'DEEPSEEK_API_KEY', ''):
        results['deepseek'] = await _collect_deepseek()

    # Fly.io
    results['flyio'] = await _collect_flyio()

    # Supabase
    results['supabase'] = await _collect_supabase()

    # fal.ai
    if getattr(settings, 'FAL_KEY', ''):
        results['falai'] = await _collect_falai()

    return results


async def _collect_openai() -> dict:
    """OpenAI usage API — last 30 days spend."""
    try:
        api_key = settings.OPENAI_API_KEY
        today = datetime.utcnow()
        start = (today - timedelta(days=30)).strftime('%Y-%m-%d')
        end = today.strftime('%Y-%m-%d')

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            # Organization usage endpoint
            r = await client.get(
                f"https://api.openai.com/v1/usage?date={start}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if r.status_code == 200:
                data = r.json()
                # Calculate total cost from usage
                total_tokens = sum(d.get('n_context_tokens_total', 0) + d.get('n_generated_tokens_total', 0) for d in data.get('data', []))
                # Rough estimate: $2/1M tokens average
                est_cost = (total_tokens / 1_000_000) * 2
                return {"status": "ok", "cost_usd": round(est_cost, 4), "cost_eur": round(est_cost * 0.92, 4), "tokens": total_tokens, "period": f"{start} to {end}"}

            # Try billing endpoint (newer)
            r2 = await client.get(
                f"https://api.openai.com/dashboard/billing/usage?start_date={start}&end_date={end}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if r2.status_code == 200:
                data = r2.json()
                total_usd = data.get('total_usage', 0) / 100  # cents to dollars
                return {"status": "ok", "cost_usd": round(total_usd, 2), "cost_eur": round(total_usd * 0.92, 2)}

        return {"status": "error", "message": "Could not fetch usage"}
    except Exception as e:
        return {"status": "error", "message": str(e)[:200]}


async def _collect_deepseek() -> dict:
    """DeepSeek balance API."""
    try:
        api_key = settings.DEEPSEEK_API_KEY
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://api.deepseek.com/user/balance",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if r.status_code == 200:
                data = r.json()
                balances = data.get('balance_infos', [])
                total_usd = sum(float(b.get('total_balance', 0)) for b in balances)
                return {"status": "ok", "balance_usd": round(total_usd, 2), "balance_eur": round(total_usd * 0.92, 2), "raw": balances}
        return {"status": "error", "message": "Could not fetch balance"}
    except Exception as e:
        return {"status": "error", "message": str(e)[:200]}


async def _collect_flyio() -> dict:
    """Fly.io billing via CLI token."""
    try:
        fly_token = getattr(settings, 'FLY_API_TOKEN', '')
        if not fly_token:
            return {"status": "skipped", "message": "No FLY_API_TOKEN"}

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            # Get current month's invoice
            r = await client.get(
                "https://api.fly.io/graphql",
                headers={"Authorization": f"Bearer {fly_token}", "Content-Type": "application/json"},
            )
            # Fly.io uses GraphQL — simplified query
            r2 = await client.post(
                "https://api.fly.io/graphql",
                headers={"Authorization": f"Bearer {fly_token}", "Content-Type": "application/json"},
                json={"query": "{ currentUser { email organizations { nodes { slug currentBillingPeriod { startDate endDate } } } } }"},
            )
            if r2.status_code == 200:
                return {"status": "ok", "data": r2.json().get('data', {})}

        return {"status": "error", "message": "Could not fetch Fly billing"}
    except Exception as e:
        return {"status": "error", "message": str(e)[:200]}


async def _collect_supabase() -> dict:
    """Supabase project usage."""
    try:
        supabase_key = getattr(settings, 'SUPABASE_SERVICE_KEY', '') or getattr(settings, 'SUPABASE_ANON_KEY', '')
        supabase_url = getattr(settings, 'SUPABASE_URL', '')
        if not supabase_url:
            return {"status": "skipped", "message": "No SUPABASE_URL"}

        # Extract project ref from URL
        ref = supabase_url.replace('https://', '').split('.')[0]
        return {"status": "ok", "project_ref": ref, "plan": "pro", "cost_eur": 25.0, "note": "Fixed Pro plan cost. DB usage via Supabase dashboard."}
    except Exception as e:
        return {"status": "error", "message": str(e)[:200]}


async def _collect_falai() -> dict:
    """fal.ai credits balance."""
    try:
        fal_key = settings.FAL_KEY
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                "https://rest.fal.ai/billing/balance",
                headers={"Authorization": f"Key {fal_key}"},
            )
            if r.status_code == 200:
                data = r.json()
                return {"status": "ok", "balance": data}
        return {"status": "error", "message": "Could not fetch fal.ai balance"}
    except Exception as e:
        return {"status": "error", "message": str(e)[:200]}
