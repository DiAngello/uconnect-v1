import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/chat.css";

// Ícones
import iconeUsuario from "../assets/icone_usuario_chat.svg";
import iconeTodos from "../assets/Todos.svg";
import iconeAtendimento from "../assets/Atendimento.svg";
import iconeProfessores from "../assets/Professor.svg";
import iconeAlunos from "../assets/alunos.svg";
import iconeEnviar from "../assets/Paper_Plane.svg";

// API
import {
  getConversations,
  getMessages,
  sendMessage,
  markAllMessagesAsRead,
  getCurrentUser,
  createConversation,
  listUsers,
  deleteConversation,
} from "../services/api";

function Chat() {
  const [currentUser, setCurrentUser] = useState(null);

  const [conversas, setConversas] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [conversaAtivaId, setConversaAtivaId] = useState(null);

  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");

  const [novaMensagem, setNovaMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [error, setError] = useState(null);

  const chatBodyRef = useRef(null);

  // Modal Novo Chat
  const [showUserModal, setShowUserModal] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userList, setUserList] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);

  // Modal Excluir
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Busca usuário logado
  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error("Erro ao buscar usuário atual:", err);
        setError("Não foi possível carregar os dados do usuário.");
      }
    })();
  }, []);

  // Conversas
  const fetchConversas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getConversations();
      setConversas(data);
      setConversaAtivaId((prev) => prev ?? (data[0]?.id ?? null));
    } catch (err) {
      console.error("Erro ao buscar conversas:", err);
      setError("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversas();
  }, [fetchConversas]);

  // Mensagens
  const fetchMensagens = useCallback(async () => {
    if (!conversaAtivaId) return;
    const controller = new AbortController();
    try {
      setLoading(true);
      const data = await getMessages(conversaAtivaId, { signal: controller.signal });
      setMensagens((prev) => {
        const sameLen = prev.length === data.length;
        const sameLast =
          sameLen && (!data.length || prev[prev.length - 1]?.id === data[data.length - 1]?.id);
        return sameLast ? prev : data;
      });
      await markAllMessagesAsRead(conversaAtivaId);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Erro ao buscar mensagens:", err);
        setError("Erro ao carregar mensagens");
      }
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, [conversaAtivaId]);

  // Carrega quando troca a conversa
  useEffect(() => {
    if (conversaAtivaId) fetchMensagens();
  }, [conversaAtivaId, fetchMensagens]);

  // Polling a cada 5s
  useEffect(() => {
    if (!conversaAtivaId) return;
    const id = setInterval(fetchMensagens, 5000);
    return () => clearInterval(id);
  }, [conversaAtivaId, fetchMensagens]);

  // Scroll sempre no fim
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [mensagens]);

  const enviarMensagem = async () => {
    if (sendingMsg) return;
    const trimmed = novaMensagem.trim();
    if (!trimmed || !conversaAtivaId) return;

    // Otimista
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      authorId: currentUser?.id,
      authorName: currentUser?.name || "Você",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setSendingMsg(true);
    setMensagens((prev) => [...prev, optimistic]);
    setNovaMensagem("");

    setConversas((prev) =>
      prev.map((c) => (c.id === conversaAtivaId ? { ...c, last_message: optimistic } : c))
    );

    try {
      const saved = await sendMessage(conversaAtivaId, trimmed);
      setMensagens((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      setConversas((prev) =>
        prev.map((c) => (c.id === conversaAtivaId ? { ...c, last_message: saved } : c))
      );
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      setMensagens((prev) => prev.filter((m) => m.id !== tempId));
      setError("Erro ao enviar mensagem");
    } finally {
      setSendingMsg(false);
    }
  };

  // Atalhos
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !sendingMsg) {
      e.preventDefault();
      enviarMensagem();
      return;
    }
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      openNewChatModal();
    }
  };

  // Selecionar conversa
  const selecionarConversa = (conversaId) => {
    if (conversaAtivaId === conversaId) return;
    setConversaAtivaId(conversaId);
    setError(null);
    setMensagens([]);
  };

  const conversasFiltradas = conversas
    .filter((conv) => {
      const nome = conv.title || "";
      return nome.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .filter(() => true);

  const conversaAtualObj = conversas.find((c) => c.id === conversaAtivaId);

  const formatarHora = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // Modal Novo Chat
  const loadUsers = async (query) => {
    try {
      setUsersLoading(true);
      const data = await listUsers(query);
      const filtered = currentUser ? data.filter((u) => u.id !== currentUser.id) : data;
      setUserList(filtered);
    } catch (err) {
      console.error("Erro ao listar usuários:", err);
      setError("Erro ao listar usuários");
    } finally {
      setUsersLoading(false);
    }
  };

  const openNewChatModal = async () => {
    setShowUserModal(true);
    setSelectedUserIds([]);
    setGroupTitle("");
    await loadUsers("");
  };

  const closeNewChatModal = () => {
    setShowUserModal(false);
    setUserSearch("");
    setUserList([]);
    setSelectedUserIds([]);
    setGroupTitle("");
    setCreatingChat(false);
  };

  useEffect(() => {
    if (!showUserModal) return;
    const t = setTimeout(() => loadUsers(userSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [userSearch, showUserModal, loadUsers]); // ✅ corrigido warning

  useEffect(() => {
    if (!showUserModal) return;
    const onEsc = (e) => {
      if (e.key === "Escape") closeNewChatModal();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [showUserModal]);

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreateChat = async () => {
    if (creatingChat) return;
    try {
      if (selectedUserIds.length === 0) return;

      const participantIds = Array.from(new Set(selectedUserIds));
      const title =
        participantIds.length > 1 && groupTitle.trim() ? groupTitle.trim() : undefined;

      setCreatingChat(true);
      const novaConversa = await createConversation(participantIds, title);

      setConversas((prev) => [novaConversa, ...prev]);
      setConversaAtivaId(novaConversa.id);
      setMensagens([]);
      setError(null);
      closeNewChatModal();

      requestAnimationFrame(() => {
        const input = document.querySelector(".chat-card input.form-control.border-0");
        input?.focus();
      });
    } catch (err) {
      console.error("Erro ao criar conversa:", err);
      setError("Não foi possível criar a conversa");
      setCreatingChat(false);
    }
  };

  // Excluir conversa
  const openDeleteModal = () => setShowDeleteModal(true);
  const closeDeleteModal = () => {
    if (!deleting) setShowDeleteModal(false);
  };

  const handleDeleteConversation = async () => {
    if (!conversaAtivaId) return;
    setDeleting(true);
    try {
      await deleteConversation(conversaAtivaId);
      setConversas((prev) => prev.filter((c) => c.id !== conversaAtivaId));
      setConversaAtivaId(null);
      setMensagens([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Erro ao excluir conversa:", err);
      setError("Não foi possível excluir a conversa.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="chat-layout d-flex" onKeyDown={handleKeyDown}>
        <MenuLateral />
        <div className="container-fluid mt-4">
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          <div className="row">
            {/* Lista de conversas */}
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body p-0">
                  <div className="p-3 border-bottom">
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Pesquisar"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-around text-center py-3 border-bottom bg-light">
                    {[
                      { nome: "Todos", icon: iconeTodos },
                      { nome: "Atendimento", icon: iconeAtendimento },
                      { nome: "Professores", icon: iconeProfessores },
                      { nome: "Alunos", icon: iconeAlunos },
                    ].map((filtro) => (
                      <div
                        key={filtro.nome}
                        className="filtro-item d-flex flex-column align-items-center"
                        onClick={() => setFiltroAtivo(filtro.nome)}
                        style={{ cursor: "pointer" }}
                      >
                        <div
                          className={`filtro-icone rounded-circle d-flex align-items-center justify-content-center mb-1 ${
                            filtroAtivo === filtro.nome ? "ativo" : ""
                          }`}
                        >
                          <img src={filtro.icon} alt={filtro.nome} width="28" height="28" />
                        </div>
                        <div
                          className={`small fw-semibold ${
                            filtroAtivo === filtro.nome ? "text-primary" : "text-secondary"
                          }`}
                        >
                          {filtro.nome}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="list-group list-group-flush" style={{ maxHeight: 500, overflowY: "auto" }}>
                    {loading && conversas.length === 0 ? (
                      <div className="text-center p-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Carregando...</span>
                        </div>
                      </div>
                    ) : conversasFiltradas.length === 0 ? (
                      <div className="text-center text-muted p-4">Nenhuma conversa encontrada</div>
                    ) : (
                      conversasFiltradas.map((chat) => (
                        <div
                          key={chat.id}
                          className={`list-group-item list-group-item-action d-flex align-items-start ${
                            conversaAtivaId === chat.id ? "bg-light" : ""
                          }`}
                          onClick={() => selecionarConversa(chat.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <img src={iconeUsuario} alt="Ícone do usuário" width="42" height="42" className="me-3" />
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <strong className="text-truncate" style={{ maxWidth: 200 }}>
                                {chat.title || "Sem título"}
                              </strong>
                              <small className="text-muted">
                                {chat.last_message ? formatarHora(chat.last_message.timestamp) : ""}
                              </small>
                            </div>
                            <div className="text-muted small text-truncate" style={{ maxWidth: 200 }}>
                              {chat.last_message?.content || "Sem mensagens"}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Área do chat */}
            <div className="col-md-8">
              <div className="card shadow-sm chat-card">
                <div className="card-header bg-light d-flex align-items-center justify-content-between">
                  {conversaAtivaId && conversaAtualObj ? (
                    <>
                      <div className="d-flex align-items-center">
                        <img src={iconeUsuario} alt="Ícone do usuário" width="38" height="38" className="me-2" />
                        <div>
                          <strong>{conversaAtualObj.title}</strong>
                          <div className="small text-muted">
                            {conversaAtualObj.participants?.length || 0} participante(s)
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={openDeleteModal}
                          title="Excluir conversa"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={fetchMensagens}
                          disabled={loading}
                          title="Atualizar mensagens"
                        >
                          <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={openNewChatModal} title="Novo chat">
                          + Novo chat
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="d-flex w-100 align-items-center justify-content-between">
                      <strong>Selecione uma conversa</strong>
                      <button className="btn btn-sm btn-primary" onClick={openNewChatModal} title="Novo chat">
                        + Novo chat
                      </button>
                    </div>
                  )}
                </div>

                <div className="card-body chat-body" ref={chatBodyRef}>
                  {conversaAtivaId ? (
                    loading && mensagens.length === 0 ? (
                      <div className="text-center mt-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Carregando...</span>
                        </div>
                      </div>
                    ) : mensagens.length === 0 ? (
                      <div className="text-center text-muted mt-4">
                        Nenhuma mensagem nesta conversa. Seja o primeiro a enviar.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {mensagens.map((msg, idx) => {
                          const isMyMessage = currentUser && msg.authorId === currentUser.id;
                          const isLast = idx === mensagens.length - 1;
                          return (
                            <div
                              key={msg.id}
                              ref={isLast ? (el) => el && el.scrollIntoView({ block: "end" }) : null}
                              className={`d-flex flex-column ${isMyMessage ? "align-items-end" : "align-items-start"}`}
                            >
                              <small className="text-muted mb-1">{msg.authorName || "Usuário"}</small>
                              <div className={`msg-balao ${isMyMessage ? "enviada" : "recebida"}`}>{msg.content}</div>
                              <small className="text-muted mt-1">{formatarHora(msg.timestamp)}</small>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="text-center text-muted mt-4">
                      <i className="bi bi-chat-dots" style={{ fontSize: "4rem", opacity: 0.3 }}></i>
                      <p className="mt-3">Escolha uma conversa à esquerda para começar</p>
                    </div>
                  )}
                </div>

                {conversaAtivaId && (
                  <div className="card-footer bg-light">
                    <div className="input-group align-items-center">
                      <span className="input-group-text bg-transparent border-0 fs-4">
                        <i className="bi bi-plus-circle"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-0"
                        placeholder="Digite uma mensagem"
                        value={novaMensagem}
                        onChange={(e) => setNovaMensagem(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading || sendingMsg}
                      />
                      <span className="input-group-text bg-transparent border-0 fs-4">
                        <i className="bi bi-mic"></i>
                      </span>
                      <button
                        className="btn btn-enviar d-flex align-items-center justify-content-center"
                        onClick={enviarMensagem}
                        disabled={loading || sendingMsg || novaMensagem.trim() === ""}
                        title="Enviar"
                      >
                        <img src={iconeEnviar} alt="Enviar" width="20" height="20" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Excluir */}
          {showDeleteModal && (
            <>
              <div className="modal fade show" style={{ display: "block" }} tabIndex="-1" role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Excluir conversa</h5>
                      <button type="button" className="btn-close" onClick={closeDeleteModal} disabled={deleting}></button>
                    </div>
                    <div className="modal-body">
                      Tem certeza que deseja excluir esta conversa?
                      <div className="mt-2 small text-muted">
                        Essa ação remove todas as mensagens para você e não pode ser desfeita.
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-outline-secondary" onClick={closeDeleteModal} disabled={deleting}>
                        Cancelar
                      </button>
                      <button type="button" className="btn btn-danger" onClick={handleDeleteConversation} disabled={deleting}>
                        {deleting ? "Excluindo…" : "Excluir"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-backdrop fade show"></div>
            </>
          )}

          {/* Modal Novo Chat */}
          {showUserModal && (
            <>
              <div className="modal fade show" style={{ display: "block" }} tabIndex="-1" role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Novo chat</h5>
                      <button type="button" className="btn-close" onClick={closeNewChatModal}></button>
                    </div>
                    <div className="modal-body">
                      <div className="input-group mb-3">
                        <span className="input-group-text bg-light">
                          <i className="bi bi-search"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Pesquisar usuários"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                      </div>
                      {selectedUserIds.length > 1 && (
                        <div className="mb-3">
                          <label className="form-label">Nome do grupo (opcional)</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ex.: Projeto UConnect"
                            value={groupTitle}
                            onChange={(e) => setGroupTitle(e.target.value)}
                          />
                        </div>
                      )}
                      <div style={{ maxHeight: 360, overflowY: "auto" }} className="border rounded">
                        {usersLoading ? (
                          <div className="p-4 text-center">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Carregando...</span>
                            </div>
                          </div>
                        ) : userList.length === 0 ? (
                          <div className="p-4 text-center text-muted">Nenhum usuário encontrado</div>
                        ) : (
                          <ul className="list-group list-group-flush">
                            {userList.map((u) => (
                              <li key={u.id} className="list-group-item d-flex align-items-center">
                                <input
                                  className="form-check-input me-2"
                                  type="checkbox"
                                  checked={selectedUserIds.includes(u.id)}
                                  onChange={() => toggleSelectUser(u.id)}
                                  id={`user-${u.id}`}
                                />
                                <label htmlFor={`user-${u.id}`} className="d-flex flex-column mb-0" style={{ cursor: "pointer" }}>
                                  <span className="fw-semibold">{u.name || u.email || `Usuário ${u.id}`}</span>
                                  {u.role && <small className="text-muted">{u.role}</small>}
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <small className="text-muted d-block mt-2">Selecione um ou mais usuários para criar a conversa.</small>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-outline-secondary" onClick={closeNewChatModal}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleCreateChat}
                        disabled={selectedUserIds.length === 0 || creatingChat}
                      >
                        {creatingChat ? "Criando…" : "Criar chat"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-backdrop fade show"></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Chat;