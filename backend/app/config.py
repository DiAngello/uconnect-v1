# ---------------- CONFIGURAÇÕES DO APLICATIVO ---------------- #
"""
Este arquivo, config.py, centraliza as configurações da aplicação. Ele utiliza
a biblioteca `dotenv` para carregar variáveis de ambiente de um arquivo `.env`,
garantindo que dados sensíveis (como a chave secreta) não fiquem expostos
diretamente no código. A classe `Settings` organiza todas as variáveis, como a
`SECRET_KEY` para JWT, o `ALGORITHM` de criptografia e o tempo de expiração
do token. Uma instância `settings` é criada para ser facilmente importada e
utilizada em outras partes do projeto.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Classe de Configurações (Settings) ---
# Define a estrutura para agrupar todas as variáveis de configuração. Ler as
# variáveis do ambiente com `os.getenv` é uma boa prática que permite
# configurar a aplicação de forma diferente em ambientes de desenvolvimento,
# teste e produção sem precisar alterar o código-fonte.
class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "uma-chave-secreta-padrao")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

settings = Settings()
