"""n8n Monitor — Panel de control para workflows n8n."""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import httpx
from datetime import datetime, timedelta

from app.core.security import get_current_user
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

router = APIRouter()


async def _get_n8n_config(db: AsyncSession) -> dict:
    """Obtener config n8n desde SystemSettings."""
    result = await db.execute(text("SELECT n8n_config FROM system_settings LIMIT 1"))
    row = result.first()
    if not row or not row[0]:
        return {}
    return row[0] if isinstance(row[0], dict) else {}


async def _n8n_request(db: AsyncSession, path: str, method: str = "GET", params: dict = None) -> dict:
    """Hacer request a la API de n8n."""
    config = await _get_n8n_config(db)
    base_url = config.get("base_url", "").rstrip("/")
    api_key = config.get("api_key", "")

    if not base_url or not api_key:
        raise HTTPException(status_code=400, detail="n8n no configurado. Ve a Integraciones > n8n.")

    headers = {"X-N8N-API-KEY": api_key, "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.request(method, f"{base_url}/api/v1{path}", headers=headers, params=params)
            resp.raise_for_status()
            return resp.json()
        except httpx.ConnectError:
            raise HTTPException(status_code=502, detail=f"No se puede conectar a n8n en {base_url}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"n8n error: {e.response.text[:200]}")


@router.get("/health")
async def n8n_health(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Verificar que n8n esta accesible."""
    config = await _get_n8n_config(db)
    base_url = config.get("base_url", "").rstrip("/")
    api_key = config.get("api_key", "")

    if not base_url:
        return {"status": "not_configured", "message": "n8n no configurado"}

    headers = {"X-N8N-API-KEY": api_key, "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{base_url}/api/v1/workflows", headers=headers, params={"limit": 1})
            resp.raise_for_status()
            return {"status": "connected", "url": base_url, "message": "n8n accesible"}
        except Exception as e:
            return {"status": "error", "url": base_url, "message": str(e)[:200]}


@router.get("/workflows")
async def list_workflows(
    active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Listar workflows de n8n."""
    params = {"limit": 100}
    if active is not None:
        params["active"] = str(active).lower()

    data = await _n8n_request(db, "/workflows", params=params)
    workflows = data.get("data", [])

    return {
        "items": [
            {
                "id": w.get("id"),
                "name": w.get("name"),
                "active": w.get("active", False),
                "created_at": w.get("createdAt"),
                "updated_at": w.get("updatedAt"),
                "tags": [t.get("name") for t in w.get("tags", [])],
                "nodes_count": len(w.get("nodes", [])),
            }
            for w in workflows
        ],
        "total": len(workflows),
    }


@router.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Detalle de un workflow."""
    return await _n8n_request(db, f"/workflows/{workflow_id}")


@router.post("/workflows/{workflow_id}/activate")
async def activate_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Activar un workflow."""
    return await _n8n_request(db, f"/workflows/{workflow_id}/activate", method="POST")


@router.post("/workflows/{workflow_id}/deactivate")
async def deactivate_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Desactivar un workflow."""
    return await _n8n_request(db, f"/workflows/{workflow_id}/deactivate", method="POST")


@router.get("/executions")
async def list_executions(
    status: Optional[str] = None,
    workflow_id: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Listar ejecuciones recientes de n8n."""
    params = {"limit": min(limit, 100), "includeData": "false"}
    if status:
        params["status"] = status
    if workflow_id:
        params["workflowId"] = workflow_id

    data = await _n8n_request(db, "/executions", params=params)
    executions = data.get("data", [])

    return {
        "items": [
            {
                "id": e.get("id"),
                "workflow_id": e.get("workflowId"),
                "workflow_name": e.get("workflowData", {}).get("name", "—"),
                "status": e.get("status", "unknown"),
                "started_at": e.get("startedAt"),
                "finished_at": e.get("stoppedAt"),
                "mode": e.get("mode"),
                "retry_of": e.get("retryOf"),
                "retry_success_id": e.get("retrySuccessId"),
            }
            for e in executions
        ],
        "total": len(executions),
    }


@router.get("/executions/{execution_id}")
async def get_execution(
    execution_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Detalle de una ejecucion."""
    return await _n8n_request(db, f"/executions/{execution_id}")


@router.get("/stats")
async def n8n_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Estadisticas agregadas de n8n."""
    # Obtener workflows
    wf_data = await _n8n_request(db, "/workflows", params={"limit": 100})
    workflows = wf_data.get("data", [])

    total_workflows = len(workflows)
    active_workflows = sum(1 for w in workflows if w.get("active"))

    # Obtener ejecuciones recientes (ultimas 24h y 7d)
    exec_data = await _n8n_request(db, "/executions", params={"limit": 100, "includeData": "false"})
    executions = exec_data.get("data", [])

    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)

    execs_24h = []
    execs_7d = []
    for e in executions:
        started = e.get("startedAt", "")
        if started:
            try:
                dt = datetime.fromisoformat(started.replace("Z", "+00:00")).replace(tzinfo=None)
                if dt >= last_24h:
                    execs_24h.append(e)
                if dt >= last_7d:
                    execs_7d.append(e)
            except (ValueError, TypeError):
                pass

    def _calc_stats(execs):
        total = len(execs)
        success = sum(1 for e in execs if e.get("status") == "success")
        error = sum(1 for e in execs if e.get("status") == "error")
        running = sum(1 for e in execs if e.get("status") == "running")
        waiting = sum(1 for e in execs if e.get("status") == "waiting")
        rate = round(success / total * 100, 1) if total > 0 else 0
        return {
            "total": total,
            "success": success,
            "error": error,
            "running": running,
            "waiting": waiting,
            "success_rate": rate,
        }

    # Workflows con mas errores
    error_by_wf = {}
    for e in execs_7d:
        if e.get("status") == "error":
            wf_name = e.get("workflowData", {}).get("name", "Unknown")
            error_by_wf[wf_name] = error_by_wf.get(wf_name, 0) + 1

    top_errors = sorted(error_by_wf.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "workflows": {
            "total": total_workflows,
            "active": active_workflows,
            "inactive": total_workflows - active_workflows,
        },
        "executions_24h": _calc_stats(execs_24h),
        "executions_7d": _calc_stats(execs_7d),
        "top_errors": [{"workflow": name, "count": count} for name, count in top_errors],
    }
