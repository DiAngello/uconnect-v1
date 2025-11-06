import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
// Importando as funções de API para Posts e Announcements
import { 
    getPosts, deletePost, 
    getAnnouncements, deleteAnnouncement, 
    getCurrentUser 
} from "../services/api";

function MuralComunicados() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    // O estado 'tab' foi restaurado. "comunicados" ou "avisos"
    const [tab, setTab] = useState(() => sessionStorage.getItem("muralTab") || "comunicados");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [deleteModalId, setDeleteModalId] = useState(null);
    const [deleting, setDeleting] = useState(false);

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

    // fetchData agora depende do 'tab'
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setErr(null);
            setItems([]); // Limpa os itens ao trocar de aba

            let data;
            if (tab === "comunicados") {
                data = await getPosts();
            } else { // 'tab' === "avisos"
                data = await getAnnouncements();
            }
            
            setItems(data || []);
        } catch (e) {
            console.error(e);
            setErr("Erro ao carregar publicações");
        } finally {
            setLoading(false);
        }
    }, [tab]); // O 'tab' foi readicionado como dependência

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- NOVO BLOCO ADICIONADO ---
    // Este useEffect adicional configura o polling (atualização a cada 5 segundos)
    useEffect(() => {
        // Inicia o intervalo para chamar fetchData a cada 1 minuto
        const id = setInterval(fetchData, 60000);
        
        // Função de limpeza: para o intervalo quando o componente é desmontado
        // ou quando 'fetchData' (e portanto 'tab') muda.
        return () => clearInterval(id);
    }, [fetchData]); // A dependência [fetchData] é crucial
    // --- FIM DO NOVO BLOCO ---

    const handleTabChange = (newTab) => {
    sessionStorage.setItem("muralTab", newTab);
    setTab(newTab);
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

    // Esta função funciona para ambos os tipos, pois a estrutura do autor é a mesma
    const canEditDelete = (item) => {
        if (!currentUser) return false;
        if (currentUser.role === "admin" || currentUser.role === "coordinator") return true;
        return item.author?.id === currentUser.id;
    };

    // handleDelete agora verifica a 'tab' ativa
    const handleDelete = async () => {
        if (!deleteModalId) return;
        try {
            setDeleting(true);
            
            if (tab === "comunicados") {
                await deletePost(deleteModalId);
            } else { // 'tab' === "avisos"
                await deleteAnnouncement(deleteModalId);
            }

            setItems((prev) => prev.filter((item) => item.id !== deleteModalId));
            setDeleteModalId(null);
        } catch (error) {
            console.error("Erro ao deletar:", error);
            setErr("Erro ao deletar publicação");
        } finally {
            setDeleting(false);
        }
    };

    const canCreatePost = currentUser && 
        ["teacher", "coordinator", "admin"].includes(currentUser.role);

    return (
        <>
            <Navbar />
            <div className="d-flex">
                <MenuLateral />

                <div className="container-fluid mt-4">
                    <div className="card shadow-sm">
                        {/* O cabeçalho com as abas foi restaurado */}
                        <div className="card-header bg-white">
                            <ul className="nav nav-tabs card-header-tabs">
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${tab === "comunicados" ? "active" : ""}`}
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
                                    {/* O título agora é dinâmico */}
                                    {tab === "comunicados" ? "Comunicados Oficiais" : "Avisos Gerais"}
                                </h5>
                                {canCreatePost && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        // --- ALTERAÇÃO AQUI ---
                                        // O botão "Novo" agora aponta para a rota correta
                                        onClick={() => navigate(tab === 'comunicados' ? '/comunicados/novo' : '/avisos/novo')}
                                    >
                                        <i className="bi bi-plus-circle me-2"></i>
                                        {/* O texto do botão agora é dinâmico */}
                                        {tab === 'comunicados' ? 'Novo Comunicado' : 'Novo Aviso'}
                                    </button>
                                    // --- FIM DA ALTERAÇÃO ---
                                )}
                            </div>

                            {err && (
                                <div className="alert alert-danger d-flex align-items-center" role="alert">
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
                                    <i className="bi bi-inbox" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
                                    <p className="mt-3">
                                        {/* Mensagem de 'nada encontrado' atualizada */}
                                        Nenhum {tab === "comunicados" ? "comunicado" : "aviso"} encontrado.
                                    </p>
                                </div>
                            )}
                            
                            {/* --- NOVO LAYOUT DE LISTA (DA IMAGEM) --- */}
                            <div className="d-flex flex-column">
                                {items.map((item) => (
                                    <div key={item.id} className="border-bottom py-3 px-2">
                                        <div className="d-flex justify-content-between align-items-start">
                                            {/* Informações do Post/Aviso */}
                                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                                                {/* ... código anterior ... */}
<div style={{ flexGrow: 1, minWidth: 0 }}>
    <button
        type="button"
        onClick={(e) => e.preventDefault()} 
        className="fw-semibold text-decoration-none btn btn-link p-0 m-0 border-0 text-start"
        style={{ color: "#0d6efd" }}
    >
        {item.author?.name || "Autor Desconhecido"}
    </button>
</div>
                                                
                                                <div className="text-dark mt-1" style={{ whiteSpace: "pre-wrap" }}>
                                                    {item.title}
                                                </div>
                                                
                                                {/* Se quiser mostrar o 'content' também, descomente abaixo */}
                                                {/* <div className="text-muted small mt-1" style={{ whiteSpace: "pre-wrap" }}>
                                                    {item.content}
                                                </div> */}
                                            </div>

                                            {/* Data e Menu Dropdown */}
                                            <div className="text-nowrap text-muted small ps-3 d-flex align-items-center">
                                                <span className="me-3">
                                                    {formatDateTime(item.date).split(' ')[1].substring(0, 5)}
                                                    {' — '}
                                                    {formatDateTime(item.date).split(' ')[0]}
                                                </span>
                                                
                                                {canEditDelete(item) && (
                                                    <div className="dropdown">
                                                        <button
                                                            className="btn btn-sm btn-light"
                                                            type="button"
                                                            data-bs-toggle="dropdown"
                                                            aria-expanded="false"
                                                        >
                                                            <i className="bi bi-three-dots-vertical"></i>
                                                        </button>
                                                        <ul className="dropdown-menu dropdown-menu-end">
                                                            <li>
                                                                <button
                                                                    className="dropdown-item"
                                                                    // --- ALTERAÇÃO AQUI ---
                                                                    // A rota de edição agora é dinâmica
                                                                    onClick={() => navigate(tab === 'comunicados' ? `/comunicados/editar/${item.id}` : `/avisos/editar/${item.id}`)}
                                                                >
                                                                    <i className="bi bi-pencil me-2"></i>
                                                                    Editar
                                                                </button>
                                                                {/* --- FIM DA ALTERAÇÃO --- */}
                                                            </li>
                                                            <li>
                                                                <button
                                                                    className="dropdown-item text-danger"
                                                                    onClick={() => setDeleteModalId(item.id)}
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

            {/* O Modal de Exclusão (sem alterações) */}
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
                                    Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.
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
        </>
    );
}

export default MuralComunicados;