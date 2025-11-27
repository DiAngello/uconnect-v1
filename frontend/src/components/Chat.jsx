import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  // --- ESTADOS ---
  const [conversas, setConversas] = useState([]);
  const [conversaAtivaId, setConversaAtivaId] = useState(null);
  
  // Cache de mensagens para troca instantânea de abas
  const [messagesCache, setMessagesCache] = useState({});

  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [novaMensagem, setNovaMensagem] = useState("");
  
  // Controle de Loading
  const [loading, setLoading] = useState(true); // Apenas para a primeira carga!
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);
  
  // Refs para evitar re-renders e loops
  const chatBodyRef = useRef(null);
  const loadedRef = useRef(false); // Garante que o load inicial só rode uma vez

  // Modais
  const [showUserModal, setShowUserModal] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userList, setUserList] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Helper de mensagens atuais
  const currentMessages = useMemo(() => {
     return conversaAtivaId ? (messagesCache[conversaAtivaId] || []) : [];
  }, [conversaAtivaId, messagesCache]);

  // Auth Error Handler (Logout)
  const handleAuthError = useCallback(() => {
    if (authError) return;
    setAuthError(true);
    localStorage.removeItem("accessToken");
    navigate("/"); 
  }, [navigate, authError]);

  // 1. CARREGAMENTO INICIAL (Blindado para rodar apenas uma vez)
  useEffect(() => {
    if (loadedRef.current) return; // Se já carregou, não faz nada
    loadedRef.current = true;

    (async () => {
      try {
        setLoading(true);
        const [userData, conversasData] = await Promise.all([
            getCurrentUser(),
            getConversations()
        ]);
        
        setCurrentUser(userData);
        setConversas(conversasData);
        
        // Seleciona primeiro chat
        if (conversasData.length > 0) {
            setConversaAtivaId(conversasData[0].id);
        }
      } catch (err) {
        console.error("Erro inicial:", err);
        if (err?.message?.includes("401")) handleAuthError();
      } finally {
        setLoading(false);
      }
    })();
  }, [handleAuthError]);

  // 2. FETCH SILENCIOSO DE CONVERSAS (Polling da lista lateral)
  useEffect(() => {
      if (authError) return;
      const interval = setInterval(async () => {
          try {
              const data = await getConversations();
              setConversas(prev => {
                  // Só atualiza se houver mudança real (evita piscar)
                  if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
                  return prev;
              });
          } catch (e) { /* Ignora erros no polling silencioso */ }
      }, 5000); // Verifica novos chats a cada 5s
      return () => clearInterval(interval);
  }, [authError]);

  // 3. ENGINE DE MENSAGENS
  const fetchMensagens = useCallback(async (chatId, isBackground = false) => {
    if (!chatId || authError) return;

    // Loading visual apenas se não tiver cache
    const hasCache = messagesCache[chatId] && messagesCache[chatId].length > 0;
    if (!isBackground && !hasCache) setMsgsLoading(true);

    try {
      const data = await getMessages(chatId);
      
      setMessagesCache(prevCache => {
          const prevMsgs = prevCache[chatId] || [];
          // Otimização: Evita atualização de estado se for idêntico
          if (prevMsgs.length === data.length && prevMsgs.length > 0) {
              if (prevMsgs[prevMsgs.length - 1].id === data[data.length - 1].id) {
                  return prevCache;
              }
          }
          return { ...prevCache, [chatId]: data };
      });

      markAllMessagesAsRead(chatId).catch(() => {});

    } catch (err) {
      if (err?.message?.includes("401")) handleAuthError();
      else if (!isBackground) console.error(err);
    } finally {
      if (!isBackground) setMsgsLoading(false);
    }
  }, [authError, handleAuthError, messagesCache]); // messagesCache aqui é seguro pois usamos setMessagesCache funcional

  // 4. Polling de Mensagens
  useEffect(() => {
    if (!conversaAtivaId) return;

    // Carga imediata
    fetchMensagens(conversaAtivaId, false);

    // Polling a cada 3s
    const interval = setInterval(() => {
        fetchMensagens(conversaAtivaId, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [conversaAtivaId, fetchMensagens]);

  // 5. Scroll
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [currentMessages.length, conversaAtivaId]); 

  // 6. Enviar Mensagem
  const enviarMensagem = async () => {
    const text = novaMensagem.trim();
    if (!text || !conversaAtivaId) return;

    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      authorId: currentUser?.id,
      authorName: currentUser?.name || "Eu",
      content: text,
      timestamp: new Date().toISOString(),
    };

    // UI Optimistic Updates
    setMessagesCache(prev => ({
        ...prev,
        [conversaAtivaId]: [...(prev[conversaAtivaId] || []), optimisticMsg]
    }));
    setNovaMensagem("");
    
    // Atualiza preview lateral
    setConversas(prev => prev.map(c => 
        c.id === conversaAtivaId ? { ...c, last_message: optimisticMsg } : c
    ));

    try {
      const saved = await sendMessage(conversaAtivaId, text);
      
      // Substitui msg temporária pela real
      setMessagesCache(prev => {
          const chatMsgs = prev[conversaAtivaId] || [];
          return {
              ...prev,
              [conversaAtivaId]: chatMsgs.map(m => m.id === tempId ? saved : m)
          };
      });

      setConversas(prev => prev.map(c => 
          c.id === conversaAtivaId ? { ...c, last_message: saved } : c
      ));

    } catch (err) {
      console.error("Falha envio:", err);
      // Rollback
      setMessagesCache(prev => ({
          ...prev,
          [conversaAtivaId]: (prev[conversaAtivaId] || []).filter(m => m.id !== tempId)
      }));
      setNovaMensagem(text);
      alert("Erro ao enviar mensagem.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  const selecionarConversa = (id) => {
    if (conversaAtivaId === id) return;
    setConversaAtivaId(id);
    setError(null);
  };

  // --- MODAIS ---
  const loadUsers = useCallback(async (query) => {
    setUsersLoading(true);
    try {
      const res = await listUsers(query);
      const filtered = currentUser ? res.filter(u => u.id !== currentUser.id) : res;
      setUserList(filtered);
    } catch(e) { console.error(e); } 
    finally { setUsersLoading(false); }
  }, [currentUser]);

  useEffect(() => {
    if(showUserModal) {
        const t = setTimeout(() => loadUsers(userSearch), 400);
        return () => clearTimeout(t);
    }
  }, [userSearch, showUserModal, loadUsers]);

  const openNewChatModal = () => {
      setShowUserModal(true);
      setGroupTitle("");
      setSelectedUserIds([]);
      setUserSearch("");
      loadUsers("");
  };

  const handleCreateChat = async () => {
      if(creatingChat) return;
      setCreatingChat(true);
      try {
          const ids = [...new Set(selectedUserIds)];
          const title = ids.length > 1 && groupTitle.trim() ? groupTitle.trim() : undefined;
          const newChat = await createConversation(ids, title);
          
          setConversas(prev => [newChat, ...prev]);
          setConversaAtivaId(newChat.id);
          setShowUserModal(false);
          setMessagesCache(prev => ({...prev, [newChat.id]: []}));
      } catch(e) { console.error(e); setError("Erro ao criar chat"); }
      finally { setCreatingChat(false); }
  };

  const handleDeleteConversation = async () => {
      if(!conversaAtivaId) return;
      setDeleting(true);
      try {
          await deleteConversation(conversaAtivaId);
          setConversas(prev => prev.filter(c => c.id !== conversaAtivaId));
          setMessagesCache(prev => {
              const newCache = {...prev};
              delete newCache[conversaAtivaId];
              return newCache;
          });
          setConversaAtivaId(null);
          setShowDeleteModal(false);
      } catch(e) { console.error(e); setError("Erro ao excluir"); }
      finally { setDeleting(false); }
  };

  // Renderização
  const conversasFiltradas = conversas.filter(c => 
      (c.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const currentChatObj = conversas.find(c => c.id === conversaAtivaId);
  const formatTime = (t) => t ? new Date(t).toLocaleTimeString("pt-BR", {hour:'2-digit', minute:'2-digit'}) : "";

  return (
    <>
      <Navbar />
      <div className="chat-layout d-flex" onKeyDown={(e) => {
         if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
             e.preventDefault();
             openNewChatModal();
         }
      }}>
        <MenuLateral />
        <div className="container-fluid mt-4">
            
            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                </div>
            )}

            <div className="row">
                {/* LISTA LATERAL */}
                <div className="col-md-4">
                    <div className="card shadow-sm h-100">
                        <div className="p-3 border-bottom bg-light">
                             <div className="input-group">
                                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                                <input className="form-control border-start-0" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                             </div>
                        </div>

                        {/* FILTROS */}
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
                                <div className={`filtro-icone rounded-circle d-flex align-items-center justify-content-center mb-1 ${filtroAtivo === filtro.nome ? "ativo" : ""}`}>
                                  <img src={filtro.icon} alt={filtro.nome} width="28" height="28" />
                                </div>
                                <div className={`small fw-semibold ${filtroAtivo === filtro.nome ? "text-primary" : "text-secondary"}`}>
                                  {filtro.nome}
                                </div>
                              </div>
                            ))}
                        </div>

                        <div className="list-group list-group-flush" style={{overflowY:'auto', height: '500px'}}>
                            {loading ? (
                                <div className="text-center p-3">Carregando conversas...</div>
                            ) : conversasFiltradas.length === 0 ? (
                                <div className="text-center p-3 text-muted">Nenhuma conversa encontrada</div>
                            ) : (
                                conversasFiltradas.map(chat => (
                                <div key={chat.id} 
                                     onClick={() => selecionarConversa(chat.id)}
                                     className={`list-group-item list-group-item-action ${conversaAtivaId === chat.id ? 'bg-light' : ''}`}
                                     style={{cursor:'pointer'}}>
                                    <div className="d-flex align-items-center">
                                        <img src={iconeUsuario} alt="User" width="40" className="me-3"/>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <div className="d-flex justify-content-between">
                                                <strong className="text-truncate">{chat.title || "Sem título"}</strong>
                                                <small className="text-muted" style={{fontSize:'0.75rem'}}>{formatTime(chat.last_message?.timestamp)}</small>
                                            </div>
                                            <div className="text-truncate text-muted small">{chat.last_message?.content || "Nova conversa"}</div>
                                        </div>
                                    </div>
                                </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* CHAT PRINCIPAL */}
                <div className="col-md-8">
                    <div className="card shadow-sm chat-card h-100">
                        {/* HEADER */}
                        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
                            <div className="d-flex align-items-center">
                                {currentChatObj ? (
                                    <>
                                        <img src={iconeUsuario} alt="User" width="40" className="me-3"/>
                                        <div>
                                            <h6 className="m-0 fw-bold">{currentChatObj.title}</h6>
                                            <small className="text-muted">{currentChatObj.participants?.length || 1} membros</small>
                                        </div>
                                    </>
                                ) : <strong>Selecione uma conversa</strong>}
                            </div>
                            
                            <div className="d-flex align-items-center gap-2">
                                {currentChatObj && (
                                    <>
                                        <button className="btn btn-light btn-sm" onClick={() => fetchMensagens(conversaAtivaId, false)} title="Atualizar">
                                            <i className="bi bi-arrow-clockwise"></i>
                                        </button>
                                        <button className="btn btn-outline-danger btn-sm" onClick={() => setShowDeleteModal(true)} title="Excluir">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </>
                                )}
                                <button className="btn btn-primary btn-sm" onClick={openNewChatModal}>+ Novo</button>
                            </div>
                        </div>

                        <div className="card-body chat-body bg-light" ref={chatBodyRef} style={{height: '500px', overflowY: 'auto'}}>
                             {/* Spinner só aparece se não tem cache */}
                             {msgsLoading && currentMessages.length === 0 ? (
                                 <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-primary"></div></div>
                             ) : currentMessages.length === 0 ? (
                                 <div className="text-center text-muted mt-5">Nenhuma mensagem aqui.</div>
                             ) : (
                                 currentMessages.map(msg => {
                                     const isMe = currentUser && msg.authorId === currentUser.id;
                                     return (
                                         <div key={msg.id} className={`d-flex flex-column mb-3 ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                                             <div className={`p-3 rounded-3 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark'}`} style={{maxWidth:'70%'}}>
                                                 {msg.content}
                                             </div>
                                             <small className="text-muted mt-1" style={{fontSize:'0.7rem'}}>
                                                {!isMe && <span className="me-2 fw-bold">{msg.authorName}</span>}
                                                {formatTime(msg.timestamp)}
                                             </small>
                                         </div>
                                     )
                                 })
                             )}
                        </div>

                        {conversaAtivaId && (
                            <div className="card-footer bg-white p-3">
                                <div className="input-group">
                                    <input 
                                        className="form-control" 
                                        placeholder="Digite sua mensagem..." 
                                        value={novaMensagem} 
                                        onChange={e => setNovaMensagem(e.target.value)} 
                                        onKeyDown={handleKeyDown}
                                    />
                                    <button className="btn btn-primary" onClick={enviarMensagem}>
                                        <img src={iconeEnviar} alt="Enviar" width="20" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Delete */}
            {showDeleteModal && (
                 <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5>Excluir Conversa</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                            </div>
                            <div className="modal-body">Tem certeza que deseja excluir?</div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                                <button className="btn btn-danger" onClick={handleDeleteConversation} disabled={deleting}>
                                    {deleting ? "Excluindo..." : "Excluir"}
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}

             {/* Modal Novo Chat */}
             {showUserModal && (
                <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
                   <div className="modal-dialog modal-dialog-centered">
                       <div className="modal-content">
                           <div className="modal-header">
                               <h5>Novo Chat</h5>
                               <button type="button" className="btn-close" onClick={() => setShowUserModal(false)}></button>
                           </div>
                           <div className="modal-body">
                               <input 
                                   className="form-control mb-3" 
                                   placeholder="Buscar usuário..." 
                                   value={userSearch} 
                                   onChange={e => setUserSearch(e.target.value)} 
                               />
                               
                               {selectedUserIds.length > 1 && (
                                   <input 
                                     className="form-control mb-3" 
                                     placeholder="Nome do Grupo (Opcional)"
                                     value={groupTitle}
                                     onChange={e => setGroupTitle(e.target.value)}
                                   />
                               )}

                               <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                                   {usersLoading ? <div className="text-center">Carregando...</div> : (
                                       <ul className="list-group">
                                           {userList.map(u => (
                                               <li key={u.id} className="list-group-item">
                                                   <label className="d-flex align-items-center w-100" style={{cursor: 'pointer'}}>
                                                       <input 
                                                           type="checkbox" 
                                                           className="me-3" 
                                                           checked={selectedUserIds.includes(u.id)} 
                                                           onChange={() => {
                                                               setSelectedUserIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])
                                                           }} 
                                                       />
                                                       <div>
                                                           <div>{u.name}</div>
                                                           <small className="text-muted">{u.email}</small>
                                                       </div>
                                                   </label>
                                               </li>
                                           ))}
                                       </ul>
                                   )}
                               </div>
                           </div>
                           <div className="modal-footer">
                               <button className="btn btn-primary" onClick={handleCreateChat} disabled={creatingChat || selectedUserIds.length === 0}>
                                   {creatingChat ? "Criando..." : "Criar"}
                               </button>
                           </div>
                       </div>
                   </div>
                </div>
            )}

        </div>
      </div>
    </>
  );
}

export default Chat;