# ---------------- ROTAS DE GERENCIAMENTO DE USUÁRIOS ---------------- #
"""
Este arquivo define os endpoints da API para o
gerenciamento completo do ciclo de vida dos usuários.

Suas responsabilidades incluem:
- Criação (cadastro) de novos usuários.
- Operações CRUD administrativas para listar, visualizar, atualizar e deletar.
- Endpoints de "self-service" (`/me`) para que os usuários possam gerenciar
  seus próprios perfis.
- Rotas específicas e seguras (`PATCH`) para que administradores e
  coordenadores possam gerenciar status e papéis de outros usuários, com
  lógicas de permissão detalhadas.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas, utils

# --- Configuração do Roteador de Usuários ---
# O `APIRouter` agrupa as rotas de gerenciamento de usuários sob o prefixo
# `/users` e a tag "users" na documentação da API.
router = APIRouter(prefix="/users", tags=["users"])

# --- Rota: Criar um Novo Usuário (Cadastro) ---
# Endpoint público para o cadastro de novos usuários. Verifica se a matrícula
# já existe e armazena a senha de forma segura (com hash).
@router.post("/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.registration == user.registration).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuário já cadastrado")

    hashed_password = utils.get_password_hash(user.password)

    db_user = models.User(
        registration=user.registration,
        name=user.name,
        email=user.email,
        passwordHash=hashed_password,
        role=user.role,
        accessStatus=models.AccessStatus.active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Rota: Listar Todos os Usuários (Admin) ---
# Endpoint protegido (somente Admin) que retorna uma lista paginada de todos
# os usuários do sistema.
@router.get("/", response_model=list[schemas.UserResponse])
def read_users(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.require_roles(["admin"]))
):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

# --- Rota: Visualizar Próprio Perfil ---
# Endpoint para que um usuário autenticado possa obter seus próprios dados.
@router.get("/me", response_model=schemas.UserResponse)
def read_own_profile(current_user: models.User = Depends(utils.get_current_active_user)):
    return current_user

# --- Rota: Atualizar Próprio Perfil ---
# Endpoint para que um usuário possa atualizar suas próprias informações.
# Campos sensíveis como `role` e `accessStatus` são ignorados por segurança.
@router.put("/me", response_model=schemas.UserResponse)
def update_profile(
    user_update: schemas.UserUpdate, db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_active_user)
):
    update_data = user_update.dict(exclude_unset=True)
    update_data.pop("role", None)
    update_data.pop("accessStatus", None)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user

# --- Rota: Atualizar Outro Usuário (Admin) ---
# Endpoint protegido (somente Admin) para atualizar os dados de qualquer
# usuário no sistema.
@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.require_roles(["admin"]))
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Rota: Deletar um Usuário (Admin) ---
# Endpoint protegido (somente Admin) para remover um usuário. Também remove
# todas as sessões ativas associadas a esse usuário.
@router.delete("/{user_id}")
def delete_user(
    user_id: int, db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.require_roles(["admin"]))
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    db.query(models.Session).filter(models.Session.userId == db_user.id).delete()
    db.delete(db_user)
    db.commit()
    return {"message": "Usuário deletado com sucesso"}

# --- Rota: Atualizar Status de Acesso (Admin) ---
# Endpoint específico (somente Admin) para alterar o status de um usuário
# (ativo, inativo, suspenso). Impede que um admin altere o próprio status.
@router.patch("/{user_id}/status", response_model=schemas.UserResponse)
def update_user_status(
    user_id: int, status_update: schemas.UserStatusUpdate, db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.require_roles(["admin"]))
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if db_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Não é permitido alterar o próprio status por esta rota.")

    db_user.accessStatus = status_update.accessStatus
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Rota: Atualizar Papel do Usuário (Admin/Coordenador) ---
# Endpoint com lógica de permissão detalhada para alterar o papel de um
# usuário. Impede auto-alteração, alteração de outros admins e que
# coordenadores atribuam papéis de nível igual ou superior ao seu.
@router.patch("/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int, role_update: schemas.UserRoleUpdate, db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.require_roles(["admin", "coordinator"]))
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if db_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Não é permitido alterar o próprio papel.")
    if db_user.role == models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Não é permitido alterar o papel de um administrador.")

    valid_roles = [role.value for role in models.UserRole]
    if role_update.role not in valid_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"O papel '{role_update.role}' não é válido.")

    if current_user.role == models.UserRole.coordinator:
        if role_update.role in [models.UserRole.admin.value, models.UserRole.coordinator.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Coordenadores não têm permissão para atribuir papéis de administrador ou coordenador."
            )
    
    db_user.role = role_update.role
    db.commit()
    db.refresh(db_user)
    return db_user
