from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db import get_db
from .. import schemas, models
from ..utils import require_roles, get_current_active_user
from .notifications import notify_new_announcement

# Roteador principal que será exportado e importado no main.py
router = APIRouter()

# --- 1. Roteador para Posts (Comunicados) ---
posts_router = APIRouter(prefix="/posts", tags=["Posts (Comunicados)"])

@posts_router.post("/", response_model=schemas.PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: schemas.PostCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["teacher", "coordinator", "admin"]))
):
    new_post = models.Post(
        title=post.title,
        content=post.content,
        authorId=current_user.id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    # NOTA: A notificação de 'announcement' foi removida daqui. 
    # Se você tiver uma notificação para 'posts', adicione-a aqui.
    
    return new_post

@posts_router.get("/", response_model=List[schemas.PostResponse])
def get_all_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    query = db.query(models.Post)
    posts = query.order_by(models.Post.date.desc()).offset(skip).limit(limit).all()
    return posts

@posts_router.get("/{post_id}", response_model=schemas.PostResponse)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comunicado não encontrado"
        )
    return post

@posts_router.patch("/{post_id}", response_model=schemas.PostResponse)
def update_post(
    post_id: int,
    post_update: schemas.PostUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["teacher", "coordinator", "admin"]))
):
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comunicado não encontrado"
        )

    is_author = db_post.authorId == current_user.id
    is_privileged = current_user.role in [models.UserRole.coordinator, models.UserRole.admin]

    if not is_author and not is_privileged:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para editar"
        )
    
    update_data = post_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_post, key, value)
    
    db.commit()
    db.refresh(db_post)
    return db_post

@posts_router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["teacher", "coordinator", "admin"]))
):
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comunicado não encontrado"
        )
    
    is_author = db_post.authorId == current_user.id
    is_privileged = current_user.role in [models.UserRole.coordinator, models.UserRole.admin]

    if not is_author and not is_privileged:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para deletar"
        )

    db.delete(db_post)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@posts_router.get("/stats/count")
def get_posts_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    total = db.query(models.Post).count()
    return {"total": total}


# --- 2. Roteador para Announcements (Avisos) ---
announcements_router = APIRouter(prefix="/announcements", tags=["Announcements (Avisos)"])

@announcements_router.post("/", response_model=schemas.AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["teacher", "coordinator", "admin"]))
):
    new_announcement = models.Announcement(
        title=announcement.title,
        content=announcement.content,
        authorId=current_user.id
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    
    # Notificação adicionada no local correto
    await notify_new_announcement(new_announcement.id, new_announcement.title, current_user.name, db)
    
    return new_announcement

@announcements_router.get("/", response_model=List[schemas.AnnouncementResponse])
def get_all_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    query = db.query(models.Announcement)
    announcements = query.order_by(models.Announcement.date.desc()).offset(skip).limit(limit).all()
    return announcements

@announcements_router.get("/{announcement_id}", response_model=schemas.AnnouncementResponse)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aviso não encontrado"
        )
    return announcement

@announcements_router.patch("/{announcement_id}", response_model=schemas.AnnouncementResponse)
def update_announcement(
    announcement_id: int,
    announcement_update: schemas.AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["teacher", "coordinator", "admin"]))
):
    db_announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not db_announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aviso não encontrado"
        )

    is_author = db_announcement.authorId == current_user.id
    is_privileged = current_user.role in [models.UserRole.coordinator, models.UserRole.admin]

    if not is_author and not is_privileged:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para editar"
        )
    
    update_data = announcement_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_announcement, key, value)
    
    db.commit()
    # --- CORREÇÃO AQUI ---
    # Troquei 'db_a' por 'db_announcement'
    db.refresh(db_announcement)
    return db_announcement
    # --- FIM DA CORREÇÃO ---

@announcements_router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["teacher", "coordinator", "admin"]))
):
    db_announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not db_announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aviso não encontrado"
        )
    
    is_author = db_announcement.authorId == current_user.id
    is_privileged = current_user.role in [models.UserRole.coordinator, models.UserRole.admin]

    if not is_author and not is_privileged:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para deletar"
        )

    db.delete(db_announcement)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@announcements_router.get("/stats/count")
def get_announcements_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    total = db.query(models.Announcement).count()
    return {"total": total}


# --- 3. Incluir os roteadores no principal ---
router.include_router(posts_router)
router.include_router(announcements_router)