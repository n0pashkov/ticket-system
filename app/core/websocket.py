from typing import Dict, List, Optional, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Активные соединения
        self.active_connections: List[Dict] = []

    async def connect(self, websocket: WebSocket, role_filter: Optional[str] = None):
        """
        Подключение нового клиента WebSocket
        """
        await websocket.accept()
        # Сохраняем соединение с информацией о фильтре
        self.active_connections.append({
            "websocket": websocket,
            "role_filter": role_filter
        })

    def disconnect(self, websocket: WebSocket):
        """
        Отключение клиента WebSocket
        """
        # Находим и удаляем соединение
        for i, connection in enumerate(self.active_connections):
            if connection["websocket"] == websocket:
                self.active_connections.pop(i)
                break

    def update_filter(self, websocket: WebSocket, role_filter: Optional[str]):
        """
        Обновление фильтра по роли для соединения
        """
        for connection in self.active_connections:
            if connection["websocket"] == websocket:
                connection["role_filter"] = role_filter
                break

    async def broadcast(self, message: str, user_role: Optional[str] = None):
        """
        Рассылка сообщения всем подключенным клиентам с учетом фильтра
        """
        disconnected = []

        for connection in self.active_connections:
            websocket = connection["websocket"]
            role_filter = connection["role_filter"]
            
            # Проверяем, соответствует ли сообщение фильтру
            if role_filter is None or user_role is None or role_filter == user_role:
                try:
                    await websocket.send_text(message)
                except Exception:
                    # Если отправка не удалась, помечаем соединение для удаления
                    disconnected.append(websocket)

        # Удаляем отключенные соединения
        for websocket in disconnected:
            self.disconnect(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """
        Отправка сообщения конкретному клиенту
        """
        try:
            await websocket.send_text(message)
        except Exception:
            self.disconnect(websocket) 