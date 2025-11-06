# ---------------- DEPENDÊNCIAS DA APLICAÇÃO ---------------- #
"""
Este arquivo, dependencies.py, define as dependências reutilizáveis para a
aplicação FastAPI. As dependências são funções que o FastAPI injeta nas rotas
para executar tarefas comuns, como autenticação e autorização. Isso ajuda a
manter o código das rotas limpo e focado em sua lógica de negócio,
centralizando as validações de usuário em um único lugar.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from . import models
from .db import get_db
from .utils import decode_token

# --- Esquema de Autenticação OAuth2 ---
# Define o esquema de segurança. OAuth2PasswordBearer aponta para a URL de login
# (`tokenUrl`) e informa ao FastAPI como extrair o token do cabeçalho da requisição.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# --- Dependência: Obter Usuário Atual (Autenticação) ---
# Esta é a principal dependência de autenticação. Ela executa os seguintes passos:
# 1. Extrai o token da requisição usando o `oauth2_scheme`.
# 2. Decodifica o token JWT para obter o payload (o ID do usuário).
# 3. Busca o usuário correspondente no banco de dados.
# 4. Retorna o objeto do usuário ou lança uma exceção HTTP 401 se qualquer passo falhar.
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


# --- Dependência: Obter Usuário Ativo ---
# Uma dependência que utiliza `get_current_user` para primeiro obter o usuário
# e depois verifica se o status de acesso dele é "ativo". Lança uma exceção
# HTTP 400 se o usuário estiver inativo.
async def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.accessStatus != models.AccessStatus.active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return current_user


# --- Fábrica de Dependências: Verificador de Papéis (Autorização) ---
# Esta é uma "fábrica de dependências". É uma função que recebe uma lista de
# papéis (`allowed_roles`) e retorna outra função (a dependência `role_checker`).
# Essa dependência, por sua vez, verifica se o papel do usuário ativo está na
# lista de papéis permitidos. Lança uma exceção HTTP 403 (Forbidden) se a
# permissão for negada. Isso permite um controle de acesso granular nas rotas.
def require_roles(allowed_roles: list[str]):
    async def role_checker(current_user: models.User = Depends(get_current_active_user)):
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão negada. Acesso não autorizado."
            )
        return current_user
    return role_checker
