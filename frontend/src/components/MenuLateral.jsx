import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/menulateral.css";

// 🔹 importe seus SVGs (mantive todos exatamente como estavam)
import iconLista from "../assets/Lista.svg";
import iconComunicados from "../assets/Comunicados.svg";
import iconCalendario from "../assets/Calendario.svg";
import iconChat from "../assets/Chat.svg";
import iconFeed from "../assets/Feed.svg";

function SideMenu() {
  const [active, setActive] = useState("calendar");
  const navigate = useNavigate(); // ✅ hook para navegação SPA

  const menuItems = [
    { id: "dashboard", icon: iconLista },
    { id: "feed", icon: iconFeed },
    { id: "calendario", icon: iconCalendario },
    { id: "comunicados", icon: iconComunicados },
    { id: "chat", icon: iconChat },
  ];


  //Navegação do menu lateral
  const handleClick = (id) => {
    setActive(id);
    if (id === "chat") {
      navigate("/chat"); 
    }
    if (id === "comunicados") {
      navigate("/comunicados"); 
    }
  };

  return (
    <div className="side-menu">
      <ul className="menu-list">
        {menuItems.map((item) => (
          <li
            key={item.id}
            className={`menu-item ${active === item.id ? "active" : ""}`}
            onClick={() => handleClick(item.id)}
          >
            <img src={item.icon} alt={item.id} className="menu-icon" />
            <span className="menu-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SideMenu;