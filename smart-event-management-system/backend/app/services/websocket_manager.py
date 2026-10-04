import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger("app.websocket_manager")


class WebSocketManager:
    def __init__(self):
        # Map connection -> set of subscribed event IDs
        self.active_connections: Set[WebSocket] = set()
        # Map event_id -> set of WebSockets
        self.event_subscribers: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[WS] Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        for event_id, subscribers in list(self.event_subscribers.items()):
            subscribers.discard(websocket)
            if not subscribers:
                self.event_subscribers.pop(event_id, None)
        logger.info(f"[WS] Client disconnected. Total active: {len(self.active_connections)}")

    def subscribe(self, websocket: WebSocket, event_id: str):
        eid = str(event_id)
        if eid not in self.event_subscribers:
            self.event_subscribers[eid] = set()
        self.event_subscribers[eid].add(websocket)
        logger.info(f"[WS] Client subscribed to event {eid}")

    def unsubscribe(self, websocket: WebSocket, event_id: str):
        eid = str(event_id)
        if eid in self.event_subscribers:
            self.event_subscribers[eid].discard(websocket)
            if not self.event_subscribers[eid]:
                del self.event_subscribers[eid]

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        if not self.active_connections:
            return
        payload = json.dumps(message)
        dead = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"[WS] Send failed, marking client dead: {e}")
                dead.append(connection)
        for d in dead:
            self.disconnect(d)

    async def broadcast_to_event(self, event_id: str, message: dict):
        """Broadcast message to clients subscribed to a specific event as well as globally."""
        eid = str(event_id)
        message["event_id"] = eid
        # Send globally so dashboards and event lists update as well
        await self.broadcast(message)


ws_manager = WebSocketManager()


def notify_clients_sync(message: dict, event_id: str = None):
    """
    Helper function to safely dispatch broadcast from synchronous FastAPI endpoints
    using the running asyncio event loop.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            if event_id:
                asyncio.create_task(ws_manager.broadcast_to_event(str(event_id), message))
            else:
                asyncio.create_task(ws_manager.broadcast(message))
        else:
            if event_id:
                loop.run_until_complete(ws_manager.broadcast_to_event(str(event_id), message))
            else:
                loop.run_until_complete(ws_manager.broadcast(message))
    except Exception as e:
        logger.warning(f"[WS] Could not dispatch async broadcast: {e}")
