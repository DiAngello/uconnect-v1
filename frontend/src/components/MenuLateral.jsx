import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/menulateral.css";

// Ícones
import iconLista from "../assets/Lista.svg";
import iconComunicados from "../assets/Comunicados.svg";
import iconCalendario from "../assets/Calendario.svg";
import iconChat from "../assets/Chat.svg";
import iconFeed from "../assets/Feed.svg";

function SideMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  // Descobre qual item deve estar ativo com base na URL atual
  const getActiveFromPath = () => {
    if (location.pathname.startsWith("/calendario")) return "calendario";
    if (location.pathname.startsWith("/comunicados")) return "comunicados";
    if (location.pathname.startsWith("/chat")) return "chat";
    if (location.pathname.startsWith("/feed")) return "feed";
    return "dashboard";
  };

  const activeId = getActiveFromPath();

  const menuItems = [
    { id: "dashboard", icon: iconLista, label: "Dashboard" },
    { id: "feed", icon: iconFeed, label: "Feed" },
    { id: "calendario", icon: iconCalendario, label: "Calendário" },
    { id: "comunicados", icon: iconComunicados, label: "Comunicados" },
    { id: "chat", icon: iconChat, label: "Chat" },
  ];

  const handleClick = (id) => {
    if (id === "chat") navigate("/chat");
    if (id === "comunicados") navigate("/comunicados");
    if (id === "calendario") navigate("/calendario");
    // Quando tiver rotas para esses:
    // if (id === "dashboard") navigate("/dashboard");
    // if (id === "feed") navigate("/feed");
  };

  return (
    <div className="side-menu">
      <ul className="menu-list">
        {menuItems.map((item) => (
          <li
            key={item.id}
            className={`menu-item ${activeId === item.id ? "active" : ""}`}
            onClick={() => handleClick(item.id)}
            title={item.label}
          >
            <img
              src={item.icon}
              alt={item.label}
              className="menu-icon"
            />
            <span className="menu-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SideMenu;