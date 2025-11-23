import { useState, useEffect, useCallback } from "react";
import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { getPosts, getAnnouncements } from "../services/api";

export default function Notificacoes() {
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("todas");

  const carregarNotificacoes = useCallback(async () => {
    try {
      setLoading(true);
      const [posts, avisos] = await Promise.all([
        getPosts(),
        getAnnouncements(),
      ]);

      // Recupera lista de IDs lidos do LocalStorage
      const lidasSalvas = JSON.parse(
        localStorage.getItem("notificacoes_lidas") || "[]"
      );

      const notifPosts = posts.map((p) => {
        const id = `post-${p.id}`;
        return {
          id: id,
          realId: p.id, // ID real para abrir no mural
          tipo: "comunicado",
          titulo: p.title,
          conteudo: p.content,
          data: p.date,
          autor: p.author?.name || "Desconhecido",
          lida: lidasSalvas.includes(id),
        };
      });

      const notifAvisos = avisos.map((a) => {
        const id = `aviso-${a.id}`;
        return {
          id: id,
          realId: a.id, // ID real para abrir no mural
          tipo: "aviso",
          titulo: a.title,
          conteudo: a.content,
          data: a.date,
          autor: a.author?.name || "Desconhecido",
          lida: lidasSalvas.includes(id),
        };
      });

      const todas = [...notifPosts, ...notifAvisos].sort(
        (a, b) => new Date(b.data) - new Date(a.data)
      );

      setNotificacoes(todas);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarNotificacoes();
  }, [carregarNotificacoes]);

  const marcarComoLida = (id) => {
    // Atualiza estado visual
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );

    // Salva no LocalStorage
    const lidasAtuais = JSON.parse(
      localStorage.getItem("notificacoes_lidas") || "[]"
    );
    if (!lidasAtuais.includes(id)) {
      localStorage.setItem(
        "notificacoes_lidas",
        JSON.stringify([...lidasAtuais, id])
      );
    }
  };

  const marcarTodasComoLidas = () => {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    const idsAtuais = notificacoes.map((n) => n.id);
    const lidasAntigas = JSON.parse(
      localStorage.getItem("notificacoes_lidas") || "[]"
    );
    const novasLidas = Array.from(new Set([...lidasAntigas, ...idsAtuais]));
    localStorage.setItem("notificacoes_lidas", JSON.stringify(novasLidas));
  };

  // Função que gerencia o clique: marca lida e navega com dados
  const lidarComCliqueNotificacao = (notif) => {
    marcarComoLida(notif.id);

    navigate("/comunicados", {
      state: {
        openId: notif.realId, // Passa o ID numérico real
        targetTab: notif.tipo === "comunicado" ? "comunicados" : "avisos", // Define a aba
      },
    });
  };

  const notificacoesFiltradas = notificacoes.filter((n) => {
    if (filtro === "nao-lidas") return !n.lida;
    if (filtro === "comunicados") return n.tipo === "comunicado";
    if (filtro === "avisos") return n.tipo === "aviso";
    return true;
  });

  const formatarData = (dataStr) => {
    const data = new Date(dataStr);
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIcone = (tipo) => {
    return tipo === "comunicado"
      ? "bi-megaphone-fill"
      : "bi-info-circle-fill";
  };

  const getCor = (tipo) => {
    return tipo === "comunicado" ? "#1976d2" : "#2e7d32";
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <>
      <Navbar />
      <div className="d-flex">
        <MenuLateral />

        <div className="container-fluid mt-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Notificações</h5>
                {naoLidas > 0 && (
                  <small className="text-muted">
                    {naoLidas} não {naoLidas === 1 ? "lida" : "lidas"}
                  </small>
                )}
              </div>

              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={marcarTodasComoLidas}
                disabled={naoLidas === 0}
              >
                <i className="bi bi-check-all me-2"></i>
                Marcar todas como lidas
              </button>
            </div>

            <div className="card-body p-0">
              <div className="d-flex border-bottom">
                {[
                  { valor: "todas", label: "Todas" },
                  { valor: "nao-lidas", label: "Não lidas" },
                  { valor: "comunicados", label: "Comunicados" },
                  { valor: "avisos", label: "Avisos" },
                ].map((f) => (
                  <button
                    key={f.valor}
                    type="button"
                    className={`btn btn-link text-decoration-none px-4 py-3 ${
                      filtro === f.valor
                        ? "border-bottom border-primary border-3 text-primary fw-semibold"
                        : "text-secondary"
                    }`}
                    onClick={() => setFiltro(f.valor)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                </div>
              ) : notificacoesFiltradas.length === 0 ? (
                <div className="text-center text-muted p-5">
                  <i
                    className="bi bi-inbox"
                    style={{ fontSize: "3rem", opacity: 0.3 }}
                  ></i>
                  <p className="mt-3">Nenhuma notificação encontrada</p>
                </div>
              ) : (
                <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  {notificacoesFiltradas.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 border-bottom ${
                        notif.lida ? "bg-white" : "bg-light"
                      }`}
                      style={{ cursor: "pointer" }}
                      onClick={() => lidarComCliqueNotificacao(notif)}
                    >
                      <div className="d-flex align-items-start">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center me-3"
                          style={{
                            width: "48px",
                            height: "48px",
                            backgroundColor: `${getCor(notif.tipo)}20`,
                            color: getCor(notif.tipo),
                            flexShrink: 0,
                          }}
                        >
                          <i className={`bi ${getIcone(notif.tipo)} fs-5`}></i>
                        </div>

                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <div className="d-flex align-items-center gap-2">
                              <h6 className="mb-0 fw-semibold text-truncate">
                                {notif.titulo}
                              </h6>
                              {!notif.lida && (
                                <span className="badge bg-primary rounded-pill">
                                  Novo
                                </span>
                              )}
                            </div>
                            <small className="text-muted text-nowrap ms-2">
                              {formatarData(notif.data)}
                            </small>
                          </div>

                          <p
                            className="mb-1 text-muted small"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {notif.conteudo}
                          </p>

                          <div className="d-flex align-items-center gap-3">
                            <small className="text-muted">
                              <i className="bi bi-person me-1"></i>
                              {notif.autor}
                            </small>
                            <small
                              className="badge"
                              style={{
                                backgroundColor: `${getCor(notif.tipo)}20`,
                                color: getCor(notif.tipo),
                              }}
                            >
                              {notif.tipo === "comunicado"
                                ? "Comunicado"
                                : "Aviso"}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}