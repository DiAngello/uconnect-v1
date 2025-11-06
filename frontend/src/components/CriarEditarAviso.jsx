import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
// Importa as funções de API para "Avisos" (Announcements)
import { createAnnouncement, updateAnnouncement, getAnnouncement } from "../services/api";

export default function CriarEditarAviso() {
    const navigate = useNavigate();
    // Parâmetro da URL deve ser 'avisoId' (vamos definir na rota)
    const { avisoId } = useParams(); 
    const isEditing = !!avisoId;

    const [titulo, setTitulo] = useState("");
    const [conteudo, setConteudo] = useState("");
    
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState(null);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        if (isEditing) {
            const loadAviso = async () => {
                try {
                    setCarregando(true);
                    // Busca um "Aviso" específico
                    const aviso = await getAnnouncement(avisoId); 
                    setTitulo(aviso.title);
                    setConteudo(aviso.content);
                } catch (error) {
                    console.error("Erro ao carregar aviso:", error);
                    setErro("Erro ao carregar aviso para edição");
                } finally {
                    setCarregando(false);
                }
            };
            loadAviso();
        }
    }, [isEditing, avisoId]);

    const podeEnviar = titulo.trim().length >= 3 && 
                        conteudo.trim().length >= 3 && 
                        !enviando;

    const handleEnviar = async () => {
        if (!podeEnviar) return;
        
        try {
            setErro(null);
            setEnviando(true);

            const avisoData = {
                title: titulo.trim(),
                content: conteudo.trim(),
            };

            if (isEditing) {
                // Atualiza um "Aviso"
                await updateAnnouncement(avisoId, avisoData); 
            } else {
                // Cria um "Aviso"
                await createAnnouncement(avisoData); 
            }

            // Volta para a página do mural (ela saberá qual aba mostrar)
            navigate("/comunicados");
        } catch (e) {
            console.error(e);
            setErro(e.message || "Falha ao salvar aviso");
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
                            {/* Textos alterados para "Aviso" */}
                            {isEditing ? "Editar Aviso" : "Novo Aviso"}
                        </div>

                        <div className="card-body">
                            {/* O seletor de TIPO foi removido */}

                            <div className="mb-3">
                                <label className="form-label fw-semibold">Título</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Ex.: Lembrete sobre data de provas"
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
                                    placeholder="Escreva o conteúdo do aviso..."
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
                        Avisos ficam disponíveis no mural sem notificação automática.
                    </div>
                </div>
            </div>
        </>
    );
}