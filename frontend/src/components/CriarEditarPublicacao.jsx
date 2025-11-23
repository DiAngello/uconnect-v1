import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { createPost, updatePost, getPost } from "../services/api";

export default function CriarEditarPublicacao() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const isEditing = !!postId;

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // textarea + modal
  const textareaRef = useRef(null);
  const [showModalLink, setShowModalLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [cursorRange, setCursorRange] = useState({ start: null, end: null });

  useEffect(() => {
    if (isEditing) {
      const loadPost = async () => {
        try {
          setCarregando(true);
          const post = await getPost(postId);
          setTitulo(post.title || "");
          setConteudo(post.content || "");
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

  const podeEnviar =
    titulo.trim().length >= 3 &&
    conteudo.trim().length >= 3 &&
    !enviando;

  const handleEnviar = async () => {
    if (!podeEnviar) return;

    try {
      setErro(null);
      setEnviando(true);

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

  // ABRIR MODAL E SALVAR CURSOR
  const handleAbrirModalLink = () => {
    const textarea = textareaRef.current;

    if (textarea) {
      setCursorRange({
        start: textarea.selectionStart ?? conteudo.length,
        end: textarea.selectionEnd ?? conteudo.length,
      });
    } else {
      setCursorRange({
        start: conteudo.length,
        end: conteudo.length,
      });
    }

    setLinkUrl("");
    setShowModalLink(true);
  };

  const handleFecharModalLink = () => {
    setShowModalLink(false);
  };

  // INSERIR LINK NO TEXTO
  const handleConfirmarLink = () => {
    if (!linkUrl.trim()) return;

    const start = cursorRange.start ?? conteudo.length;
    const end = cursorRange.end ?? conteudo.length;

    const before = conteudo.substring(0, start);
    const after = conteudo.substring(end);

    const linkTexto = linkUrl.trim(); // somente o link

    const novoConteudo = before + linkTexto + after;
    setConteudo(novoConteudo);
    setShowModalLink(false);

    // retorna o cursor para o local correto
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = start + linkTexto.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
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
            <div
              className="alert alert-danger alert-dismissible fade show"
              role="alert"
            >
              {erro}
              <button
                type="button"
                className="btn-close"
                onClick={() => setErro(null)}
              />
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white fw-semibold">
              {isEditing ? "Editar Comunicado" : "Novo Comunicado"}
            </div>

            <div className="card-body">
              {/* TÍTULO */}
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

              {/* CONTEÚDO */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label fw-semibold mb-0">
                    Conteúdo
                  </label>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleAbrirModalLink}
                    disabled={enviando}
                  >
                    <i className="bi bi-link-45deg me-1"></i>
                    Inserir link
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  className="form-control mt-1"
                  placeholder="Escreva o conteúdo do comunicado (você pode colar links aqui, ex.: https://www.ucb.br/edital)..."
                  rows={8}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  disabled={enviando}
                  maxLength={5000}
                />
                <div className="d-flex justify-content-between mt-1">
                  <small className="text-muted">
                    Mínimo 3 caracteres. Links são automaticamente detectados.
                  </small>
                  <small className="text-muted">{conteudo.length}/5000</small>
                </div>
              </div>

              {/* BOTÕES */}
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
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      {isEditing ? "Salvando…" : "Publicando…"}
                    </>
                  ) : (
                    <>
                      <i
                        className={`bi ${
                          isEditing ? "bi-check-circle" : "bi-send"
                        } me-2`}
                      ></i>
                      {isEditing ? "Salvar Alterações" : "Publicar"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="my-3 small text-muted">
            <i className="bi bi-info-circle me-2"></i>
            Comunicados são enviados como notificação para todos os usuários.
          </div>
        </div>
      </div>

      {/* MODAL SIMPLIFICADO */}
      {showModalLink && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                
                <div className="modal-header">
                  <h5 className="modal-title">Inserir link</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleFecharModalLink}
                  ></button>
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">URL do link</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://www.exemplo.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                  </div>

                  <small className="text-muted">
                    O link será inserido exatamente na posição do cursor.
                  </small>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleFecharModalLink}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmarLink}
                    disabled={!linkUrl.trim()}
                  >
                    Inserir
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* BACKDROP */}
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </>
  );
}