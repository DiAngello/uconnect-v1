from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from ..db import get_db
from .. import models, schemas
from ..utils import require_roles

router = APIRouter(
    prefix="/access",
    tags=["Access Manager"]
)

# -------------------------
# Criar permissão para um usuário
# -------------------------
@router.post("/", response_model=schemas.AccessManagerResponse, status_code=status.HTTP_201_CREATED)
def create_access(
    access_data: schemas.AccessManagerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin"]))
):
    db_user = db.query(models.User).filter(models.User.id == access_data.userId).first()
    if not db_user:
        raise HTTPException(404, "Usuário não encontrado")

    access = models.AccessManager(
        userId=access_data.userId,
        permission=access_data.permission,
        createdAt=datetime.utcnow()
    )
    db.add(access)
    db.commit()
    db.refresh(access)
    return access


# -------------------------
# Listar permissões de um usuário
# -------------------------
@router.get("/user/{user_id}", response_model=list[schemas.AccessManagerResponse])
def list_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin", "coordinator"]))
):
    permissions = db.query(models.AccessManager).filter(models.AccessManager.userId == user_id).all()
    return permissions


# -------------------------
# Listar todas as permissões do sistema
# -------------------------
@router.get("/", response_model=list[schemas.AccessManagerResponse])
def list_all_permissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin"]))
):
    return db.query(models.AccessManager).all()


# -------------------------
# Atualizar uma permissão
# -------------------------
@router.patch("/{access_id}", response_model=schemas.AccessManagerResponse)
def update_permission(
    access_id: int,
    access_update: schemas.AccessManagerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin"]))
):
    access = db.query(models.AccessManager).filter(models.AccessManager.id == access_id).first()
    if not access:
        raise HTTPException(404, "Registro de acesso não encontrado")

    update_data = access_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(access, key, value)

    db.commit()
    db.refresh(access)
    return access


# -------------------------
# Deletar permissão
# -------------------------
@router.delete("/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permission(
    access_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin"]))
):
    access = db.query(models.AccessManager).filter(models.AccessManager.id == access_id).first()
    if not access:
        raise HTTPException(404, "Registro de acesso não encontrado")

    db.delete(access)
    db.commit()
    return {"message": "Permissão removida"}


# -------------------------
# Verificar se usuário possui uma permissão
# -------------------------
@router.get("/check/{user_id}/{permission}")
def check_permission(
    user_id: int,
    permission: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin", "coordinator", "teacher"]))
):
    exists = db.query(models.AccessManager).filter(
        models.AccessManager.userId == user_id,
        models.AccessManager.permission == permission
    ).first()

    return {"has_permission": exists is not None}
