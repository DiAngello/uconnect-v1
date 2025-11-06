# ---------------- CONEXÃO COM O BANCO DE DADOS (APRIMORADO) ---------------- #
"""
Este arquivo, db.py, é responsável por configurar a conexão com o banco de
dados usando SQLAlchemy. Ele foi aprimorado para incluir um pool de conexões
robusto e configurações de performance, garantindo estabilidade e eficiência
em ambientes de desenvolvimento e produção.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# --- Configuração e Engine ---

# Lê a URL do banco de dados a partir das variáveis de ambiente.
# A string de conexão padrão é mantida para facilitar o setup inicial.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://avnadmin:AVNS_ZNdJaYqcEhNaEf1dsCl@uconnect-uconnect.c.aivencloud.com:24757/defaultdb"
)

# Converte a variável de ambiente para booleano para o 'echo'.
# Permite ligar/desligar o log SQL via .env (ex: ECHO_SQL=True).
# É uma prática melhor do que deixar 'echo=True' fixo no código.
ECHO_SQL = os.getenv("ECHO_SQL", "False").lower() in ("true", "1", "t")

# O 'engine' é o ponto de entrada para o banco de dados.
# Esta configuração inclui um pool de conexões otimizado para produção.
engine = create_engine(
    DATABASE_URL,
    # OTIMIZAÇÃO: Habilita a verificação da "saúde" da conexão antes de
    # entregá-la a partir do pool. Essencial para evitar erros com conexões
    # que foram encerradas pelo banco de dados ou firewall por inatividade.
    pool_pre_ping=True,

    # OTIMIZAÇÃO: Define o tamanho do pool de conexões.
    pool_size=10,

    # OTIMIZAÇÃO: Número de conexões que podem ser criadas além do 'pool_size'
    # em momentos de pico.
    max_overflow=20,

    # OTIMIZAÇÃO: Recicla (fecha e reabre) as conexões após um tempo (em segundos).
    # Impede que o firewall ou o próprio banco de dados encerre conexões
    # por inatividade. 3600 segundos = 1 hora.
    pool_recycle=3600,

    # Controla a exibição das queries SQL geradas.
    # É útil para debug, mas deve ser desabilitado em produção para performance.
    echo=True,

)

# --- Sessão e Base Declarativa ---

# SessionLocal é uma "fábrica" que cria novas sessões de banco de dados.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    # OTIMIZAÇÃO: Desabilitar o 'expire_on_commit' previne que o SQLAlchemy
    # emita novas queries para recarregar os objetos na sessão após um commit.
    # Isso é útil quando você precisa acessar os dados do objeto após salvá-lo
    # (ex: para retorná-lo em uma resposta de API), sem custo de I/O adicional.
    expire_on_commit=False
)

# Base para os modelos ORM. Todos os seus modelos de tabela deverão herdar desta classe.
Base = declarative_base()


# --- Função de Dependência para Sessão ---

def get_db():
    """
    Função de dependência para o FastAPI.

    A cada requisição, ela obtém uma sessão do pool (SessionLocal()),
    injeta-a na rota (yield db), e garante que a sessão seja sempre fechada
    (db.close()) ao final da requisição, mesmo que ocorram erros.
    Isso libera a conexão de volta para o pool de forma segura.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()