import { useState, useEffect } from "react";
import Fullcalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import ptBr from "@fullcalendar/core/locales/pt-br";
import { Tooltip, Modal } from "bootstrap";

import Navbar from "./navBar";
import MenuLateral from "./MenuLateral";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/calendario.css";

const API_URL = "http://localhost:8000";

function Calendario() {
  const [eventos, setEventos] = useState([]);
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

  // ---------------------------------
  // Buscar eventos do backend
  // ---------------------------------
  const fetchEventos = async () => {
    try {
      const resp = await fetch(`${API_URL}/events`);
      const data = await resp.json();

      const eventosConvertidos = data.map((ev) => {
        const startStr = ev.startTime ? ev.startTime.substring(0, 5) : "";
        const endStr = ev.endTime ? ev.endTime.substring(0, 5) : "";
        let horaStr = "";
        if (startStr && endStr) horaStr = `${startStr} - ${endStr}`;
        else if (startStr) horaStr = startStr;
        else if (endStr) horaStr = endStr;

        return {
          id: ev.id,
          title: ev.title,
          date: ev.eventDate,
          timestamp: ev.timestamp,
          startTime: startStr, // "HH:MM"
          endTime: endStr, // "HH:MM"
          hora: horaStr,
          description: ev.description || "",
          descricao: ev.description || "",
          local: ev.academicGroupId || "",
          academicGroupId: ev.academicGroupId || "",
        };
      });

      setEventos(eventosConvertidos);
    } catch (err) {
      console.error("Erro ao buscar eventos:", err);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  // ---------------------------------
  // Limpar formulário
  // ---------------------------------
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

  // Monta string "hora" para mandar ao back
  const montarHora = () => {
    const { inicio, fim } = formulario;
    if (inicio && fim) return `${inicio} - ${fim}`;
    if (inicio) return inicio;
    if (fim) return fim;
    return "";
  };

  // ---------------------------------
  // Criar evento
  // ---------------------------------
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
      hora: montarHora(),
      description: formulario.descricao,
      local: formulario.local,
      academicGroupId: formulario.local,
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

      if (!resp.ok) {
        console.warn(
          "Aviso: backend respondeu",
          resp.status,
          "ao criar evento (bug de validação startTime/endTime)."
        );
      }
    } catch (err) {
      console.error("Erro de rede ao criar evento:", err);
      alert("Não foi possível se conectar ao servidor.");
      return;
    }

    await fetchEventos();
    resetarFormulario();
  };

  // ---------------------------------
  // Editar evento
  // ---------------------------------
  const salvarEdicao = async () => {
    if (!formulario.titulo || !formulario.data) {
      alert("Preencha pelo menos o título e a data!");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }

    const atualizado = {
      title: formulario.titulo,
      date: formulario.data,
      hora: montarHora(),
      description: formulario.descricao,
      local: formulario.local,
      academicGroupId: formulario.local,
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

      if (!resp.ok) {
        console.warn(
          "Aviso: backend respondeu",
          resp.status,
          "ao editar evento (bug de validação startTime/endTime)."
        );
      }
    } catch (err) {
      console.error("Erro de rede ao editar evento:", err);
      alert("Não foi possível se conectar ao servidor.");
      return;
    }

    await fetchEventos();
    resetarFormulario();
  };

  // ---------------------------------
  // Excluir evento
  // ---------------------------------
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        console.warn(
          "Aviso: backend respondeu",
          resp.status,
          "ao excluir evento."
        );
      }
    } catch (err) {
      console.error("Erro de rede ao excluir evento:", err);
      alert("Não foi possível se conectar ao servidor.");
      return;
    }

    await fetchEventos();
    resetarFormulario();
  };

  // ---------------------------------
  // Tooltip
  // ---------------------------------
  const buildTooltipHtml = (props) => {
    let horaTexto = props.hora;

    if (!horaTexto) {
      const ini = props.inicio;
      const fim = props.fim;
      if (ini && fim) horaTexto = `${ini} - ${fim}`;
      else if (ini) horaTexto = ini;
      else if (fim) horaTexto = fim;
    }

    return `
      <b>${props.title || ""}</b><br/>
      ${horaTexto ? "Horário: " + horaTexto + "<br/>" : ""}
      ${props.local ? "Local: " + props.local + "<br/>" : ""}
      ${props.descricao ? "Descrição: " + props.descricao : ""}
    `;
  };

  return (
    <>
      <Navbar />

      <div className="d-flex">
        <MenuLateral />

        <div className="container-fluid mt-4">
          <div className="row">
            <div className="col-12">
              <div className="card shadow-lg">
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-3">
                    <h4>📅 Calendário Acadêmico - UCONNECT</h4>
                    <button
                      className="btn btn-success"
                      data-bs-toggle="modal"
                      data-bs-target="#modalEvento"
                      onClick={resetarFormulario}
                    >
                      + Adicionar Evento
                    </button>
                  </div>

                  <Fullcalendar
                    plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                    initialView="dayGridMonth"
                    locale={ptBr}
                    height="600px"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,listWeek",
                    }}
                    // mês sem horário no texto, lista com horário
                    views={{
                      dayGridMonth: { displayEventTime: false },
                      listWeek: {
                        eventTimeFormat: {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        },
                      },
                    }}
                    // 👇 força exibir como BARRA em vez de bolinha
                    eventDisplay="block"
                    events={eventos.map((ev) => {
                      const hasTime = !!ev.startTime;
                      const start = hasTime
                        ? `${ev.date}T${ev.startTime}`
                        : ev.date;
                      const end = ev.endTime
                        ? `${ev.date}T${ev.endTime}`
                        : undefined;

                      return {
                        id: ev.id?.toString(),
                        title: ev.title,
                        start,
                        end,
                        allDay: !hasTime, // só é "dia inteiro" se realmente não tiver hora
                        backgroundColor: "#1E90FF",
                        textColor: "#fff",
                        borderColor: "#1E90FF",
                        extendedProps: {
                          title: ev.title,
                          hora: ev.hora,
                          descricao: ev.descricao,
                          local: ev.local,
                          inicio: ev.startTime,
                          fim: ev.endTime,
                        },
                      };
                    })}
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
                        inicio: props.inicio || "",
                        fim: props.fim || "",
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
          </div>

          {/* Modal de criação/edição de evento */}
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

                  <div className="row mb-3">
                    <div className="col">
                      <label className="form-label">Início</label>
                      <input
                        type="time"
                        className="form-control"
                        value={formulario.inicio}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            inicio: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col">
                      <label className="form-label">Fim</label>
                      <input
                        type="time"
                        className="form-control"
                        value={formulario.fim}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            fim: e.target.value,
                          })
                        }
                      />
                    </div>
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
        </div>
      </div>
    </>
  );
}

export default Calendario;