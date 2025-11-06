# backend/app/routers/notifications.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Dict, Set
import json
from datetime import datetime
from .. import models
from ..db import get_db
from ..utils import decode_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def broadcast_to_users(self, message: dict, user_ids: list):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008)
        return
    
    user_registration = payload.get("sub")
    user = db.query(models.User).filter(models.User.registration == user_registration).first()
    
    if not user:
        await websocket.close(code=1008)
        return
    
    await manager.connect(websocket, user.id)
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)

async def notify_new_message(chat_id: int, sender_id: int, content: str, db: Session):
    conversation = db.query(models.Conversation).filter(models.Conversation.id == chat_id).first()
    if not conversation:
        return
    
    recipient_ids = [p.id for p in conversation.participants if p.id != sender_id]
    sender = db.query(models.User).filter(models.User.id == sender_id).first()
    
    notification = {
        "type": "chat_message",
        "chat_id": chat_id,
        "sender_name": sender.name if sender else "Usuário",
        "content": content[:50] + "..." if len(content) > 50 else content,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.broadcast_to_users(notification, recipient_ids)

async def notify_new_announcement(post_id: int, title: str, author_name: str, db: Session):
    users = db.query(models.User).filter(models.User.accessStatus == models.AccessStatus.active).all()
    user_ids = [u.id for u in users]
    
    notification = {
        "type": "announcement",
        "post_id": post_id,
        "title": title,
        "author_name": author_name,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.broadcast_to_users(notification, user_ids)
