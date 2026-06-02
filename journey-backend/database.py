import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Em produção, defina a variável de ambiente DATABASE_URL com a string do PostgreSQL.
# Localmente, usa SQLite por padrão.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./journey.db")

# O Render entrega URLs PostgreSQL com prefixo "postgres://", mas o SQLAlchemy
# exige "postgresql://". Esta linha corrige automaticamente.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite precisa do argumento check_same_thread; PostgreSQL não aceita isso.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency para injetar a sessão do banco nas rotas."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
