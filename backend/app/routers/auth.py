# ---------------- ROTAS DE AUTENTICAÇÃO ---------------- #
"""
Este arquivo (routers/auth.py) define os endpoints da API relacionados à
autenticação de usuários. Ele gerencia o ciclo de vida da sessão de um
usuário.

Suas responsabilidades incluem:
- Definir o endpoint `/login` para validar credenciais (matrícula e senha).
- Criar e armazenar sessões no banco de dados, gerando um token JWT.
- Definir o endpoint `/logout` para invalidar um token e encerrar a sessão.
- Fornecer um endpoint `/validate` para que o frontend possa verificar se uma
  sessão ainda é ativa.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from ..db import get_db
from .. import models, utils

# --- Configuração do Roteador e Modelos de Dados ---
# O `APIRouter` agrupa as rotas de autenticação sob o prefixo `/auth`.
# Os modelos Pydantic (`LoginRequest`, `TokenResponse`) garantem que os dados
# enviados e recebidos nas requisições tenham a estrutura correta.
router = APIRouter(prefix="/auth", tags=["authentication"])

class LoginRequest(BaseModel):
    registration: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_at: datetime

# --- Endpoint: Login de Usuário ---
# Esta rota recebe a matrícula e a senha, valida as credenciais contra o banco
# de dados, verifica se o usuário está ativo e, em caso de sucesso, cria um
# novo token JWT e registra a sessão no banco antes de retorná-la ao cliente.
@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    
    # Remove espaços em branco da matrícula e da senha.
    user_registration = login_data.registration.strip()
    user_password = login_data.password.strip()

    # Valida se o usuário existe e se a senha está correta.
    user = db.query(models.User).filter(models.User.registration == user_registration).first()

    if not user or not utils.verify_password(user_password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matrícula ou senha incorretas"
        )

    # Valida se o status da conta do usuário é 'ativo'.
    if user.accessStatus != models.AccessStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acesso inativo"
        )

    # Cria um novo token de acesso (JWT) e a data de expiração.
    token, expire = utils.create_access_token(data={"sub": user.registration})
    db_session = models.Session(token=token, userId=user.id, startDate=datetime.utcnow(), expirationDate=expire)
    db.add(db_session)
    db.commit()
    
    return {"access_token": token, "token_type": "bearer", "expires_at": expire}


# --- Endpoint: Logout de Usuário ---
# Invalida a sessão do usuário. A rota recebe um token JWT, localiza a
# sessão correspondente no banco de dados e a remove, efetivamente
# desconectando o usuário.
@router.post("/logout")
def logout(token: str = Depends(utils.oauth2_scheme), db: Session = Depends(get_db)):
    # Busca e deleta a sessão no banco de dados.
    session = db.query(models.Session).filter(models.Session.token == token).first()
    if session:
        db.delete(session)
        db.commit()
    return {"message": "Sessão encerrada"}


# --- Endpoint: Validação de Sessão ---
# Permite verificar a validade de um token. A rota checa se a sessão
# associada ao token existe e se não expirou. Retorna um status de sucesso
# ou um erro de não autorizado.
@router.get("/validate")
def validate_session(token: str = Depends(utils.oauth2_scheme), db: Session = Depends(get_db)):
    session = db.query(models.Session).filter(models.Session.token == token).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
    
    if session.expirationDate < datetime.utcnow():
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada")

    return {"valid": True, "expires_at": session.expirationDate}
