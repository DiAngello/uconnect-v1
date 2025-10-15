import { useState, useEffect } from "react";
import Fullcalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import ptBr from "@fullcalendar/core/locales/pt-br";
import { Tooltip, Modal } from "bootstrap";


import Navbar from "./navBar";
import MenuLateral from "./MenuLateral"; // ✅ Novo componente lateral

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

import "../styles/calendario.css";

const API_URL = "http://localhost:8000";

// Funções auxiliares
const dataLocalYYYYMMDD = (d = new Date()) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatarDataBR = (dataString) => {
  const [ano, mes, dia] = dataString.split("-");
  return `${dia}/${mes}/${ano}`;
};

function Calendario() {
  const HOJE = dataLocalYYYYMMDD();
  
  const mostrarModalSessaoExpirada = () => {
    const el = document.getElementById("modalSessaoExpirada");
    if (el) {
      const modal = new Modal(el, { backdrop: "static", keyboard: false });
      modal.show();
    }
  };

  const [eventos, setEventos] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [formulario, setFormulario] = useState({
    id: null,
    titulo: "",
    data: "",
    inicio: "",
    fim: "",
    descricao: "",
    local: "",
  });
  const [modoEdicao, setModoEdicao] = useState(false);

  // Atualiza agenda do dia
  useEffect(() => {
    setAgenda(eventos.filter((ev) => ev.date === HOJE));
  }, [eventos, HOJE]);

  // Busca eventos do backend
  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const resp = await fetch(`${API_URL}/events`);
        if (!resp.ok) throw new Error("Erro ao buscar eventos");
        const data = await resp.json();

        const eventosConvertidos = data.map((ev) => ({
          id: ev.id,
          title: ev.title,
          date: ev.eventDate,
          timestamp: ev.timestamp,
          startTime: ev.startTime ? ev.startTime.substring(0, 5) : "",
          endTime: ev.endTime ? ev.endTime.substring(0, 5) : "",
          hora: ev.startTime
            ? ev.endTime
              ? `${ev.startTime.substring(0, 5)} - ${ev.endTime.substring(0, 5)}`
              : ev.startTime.substring(0, 5)
            : "",
          description: ev.description || "",
          descricao: ev.description || "",
          local: ev.academicGroupId || "",
          academicGroupId: ev.academicGroupId || "",
        }));

        setEventos(eventosConvertidos);
      } catch (err) {
        console.error("Erro ao buscar eventos:", err);
      }
    };
    fetchEventos();
  }, []);

  useEffect(() => {
  const verificarToken = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      mostrarModalSessaoExpirada();
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000;
      if (Date.now() >= exp) {
        localStorage.removeItem("accessToken");
        mostrarModalSessaoExpirada();
      }
    } catch {
      mostrarModalSessaoExpirada();
    }
  };

  verificarToken();
  const interval = setInterval(verificarToken, 30000);
  return () => clearInterval(interval);
}, []);


  // Limpa formulário
  const resetarFormulario = () => {
    setFormulario({
      id: null,
      titulo: "",
      data: "",
      inicio: "",
      fim: "",
      descricao: "",
      local: "",
    });
    setModoEdicao(false);
  };

  // Adicionar evento
  const adicionarEvento = async () => {
    if (!formulario.titulo || !formulario.data) {
      alert("Preencha pelo menos o título e a data!");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }

    const novoEvento = {
      title: formulario.titulo,
      date: formulario.data,
      description: formulario.descricao,
      local: formulario.local,
    };

    try {
      const resp = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(novoEvento),
      });

      if (!resp.ok) throw new Error("Erro ao criar evento");

      const saved = await resp.json();
      setEventos((prev) => [...prev, saved]);
      resetarFormulario();
    } catch (err) {
      console.error("Erro:", err);
      alert("Erro ao criar evento");
    }
  };

  // Editar evento
  const salvarEdicao = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }

    const atualizado = {
      title: formulario.titulo,
      date: formulario.data,
      description: formulario.descricao,
      local: formulario.local,
    };

    try {
      const resp = await fetch(`${API_URL}/events/${formulario.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(atualizado),
      });

      if (!resp.ok) throw new Error("Erro ao atualizar evento");
      const saved = await resp.json();

      setEventos((prev) =>
        prev.map((ev) => (ev.id === formulario.id ? saved : ev))
      );
      resetarFormulario();
    } catch (err) {
      console.error("Erro ao editar evento:", err);
    }
  };

  // Excluir evento
  const excluirEvento = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }

    if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;

    try {
      const resp = await fetch(`${API_URL}/events/${formulario.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) throw new Error("Erro ao excluir evento");

      setEventos((prev) => prev.filter((ev) => ev.id !== formulario.id));
      resetarFormulario();
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
  };

  const buildTooltipHtml = (ev) => `
    <b>${ev.title}</b><br/>
    ${ev.hora ? "Horário: " + ev.hora + "<br/>" : ""}
    ${ev.local ? "Local: " + ev.local + "<br/>" : ""}
    ${ev.descricao ? "Descrição: " + ev.descricao : ""}
  `;

  return (
    <>
      <Navbar />

      <div className="d-flex">
        {/* 🔹 Menu Lateral */}
        <MenuLateral />

        {/* 🔹 Conteúdo principal */}
        <div className="container-fluid mt-4">
          <div className="row">
            {/* 📅 Calendário */}
            <div className="col-md-8">
              <div className="card shadow-lg">
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-3">
                    <h4>📅 Calendário Acadêmico - UCONNECT</h4>
                    <button
                      className="btn btn-success"
                      data-bs-toggle="modal"
                      data-bs-target="#modalEvento"
                      onClick={() => resetarFormulario()}
                    >
                      + Adicionar Evento
                    </button>
                  </div>

                  <Fullcalendar
                    plugins={[
                      dayGridPlugin,
                      timeGridPlugin,
                      interactionPlugin,
                      listPlugin,
                    ]}
                    initialView="dayGridMonth"
                    locale={ptBr}
                    height="600px"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                    }}
                    views={{ dayGridMonth: { displayEventTime: false } }}
                    events={eventos.map((ev) => ({
                      id: ev.id?.toString(),
                      title: ev.title,
                      start: ev.date,
                      backgroundColor: "#1E90FF",
                      textColor: "#fff",
                      borderColor: "#1E90FF",
                      extendedProps: {
                        hora: ev.hora,
                        descricao: ev.descricao,
                        local: ev.local,
                      },
                    }))}
                    eventMouseEnter={(info) => {
                      const html = buildTooltipHtml(info.event.extendedProps);
                      const old = Tooltip.getInstance(info.el);
                      if (old) old.dispose();
                      const tip = new Tooltip(info.el, {
                        title: html,
                        placement: "top",
                        trigger: "manual",
                        container: "body",
                        html: true,
                      });
                      tip.show();
                    }}
                    eventMouseLeave={(info) => {
                      const tip = Tooltip.getInstance(info.el);
                      if (tip) tip.dispose();
                    }}
                    eventClick={(info) => {
                      const ev = info.event;
                      const props = ev.extendedProps;
                      setFormulario({
                        id: parseInt(ev.id),
                        titulo: ev.title,
                        data: ev.startStr.split("T")[0],
                        descricao: props.descricao || "",
                        local: props.local || "",
                      });
                      setModoEdicao(true);
                      const modalEl = document.getElementById("modalEvento");
                      const modal = Modal.getOrCreateInstance(modalEl);
                      modal.show();
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 📘 Agenda do Dia */}
            <div className="col-md-4">
              <div className="agenda-card">
                <div className="agenda-header">
                  Agenda do Dia ({formatarDataBR(HOJE)})
                </div>
                <div className="agenda-list">
                  {agenda.length > 0 ? (
                    agenda.map((ev) => (
                      <div key={ev.id} className="agenda-item">
                        <strong>{ev.title}</strong>
                        {ev.hora && <small>{ev.hora}</small>}
                        {ev.local && (
                          <small className="d-block text-muted">
                            📍 {ev.local}
                          </small>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted mb-0">
                      Nenhum evento para hoje.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 🧩 Modal */}
          <div
            className="modal fade"
            id="modalEvento"
            tabIndex="-1"
            aria-labelledby="modalEventoLabel"
            aria-hidden="true"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="modalEventoLabel">
                    {modoEdicao ? "Editar Evento" : "Adicionar Evento"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Fechar"
                    onClick={resetarFormulario}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Título</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formulario.titulo}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          titulo: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Data</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formulario.data}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          data: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Local</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formulario.local}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          local: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Descrição</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formulario.descricao}
                      onChange={(e) =>
                        setFormulario({
                          ...formulario,
                          descricao: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  {modoEdicao && (
                    <button
                      type="button"
                      className="btn btn-danger me-auto"
                      onClick={excluirEvento}
                      data-bs-dismiss="modal"
                    >
                      Excluir
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-bs-dismiss="modal"
                    onClick={resetarFormulario}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={modoEdicao ? salvarEdicao : adicionarEvento}
                    data-bs-dismiss="modal"
                  >
                    {modoEdicao ? "Salvar Alterações" : "Adicionar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        
          {/* Modal Sessão Expirada */}
          <div
            className="modal fade"
            id="modalSessaoExpirada"
            tabIndex="-1"
            aria-labelledby="modalSessaoExpiradaLabel"
            aria-hidden="true"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content text-center p-3">
                <div className="modal-body">
                  <h5 className="mb-3 text-danger fw-bold">
                    Sessão Expirada
                  </h5>
                  <p>Faça login novamente para continuar.</p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => {
                      localStorage.removeItem("accessToken");
                      window.location.href = "/login";
                    }}
                  >
                    Ir para login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Calendario;