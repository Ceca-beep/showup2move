from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from app.core.security import get_current_user, decode_token
from app.schemas.activity import MessageCreate
from app.services import chat_service
import json

router = APIRouter(prefix="/chat", tags=["chat"])

_connections: dict[str, list[WebSocket]] = {}

@router.get("/{group_id}/messages")
def get_messages(group_id: str, current_user=Depends(get_current_user)):
    return chat_service.get_group_messages(group_id)

@router.get("/{group_id}/members")
def get_members(group_id: str, current_user=Depends(get_current_user)):
    return chat_service.get_group_members(group_id)

@router.post("/{group_id}/messages")
def post_message(group_id: str, data: MessageCreate, current_user=Depends(get_current_user)):
    return chat_service.save_message(group_id, current_user["id"], data.content)

@router.websocket("/{group_id}/ws")
async def websocket_endpoint(websocket: WebSocket, group_id: str, token: str = Query(...)):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return
    await websocket.accept()
    _connections.setdefault(group_id, []).append(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            content = data.get("content", "").strip()
            if not content:
                continue
            msg = chat_service.save_message(group_id, user_id, content)
            broadcast = json.dumps({"id": msg["id"], "sender_id": user_id, "content": content, "sent_at": msg["sent_at"]})
            dead = []
            for ws in _connections.get(group_id, []):
                try:
                    await ws.send_text(broadcast)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                _connections[group_id].remove(ws)
    except WebSocketDisconnect:
        if group_id in _connections:
            _connections[group_id] = [ws for ws in _connections[group_id] if ws != websocket]