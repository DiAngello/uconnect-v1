# ---------------- ROTAS DE EVENTOS (CRUD) ---------------- #
"""
Este arquivo contém todos os endpoints da API para o
gerenciamento de eventos (CRUD - Create, Read, Update, Delete).

Suas responsabilidades incluem:
- Listar e obter eventos, servindo como a fonte de dados para o calendário.
- Permitir a criação de novos eventos por usuários autorizados (admins,
  coordenadores, professores).
- Permitir a atualização e exclusão de eventos, com checagem de permissão para
  garantir que apenas o criador do evento ou um admin possa modificá-lo.
- Processar e formatar campos de data e hora para compatibilidade com o banco
  de dados e as respostas JSON.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, time as dt_time
from .. import models, schemas
from ..db import get_db
from ..utils import require_roles

User = models.User

# --- Configuração do Roteador de Eventos ---
# O `APIRouter` agrupa todas as rotas relacionadas a eventos sob o
# prefixo `/events` e a tag "Events" na documentação da API.
router = APIRouter(
    prefix="/events",
    tags=["Events"]
)

# --- Rota: Listar Todos os Eventos ---
# Endpoint público que retorna uma lista paginada de todos os eventos.
# Ideal para alimentar um calendário geral. Realiza a conversão dos objetos
# `time` do banco para strings no formato "HH:MM:SS" para a resposta JSON.
@router.get("/", response_model=List[schemas.EventResponse])
def list_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    events = db.query(models.Event).offset(skip).limit(limit).all()

    # A conversão manual é necessária para garantir que os objetos `time`
    # sejam serializados corretamente para JSON como strings.
    result = []
    for event in events:
        start_time_str = event.startTime.strftime("%H:%M:%S") if event.startTime else None
        end_time_str = event.endTime.strftime("%H:%M:%S") if event.endTime else None
        
        event_dict = {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "timestamp": event.timestamp,
            "eventDate": event.eventDate,
            "startTime": start_time_str,
            "endTime": end_time_str,
            "academicGroupId": event.academicGroupId,
            "creatorId": event.creatorId,
        }
        result.append(event_dict)
    
    return result

# --- Rota: Obter um Evento Específico ---
# Endpoint público que busca e retorna os detalhes de um único evento
# com base no seu ID. Lança um erro 404 se o evento não for encontrado.
@router.get("/{event_id}", response_model=schemas.EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "timestamp": event.timestamp,
        "eventDate": event.eventDate,
        "startTime": str(event.startTime) if event.startTime else None,
        "endTime": str(event.endTime) if event.endTime else None,
        "academicGroupId": event.academicGroupId,
        "creatorId": event.creatorId,
    }

# --- Rota: Criar um Novo Evento ---
# Endpoint protegido que permite a criação de um novo evento.
# Apenas usuários com os papéis definidos em `require_roles` podem acessá-lo.
# Inclui lógica para converter a string de hora do request em objetos `time`.
@router.post("/", response_model=schemas.EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin", "coordinator", "teacher"]))
):
    start_time, end_time = None, None
    if event_data.hora:
        try:
            hora_parts = [p.strip() for p in event_data.hora.split("-")]
            start_time = datetime.strptime(hora_parts[0], "%H:%M").time()
            if len(hora_parts) > 1:
                end_time = datetime.strptime(hora_parts[1], "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de hora inválido. Use HH:MM ou HH:MM - HH:MM")

    timestamp_obj = datetime.combine(event_data.date, start_time or dt_time(0, 0))

    new_event_db = models.Event(
        title=event_data.title,
        description=event_data.description,
        timestamp=timestamp_obj,
        eventDate=event_data.date,
        startTime=start_time,
        endTime=end_time,
        academicGroupId=event_data.academicGroupId or event_data.local,
        creatorId=current_user.id
    )
    db.add(new_event_db)
    db.commit()
    db.refresh(new_event_db)

    return new_event_db # O Pydantic response_model lida com a conversão

# --- Rota: Atualizar um Evento Existente ---
# Endpoint protegido para modificar um evento. Além da verificação de papel,
# ele garante que apenas o criador original ou um admin possa realizar a atualização.
@router.put("/{event_id}", response_model=schemas.EventResponse)
def update_event(
    event_id: int,
    event_update: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "coordinator", "teacher"]))
):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    if db_event.creatorId != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão negada para editar este evento")

    start_time, end_time = None, None
    if event_update.hora:
        try:
            hora_parts = [p.strip() for p in event_update.hora.split("-")]
            start_time = datetime.strptime(hora_parts[0], "%H:%M").time()
            if len(hora_parts) > 1:
                end_time = datetime.strptime(hora_parts[1], "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de hora inválido. Use HH:MM ou HH:MM - HH:MM")
    
    timestamp_obj = datetime.combine(event_update.date, start_time or dt_time(0, 0))

    db_event.title = event_update.title
    db_event.description = event_update.description
    db_event.timestamp = timestamp_obj
    db_event.eventDate = event_update.date
    db_event.startTime = start_time
    db_event.endTime = end_time
    db_event.academicGroupId = event_update.academicGroupId or event_update.local
    
    db.commit()
    db.refresh(db_event)

    return db_event

# --- Rota: Excluir um Evento ---
# Endpoint protegido para remover um evento do banco de dados. Utiliza as
# mesmas regras de permissão da rota de atualização. Retorna um status
# 204 (No Content) em caso de sucesso.
@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "coordinator", "teacher"]))
):
    event_query = db.query(models.Event).filter(models.Event.id == event_id)
    db_event = event_query.first()

    if not db_event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    if db_event.creatorId != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão negada para excluir este evento")
    
    event_query.delete(synchronize_session=False)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)
