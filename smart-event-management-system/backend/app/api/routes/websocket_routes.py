import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("app.websocket_routes")
router = APIRouter(tags=["WebSocket"])


@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                event_id = msg.get("event_id")

                if action == "subscribe" and event_id:
                    ws_manager.subscribe(websocket, str(event_id))
                    await websocket.send_text(json.dumps({
                        "type": "SUBSCRIPTION_CONFIRMED",
                        "event_id": str(event_id),
                    }))
                elif action == "unsubscribe" and event_id:
                    ws_manager.unsubscribe(websocket, str(event_id))
                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception as e:
                logger.warning(f"[WS] Error processing inbound message: {e}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WS] Unexpected disconnect: {e}")
        ws_manager.disconnect(websocket)
