# ---------------- UTILITÁRIOS DE AUTENTICAÇÃO E SEGURANÇA ---------------- #
"""
Este arquivo centraliza todas as
funções e dependências relacionadas à segurança, autenticação (quem o usuário é)
e autorização (o que o usuário pode fazer).

Suas responsabilidades incluem:
- Configurar o hashing de senhas com `bcrypt` via `passlib`.
- Fornecer funções para criar, decodificar e validar senhas e tokens JWT.
- Definir a dependência principal do FastAPI (`get_current_user`) para
  proteger rotas e identificar o usuário logado.
- Criar uma "fábrica de dependências" (`require_roles`) para implementar o
  controle de acesso baseado em papéis (Role-Based Access Control - RBAC).
"""
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from .db import get_db
from . import models
from .config import settings

# --- Configuração e Contexto de Segurança ---
# `pwd_context` inicializa o `passlib` para usar o algoritmo bcrypt.
# `oauth2_scheme` informa ao FastAPI como encontrar o token JWT nas requisições.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# --- Funções Utilitárias de Criptografia e Token ---

def _truncate_password(password: str) -> bytes:
    """Função interna para truncar a senha para o limite de 72 bytes do bcrypt."""
    return password.encode('utf-8')[:72]

def decode_token(token: str) -> dict | None:
    """
    Decodifica um token JWT e retorna o payload.
    Retorna None se o token for inválido.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se uma senha em texto plano corresponde a um hash,
    truncando a senha para compatibilidade com o bcrypt.
    """
    truncated_password = _truncate_password(plain_password)
    return pwd_context.verify(truncated_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Gera o hash de uma senha usando bcrypt,
    truncando a senha para compatibilidade.
    """
    truncated_password = _truncate_password(password)
    return pwd_context.hash(truncated_password)

def create_access_token(data: dict, expires_minutes: int = None) -> tuple[str, datetime]:
    """Cria um novo token de acesso JWT, retornando o token e sua data de expiração."""
    to_encode = data.copy()
    if expires_minutes:
        expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "sub": data.get("sub")})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt, expire

# --- Dependências Principais de Autenticação ---

# Instância de HTTPException reutilizável para erros de autenticação (401).
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Não foi possível validar as credenciais",
    headers={"WWW-Authenticate": "Bearer"},
)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """
    Dependência para obter o usuário atual a partir de um token JWT.
    Valida o token, o usuário, o status de acesso e a sessão no banco de dados.
    """
    payload = decode_token(token)
    
    if payload is None:
        raise credentials_exception
        
    registration: str | None = payload.get("sub")
    if registration is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.registration == registration).first()
    if user is None:
        raise credentials_exception
    
    # Validação do status de acesso do usuário.
    if user.accessStatus != models.AccessStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso inativo")

    # Validação da sessão (se o token existe e não expirou no banco)
    session = db.query(models.Session).filter(models.Session.token == token).first()
    if session is None or session.expirationDate < datetime.utcnow():
        if session:
            db.delete(session)
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada")

    return user

# --- Dependências de Autorização ---

async def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """
    Wrapper em torno de get_current_user para clareza no código, pois a
    verificação de status ativo já é feita na dependência principal.
    """
    return current_user

def require_roles(allowed_roles: list[str]):
    """
    Fábrica de dependências que cria um validador de role para garantir que o
    usuário atual tenha uma das roles permitidas.
    """
    async def role_checker(current_user: models.User = Depends(get_current_active_user)):
        if current_user.role.value not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão negada. Acesso restrito.")
        return current_user
    return role_checker
