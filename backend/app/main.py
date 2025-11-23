from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from .routers import auth, users, events, groups, publications, chat, notifications, access
from .db import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="UCONNECT API", version="1.0.0", docs_url="/docs", redoc_url="/redoc")

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Esta definição de origens está correta
origins = {
    "null",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    "http://localhost:3000", # A origem do seu frontend
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}

# Esta é a configuração de CORS que corrige o erro
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(events.router)
app.include_router(groups.router)
app.include_router(publications.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(access.router)


@app.get("/")
def root():
    return {"message": "UCONNECT API", "docs": "/docs", "health": "/health"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}