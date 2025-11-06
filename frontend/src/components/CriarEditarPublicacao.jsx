import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
// As funções de API estão corretas para "Comunicados" (Posts)
import { createPost, updatePost, getPost } from "../services/api";

export default function CriarEditarPublicacao() {
    const navigate = useNavigate();
    const { postId } = useParams();
    const isEditing = !!postId;

    const [titulo, setTitulo] = useState("");
    const [conteudo, setConteudo] = useState("");
    // O estado 'tipo' foi removido, este form é só para 'Post'
    // const [tipo, setTipo] = useState("announcement"); 
    
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState(null);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        if (isEditing) {
            const loadPost = async () => {
                try {
                    setCarregando(true);
                    const post = await getPost(postId);
                    setTitulo(post.title);
                    setConteudo(post.content);
                    // 'setTipo(post.type)' foi removido
                } catch (error) {
                    console.error("Erro ao carregar comunicado:", error);
                    setErro("Erro ao carregar comunicado para edição");
                } finally {
                    setCarregando(false);
                }
            };
            loadPost();
        }
    }, [isEditing, postId]);

    const podeEnviar = titulo.trim().length >= 3 && 
                        conteudo.trim().length >= 3 && 
                        !enviando;

    const handleEnviar = async () => {
        if (!podeEnviar) return;
        
        try {
            setErro(null);
            setEnviando(true);

            // 'type' foi removido do objeto de dados
            const postData = {
                title: titulo.trim(),
                content: conteudo.trim(),
            };

            if (isEditing) {
                await updatePost(postId, postData);
            } else {
                await createPost(postData);
            }

            navigate("/comunicados");
        } catch (e) {
            console.error(e);
            setErro(e.message || "Falha ao salvar comunicado");
        } finally {
            setEnviando(false);
        }
    };

    const handleCancelar = () => {
        navigate("/comunicados");
    };

    if (carregando) {
        return (
            <>
                <Navbar />
                <div className="d-flex">
                    <MenuLateral />
                    <div className="container-fluid mt-4">
                        <div className="text-center p-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Carregando…</span>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="d-flex">
                <MenuLateral />
                <div className="container-fluid mt-4">
                    {erro && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            {erro}
                            <button type="button" className="btn-close" onClick={() => setErro(null)} />
                        </div>
                    )}

                    <div className="card shadow-sm">
                        <div className="card-header bg-primary text-white fw-semibold">
                            {/* Texto alterado para "Comunicado" */}
                            {isEditing ? "Editar Comunicado" : "Novo Comunicado"}
                        </div>

                        <div className="card-body">
                            {/* O seletor de TIPO (Comunicado/Aviso) foi REMOVIDO daqui */}

                            <div className="mb-3">
                                <label className="form-label fw-semibold">Título</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Ex.: Reunião geral de semestre"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    disabled={enviando}
                                    maxLength={200}
                                />
                                <div className="d-flex justify-content-between mt-1">
                                    <small className="text-muted">Mínimo 3 caracteres</small>
                                    <small className="text-muted">{titulo.length}/200</small>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-semibold">Conteúdo</label>
                                <textarea
                                    className="form-control"
                                    placeholder="Escreva o conteúdo do comunicado..."
                                    rows={8}
                                    value={conteudo}
                                    onChange={(e) => setConteudo(e.target.value)}
                                    disabled={enviando}
                                    maxLength={5000}
                                />
                                <div className="d-flex justify-content-between mt-1">
                                    <small className="text-muted">Mínimo 3 caracteres</small>
                                    <small className="text-muted">{conteudo.length}/5000</small>
                                </div>
                            </div>

                            <div className="d-flex justify-content-between mt-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={handleCancelar}
                                    disabled={enviando}
                                >
                                    <i className="bi bi-x-circle me-2"></i>
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleEnviar}
                                    disabled={!podeEnviar}
                                >
                                    {enviando ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            {isEditing ? "Salvando…" : "Publicando…"}
                                        </>
                                    ) : (
                                        <>
                                            <i className={`bi ${isEditing ? 'bi-check-circle' : 'bi-send'} me-2`}></i>
                                            {isEditing ? "Salvar Alterações" : "Publicar"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="my-3 small text-muted">
                        <i className="bi bi-info-circle me-2"></i>
                        {/* Texto de ajuda atualizado */}
                        Comunicados são enviados como notificação para todos os usuários.
                    </div>
                </div>
            </div>
        </>
    );
}