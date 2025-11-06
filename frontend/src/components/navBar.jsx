import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/navbar.css";

import logoUconnect from "../assets/Logo.svg";
import userIcon from "../assets/user-icon.svg";
import notificationIcon from "../assets/icon-notificacao.svg";

import { getCurrentUser, logout, isAuthenticated } from "../services/api";

function Navbar() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // carrega usuário logado
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!isAuthenticated()) {
          setMe(null);
          return;
        }
        const user = await getCurrentUser();
        if (mounted) setMe(user);
      } catch (e) {
        if (mounted) setMe(null);
        console.error("Erro ao carregar usuário:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    if (loading) return "Carregando…";
    return me?.name || "Usuário";
  }, [loading, me]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <nav className="uconnect-navbar">
      {/* 🔹 Esquerda: Logo (leva para Home) */}
      <div className="navbar-left">
        <Link to="/" className="d-inline-block" title="Início">
          <img
            src={logoUconnect}
            alt="Logo UCONNECT"
            className="navbar-logo"
          />
        </Link>
      </div>

      {/* 🔹 Direita: Usuário, botão e notificação */}
      <div className="navbar-right">
        {/* Botão do curso: navega para o calendário */}
        <Link to="/calendario" className="course-btn" title="Ir para Calendário">
          Análise e Desenvolvimento de Sistemas
        </Link>

        {/* Bloco de usuário: abre perfil; menu simples com sair */}
        <div className="user-info dropdown">
          <Link
            to="/perfil"
            className="d-flex align-items-center text-decoration-none"
            title="Meu perfil"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <img src={userIcon} alt="Usuário" className="user-icon" />
            <span className="username">{displayName}</span>
            <i className="bi bi-caret-down-fill ms-1 small" />
          </Link>

          <ul className="dropdown-menu dropdown-menu-end shadow-sm">
            <li>
              <Link className="dropdown-item" to="/perfil">
                <i className="bi bi-person me-2" />
                Meu perfil
              </Link>
            </li>
            <li>
              <Link className="dropdown-item" to="/configuracoes">
                <i className="bi bi-gear me-2" />
                Configurações
              </Link>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2" />
                Sair
              </button>
            </li>
          </ul>
        </div>

        {/* Sininho: navega para notificações */}
        <Link
          to="/notificacoes"
          className="d-inline-block"
          title="Notificações"
        >
          <img
            src={notificationIcon}
            alt="Notificações"
            className="notification-icon"
          />
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;