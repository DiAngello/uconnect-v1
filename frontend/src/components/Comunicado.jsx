import { useEffect, useMemo, useState, useCallback } from "react";
import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import {
  getCourses,
  getSubjects,
  getClasses,
  sendAnnouncement,
} from "../services/api";

function CaixaSelecao({
  titulo,
  placeholder,
  itens,
  selecionados,
  onToggle,
  onSelecionarTodos,
  onDesmarcarTodos,
  loading,
  erro,
  onSearchChange,
}) {
  return (
    <div className="col-md-4">
      <div className="mb-2 fw-semibold">{titulo}</div>

      <div className="input-group mb-2">
        <span className="input-group-text bg-light">
          <i className="bi bi-search" />
        </span>
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="border rounded" style={{ height: 360, overflowY: "auto", background: "#fff" }}>
        {loading ? (
          <div className="p-4 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando…</span>
            </div>
          </div>
        ) : erro ? (
          <div className="p-3 text-danger small">{erro}</div>
        ) : itens.length === 0 ? (
          <div className="p-3 text-muted small">Nenhum item encontrado</div>
        ) : (
          <ul className="list-group list-group-flush">
            {itens.map((it) => (
              <li key={it.id} className="list-group-item d-flex align-items-start">
                <input
                  className="form-check-input me-2 mt-1"
                  type="checkbox"
                  checked={selecionados.includes(it.id)}
                  onChange={() => onToggle(it.id)}
                  id={`${titulo}-${it.id}`}
                />
                <label htmlFor={`${titulo}-${it.id}`} style={{ cursor: "pointer" }} className="mb-0">
                  <div className="fw-semibold text-truncate" style={{ maxWidth: 260 }}>
                    {it.name}
                  </div>
                  {it.code && <div className="text-muted small">Código: {it.code}</div>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="d-flex gap-2 mt-2">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onDesmarcarTodos} disabled={loading}>
          Desmarcar tudo
        </button>
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={onSelecionarTodos} disabled={loading || itens.length === 0}>
          Selecionar todos
        </button>
      </div>
    </div>
  );
}

export default function Comunicado() {
  const [titulo, setTitulo] = useState("Comunicado");
  const [mensagem, setMensagem] = useState("");

  const [cursos, setCursos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [turmas, setTurmas] = useState([]);

  const [loadCursos, setLoadCursos] = useState(false);
  const [loadMaterias, setLoadMaterias] = useState(false);
  const [loadTurmas, setLoadTurmas] = useState(false);

  const [errCursos, setErrCursos] = useState(null);
  const [errMaterias, setErrMaterias] = useState(null);
  const [errTurmas, setErrTurmas] = useState(null);

  const [selCursos, setSelCursos] = useState([]);
  const [selMaterias, setSelMaterias] = useState([]);
  const [selTurmas, setSelTurmas] = useState([]);

  const [qCurso, setQCurso] = useState("");
  const [qMateria, setQMateria] = useState("");
  const [qTurma, setQTurma] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // debounce simples
  const useDebounced = (value, delay = 300) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const id = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
  };

  const qCursoDeb = useDebounced(qCurso);
  const qMateriaDeb = useDebounced(qMateria);
  const qTurmaDeb = useDebounced(qTurma);

  const carregarCursos = useCallback(async () => {
    try {
      setLoadCursos(true);
      setErrCursos(null);
      const data = await getCourses(qCursoDeb);
      setCursos(data);
    } catch (e) {
      console.error(e);
      setErrCursos("Erro ao carregar cursos");
    } finally {
      setLoadCursos(false);
    }
  }, [qCursoDeb]);

  const carregarMaterias = useCallback(async () => {
    try {
      setLoadMaterias(true);
      setErrMaterias(null);
      const data = await getSubjects(qMateriaDeb);
      setMaterias(data);
    } catch (e) {
      console.error(e);
      setErrMaterias("Erro ao carregar matérias");
    } finally {
      setLoadMaterias(false);
    }
  }, [qMateriaDeb]);

  const carregarTurmas = useCallback(async () => {
    try {
      setLoadTurmas(true);
      setErrTurmas(null);
      const data = await getClasses(qTurmaDeb);
      setTurmas(data);
    } catch (e) {
      console.error(e);
      setErrTurmas("Erro ao carregar turmas");
    } finally {
      setLoadTurmas(false);
    }
  }, [qTurmaDeb]);

  useEffect(() => { carregarCursos(); }, [carregarCursos]);
  useEffect(() => { carregarMaterias(); }, [carregarMaterias]);
  useEffect(() => { carregarTurmas(); }, [carregarTurmas]);

  const toggle = (lista, setLista, id) => {
    setLista((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const podeEnviar = useMemo(() => {
    const hasAlvo = selCursos.length || selMaterias.length || selTurmas.length;
    return titulo.trim().length > 0 && mensagem.trim().length > 0 && hasAlvo && !enviando;
  }, [titulo, mensagem, selCursos, selMaterias, selTurmas, enviando]);

  const handleEnviar = async () => {
    if (!podeEnviar) return;
    try {
      setErro(null);
      setSucesso(null);
      setEnviando(true);

      // envia post; filtros podem ser logados pelo backend no futuro
      await sendAnnouncement({
        title: titulo.trim(),
        message: mensagem.trim(),
        course_ids: selCursos,
        subject_ids: selMaterias,
        class_ids: selTurmas,
      });

      setSucesso("Comunicado enviado com sucesso.");
      setMensagem("");
    } catch (e) {
      console.error(e);
      setErro(e.message || "Falha ao enviar comunicado");
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelar = () => {
    setTitulo("Comunicado");
    setMensagem("");
    setSelCursos([]);
    setSelMaterias([]);
    setSelTurmas([]);
    setErro(null);
    setSucesso(null);
  };

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
          {sucesso && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              {sucesso}
              <button type="button" className="btn-close" onClick={() => setSucesso(null)} />
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white fw-semibold">Novo comunicado</div>

            <div className="card-body">
              {/* Título */}
              <div className="mb-3">
                <label className="form-label">Título</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex.: Aviso importante"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  disabled={enviando}
                />
              </div>

              {/* Texto */}
              <div className="mb-3">
                <div className="fw-semibold mb-2">Dados básicos do comunicado</div>
                <label className="form-label">Texto do comunicado</label>
                <textarea
                  className="form-control"
                  placeholder="Insira o comunicado que deseja enviar"
                  rows={4}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  disabled={enviando}
                />
                <div className="d-flex justify-content-end mt-1 small text-muted">
                  {mensagem.length}/1000
                </div>
              </div>

              <hr />

              <div className="mb-2 fw-semibold">Canais de envio</div>

              <div className="row g-3">
                <CaixaSelecao
                  titulo="Selecione o(s) curso(s)"
                  placeholder="Busque pelo nome do curso ou código"
                  itens={cursos}
                  selecionados={selCursos}
                  onToggle={(id) => toggle(selCursos, setSelCursos, id)}
                  onSelecionarTodos={() => setSelCursos(cursos.map((c) => c.id))}
                  onDesmarcarTodos={() => setSelCursos([])}
                  loading={loadCursos}
                  erro={errCursos}
                  onSearchChange={setQCurso}
                />

                <CaixaSelecao
                  titulo="Selecione a(s) matéria(s)"
                  placeholder="Busque pelo nome da matéria ou código"
                  itens={materias}
                  selecionados={selMaterias}
                  onToggle={(id) => toggle(selMaterias, setSelMaterias, id)}
                  onSelecionarTodos={() => setSelMaterias(materias.map((m) => m.id))}
                  onDesmarcarTodos={() => setSelMaterias([])}
                  loading={loadMaterias}
                  erro={errMaterias}
                  onSearchChange={setQMateria}
                />

                <CaixaSelecao
                  titulo="Selecione a(s) turma(s)"
                  placeholder="Busque pelo nome da turma ou código"
                  itens={turmas}
                  selecionados={selTurmas}
                  onToggle={(id) => toggle(selTurmas, setSelTurmas, id)}
                  onSelecionarTodos={() => setSelTurmas(turmas.map((t) => t.id))}
                  onDesmarcarTodos={() => setSelTurmas([])}
                  loading={loadTurmas}
                  erro={errTurmas}
                  onSearchChange={setQTurma}
                />
              </div>

              <div className="d-flex justify-content-between mt-4">
                <button type="button" className="btn btn-outline-secondary" onClick={handleCancelar} disabled={enviando}>
                  Cancelar
                </button>

                <div className="d-flex align-items-center gap-3">
                  <div className="text-muted small">
                    <span className="me-3">Cursos: <span className="fw-semibold">{selCursos.length}</span></span>
                    <span className="me-3">Matérias: <span className="fw-semibold">{selMaterias.length}</span></span>
                    <span>Turmas: <span className="fw-semibold">{selTurmas.length}</span></span>
                  </div>

                  <button type="button" className="btn btn-primary" onClick={handleEnviar} disabled={!podeEnviar}>
                    {enviando ? "Enviando…" : "Enviar comunicado"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="my-3 small text-muted">
            Você pode enviar para qualquer combinação de cursos, matérias e turmas.
          </div>
        </div>
      </div>
    </>
  );
}