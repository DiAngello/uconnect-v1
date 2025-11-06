import { useEffect, useState, useCallback } from "react";
import { getToken } from "../services/api";
import "../styles/notifications.css";

const NotificationToast = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case "chat_message":
        return "bi-chat-dots-fill";
      case "announcement":
        return "bi-megaphone-fill";
      default:
        return "bi-bell-fill";
    }
  };

  const getTitle = () => {
    switch (notification.type) {
      case "chat_message":
        return `Nova mensagem de ${notification.sender_name}`;
      case "announcement":
        return `Novo comunicado: ${notification.title}`;
      default:
        return "Nova notificação";
    }
  };

  return (
    <div className="notification-toast animate-slide-in">
      <div className="notification-header">
        <i className={`bi ${getIcon()} text-primary`}></i>
        <span className="notification-title">{getTitle()}</span>
        <button className="btn-close-notification" onClick={onClose}>
          <i className="bi bi-x"></i>
        </button>
      </div>
      <div className="notification-body">
        {notification.type === "chat_message" && (
          <p>{notification.content}</p>
        )}
        {notification.type === "announcement" && (
          <p>Por {notification.author_name}</p>
        )}
      </div>
    </div>
  );
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const websocket = new WebSocket(
      `ws://localhost:8000/notifications/ws?token=${token}`
    );

    websocket.onopen = () => {
      console.log("WebSocket conectado");
    };

    websocket.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      const id = Date.now() + Math.random();
      
      setNotifications((prev) => [...prev, { ...notification, id }]);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(
          notification.type === "chat_message"
            ? `Nova mensagem de ${notification.sender_name}`
            : `Novo comunicado: ${notification.title}`,
          {
            body:
              notification.type === "chat_message"
                ? notification.content
                : `Por ${notification.author_name}`,
            icon: "/logo192.png",
          }
        );
      }
    };

    websocket.onerror = (error) => {
      console.error("Erro no WebSocket:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket desconectado");
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <>
      {children}
      <div className="notification-container">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </>
  );
};

export default NotificationProvider;
