import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import {
  getPosts,
  deletePost,
  getAnnouncements,
  deleteAnnouncement,
  getCurrentUser,
} from "../services/api";

// =============================================
// FUNÇÃO PARA TRANSFORMAR URLs EM <a>
// =============================================
function linkifyText(text) {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0d6efd", textDecoration: "underline" }}
        >
          {part}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function MuralComunicados() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState(
    () => sessionStorage.getItem("muralTab") || "comunicados"
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // controla qual item está com o menu de opções aberto
  const [openMenuId, setOpenMenuId] = useState(null);

  // controla o item aberto no modal de detalhes
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      setItems([]);

      let data;
      if (tab === "comunicados") {
        data = await getPosts();
      } else {
        data = await getAnnouncements();
      }

      setItems(data || []);
    } catch (e) {
      console.error(e);
      setErr("Erro ao carregar publicações");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleTabChange = (newTab) => {
    sessionStorage.setItem("muralTab", newTab);
    setTab(newTab);
    setOpenMenuId(null);
    setViewItem(null);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canEditDelete = (item) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin" || currentUser.role === "coordinator") {
      return true;
    }
    return item.author?.id === currentUser.id;
  };

  const handleDelete = async () => {
    if (!deleteModalId) return;
    try {
      setDeleting(true);

      if (tab === "comunicados") {
        await deletePost(deleteModalId);
      } else {
        await deleteAnnouncement(deleteModalId);
      }

      setItems((prev) => prev.filter((item) => item.id !== deleteModalId));
      setDeleteModalId(null);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Erro ao deletar:", error);
      setErr("Erro ao deletar publicação");
    } finally {
      setDeleting(false);
    }
  };

  const canCreatePost =
    currentUser &&
    ["teacher", "coordinator", "admin"].includes(currentUser.role);

  const toggleMenu = (id) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <Navbar />
      <div className="d-flex">
        <MenuLateral />

        {/* evita scroll horizontal da área principal */}
        <div
          className="container-fluid mt-4 flex-grow-1"
          style={{ overflowX: "hidden" }}
        >
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${
                      tab === "comunicados" ? "active" : ""
                    }`}
                    onClick={() => handleTabChange("comunicados")}
                  >
                    <i className="bi bi-megaphone me-2"></i>
                    Comunicados
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${tab === "avisos" ? "active" : ""}`}
                    onClick={() => handleTabChange("avisos")}
                  >
                    <i className="bi bi-info-circle me-2"></i>
                    Avisos
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  {tab === "comunicados"
                    ? "Comunicados Oficiais"
                    : "Avisos Gerais"}
                </h5>
                {canCreatePost && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      navigate(
                        tab === "comunicados"
                          ? "/comunicados/novo"
                          : "/avisos/novo"
                      )
                    }
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    {tab === "comunicados" ? "Novo Comunicado" : "Novo Aviso"}
                  </button>
                )}
              </div>

              {err && (
                <div
                  className="alert alert-danger d-flex align-items-center"
                  role="alert"
                >
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {err}
                </div>
              )}

              {!err && loading && (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando…</span>
                  </div>
                </div>
              )}

              {!err && !loading && items.length === 0 && (
                <div className="text-center text-muted p-4">
                  <i
                    className="bi bi-inbox"
                    style={{ fontSize: "3rem", opacity: 0.3 }}
                  ></i>
                  <p className="mt-3">
                    Nenhum {tab === "comunicados" ? "comunicado" : "aviso"}{" "}
                    encontrado.
                  </p>
                </div>
              )}

              {/* LISTA DE PUBLICAÇÕES */}
              <div className="d-flex flex-column" style={{ maxWidth: "100%" }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border-bottom py-3 px-2"
                    style={{ maxWidth: "100%", position: "relative" }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      {/* COLUNA ESQUERDA – título + conteúdo */}
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div className="fw-semibold text-dark">
                          {item.title || "(Sem título)"}
                        </div>

                        {item.content && (
                          <div
                            className="text-dark mt-1"
                            style={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {linkifyText(item.content)}
                          </div>
                        )}
                      </div>

                      {/* COLUNA DIREITA – data, ver detalhes e menu */}
                      <div className="text-muted small ps-3 d-flex align-items-center">
                        <div className="d-flex flex-column align-items-end me-2">
                          <span className="text-nowrap">
                            {formatDateTime(item.date).split(" ")[1].substring(0, 5)}
                            {"  "}
                            {formatDateTime(item.date).split(" ")[0]}
                          </span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 mt-1 text-decoration-none"
                            onClick={() => setViewItem(item)}
                          >
                            Ver detalhes
                          </button>
                        </div>

                        {canEditDelete(item) && (
                          <div
                            className="dropdown"
                            style={{ position: "relative" }}
                          >
                            <button
                              className="btn btn-sm btn-light"
                              type="button"
                              onClick={() => toggleMenu(item.id)}
                            >
                              <i className="bi bi-three-dots-vertical"></i>
                            </button>

                            <ul
                              className={
                                "dropdown-menu" +
                                (openMenuId === item.id ? " show" : "")
                              }
                              style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                left: "auto",
                                zIndex: 1000,
                                minWidth: "150px",
                              }}
                            >
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(
                                      tab === "comunicados"
                                        ? `/comunicados/editar/${item.id}`
                                        : `/avisos/editar/${item.id}`
                                    );
                                  }}
                                >
                                  <i className="bi bi-pencil me-2"></i>
                                  Editar
                                </button>
                              </li>
                              <li>
                                <button
                                  className="dropdown-item text-danger"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDeleteModalId(item.id);
                                  }}
                                >
                                  <i className="bi bi-trash me-2"></i>
                                  Excluir
                                </button>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de exclusão */}
      {deleteModalId && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirmar Exclusão</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setDeleteModalId(null)}
                    disabled={deleting}
                  ></button>
                </div>
                <div className="modal-body">
                  Tem certeza que deseja excluir esta publicação? Esta ação não
                  pode ser desfeita.
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDeleteModalId(null)}
                    disabled={deleting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Excluindo…" : "Excluir"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Modal de detalhes do comunicado/aviso */}
      {viewItem && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {viewItem.title || "Comunicado"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setViewItem(null)}
                  ></button>
                </div>

                <div className="modal-body">
                  {/* DATA */}
                  <div className="text-muted small">
                    Publicado em {formatDateTime(viewItem.date)}
                  </div>

                  {/* AUTOR */}
                  <div className="text-muted small mb-3">
                    Publicado por{" "}
                    <span className="fw-semibold">
                      {viewItem.author?.name || "Usuário desconhecido"}
                    </span>
                    {viewItem.author?.role
                      ? ` — ${viewItem.author.role}`
                      : ""}
                  </div>

                  {/* CONTEÚDO */}
                  <div
                    className="text-dark"
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {linkifyText(viewItem.content)}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setViewItem(null)}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </>
  );
}

export default MuralComunicados;