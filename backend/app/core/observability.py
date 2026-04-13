"""Request latency observability middleware.

Tracks p50/p95/p99 latencies per endpoint in-memory (no external deps).
Exposes metrics via GET /metrics.
"""
import time
import statistics
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Per-route latency buffers (last 1000 requests each)
_latencies: dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
_request_counts: dict[str, int] = defaultdict(int)
_error_counts: dict[str, int] = defaultdict(int)


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000

        # Normalize route (strip query params and UUIDs for grouping)
        path = request.url.path
        # Skip static/docs paths
        if path in ("/docs", "/redoc", "/openapi.json", "/ready", "/favicon.ico"):
            return response

        _latencies[path].append(elapsed_ms)
        _request_counts[path] += 1
        if response.status_code >= 500:
            _error_counts[path] += 1

        return response


def get_metrics() -> dict:
    """Compute percentile metrics for all tracked routes."""
    routes = {}
    for path, latencies in _latencies.items():
        if len(latencies) < 2:
            continue
        data = sorted(latencies)
        routes[path] = {
            "count": _request_counts.get(path, 0),
            "errors": _error_counts.get(path, 0),
            "p50_ms": round(statistics.median(data), 1),
            "p95_ms": round(data[int(len(data) * 0.95)], 1),
            "p99_ms": round(data[int(len(data) * 0.99)], 1),
            "avg_ms": round(statistics.mean(data), 1),
        }

    # Sort by request count descending
    sorted_routes = dict(sorted(routes.items(), key=lambda x: x[1]["count"], reverse=True))

    return {
        "total_routes": len(sorted_routes),
        "total_requests": sum(_request_counts.values()),
        "total_errors": sum(_error_counts.values()),
        "routes": sorted_routes,
    }
