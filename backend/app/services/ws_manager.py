"""WebSocket connection manager for real-time notifications.

Mantiene un registro de conexiones activas por user_id.
Usado para push instantaneo de: nuevo lead, stage change, email reply, etc.
"""
import logging
import json
from typing import Optional
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Gestiona conexiones WebSocket activas por usuario."""

    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info("WS connected: user %s (%d active)", user_id[:8], len(self._connections[user_id]))

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self._connections:
            self._connections[user_id] = [ws for ws in self._connections[user_id] if ws != websocket]
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.info("WS disconnected: user %s", user_id[:8])

    async def send_to_user(self, user_id: str, event_type: str, data: dict):
        """Envia un evento a todas las conexiones de un usuario."""
        if user_id not in self._connections:
            return

        message = json.dumps({"type": event_type, "data": data})
        dead = []
        for ws in self._connections[user_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        # Cleanup dead connections
        for ws in dead:
            self.disconnect(ws, user_id)

    async def broadcast(self, event_type: str, data: dict):
        """Envia un evento a todos los usuarios conectados."""
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, event_type, data)

    @property
    def active_connections(self) -> int:
        return sum(len(conns) for conns in self._connections.values())


# Singleton
ws_manager = ConnectionManager()
