from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime
from zoneinfo import ZoneInfo
from datetime import datetime, timezone


class User(Base):
    """Usuário cadastrado com email e senha."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Module(Base):
    """Módulos da jornada: Mapa Interior, Horizonte Ampliado, etc."""
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), unique=True, nullable=False)   # ex: "mapa-interior"
    title = Column(String(100), nullable=False)               # ex: "Mapa Interior"
    description = Column(String(200))
    icon = Column(String(50))                                 # nome do ícone
    order = Column(Integer, default=0)

    questions = relationship("Question", back_populates="module")


class Question(Base):
    """Perguntas de cada módulo."""
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    order = Column(Integer, default=0)
    text = Column(Text, nullable=False)                      # Ex: "Você prefere trabalhar:"

    module = relationship("Module", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question")
    answers = relationship("Answer", back_populates="question")


class QuestionOption(Base):
    """Opções de resposta para cada pergunta."""
    __tablename__ = "question_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    text = Column(String(200), nullable=False)               # Ex: "Sozinho"
    # Tags para o motor de recomendação (JSON-like string separada por vírgulas)
    career_tags = Column(String(500), default="")            # Ex: "tech,research,analytical"

    question = relationship("Question", back_populates="options")


class UserSession(Base):
    """Sessão de um usuário (identificada por UUID gerado no frontend)."""
    __tablename__ = "user_sessions"

    id = Column(String(100), primary_key=True)              # UUID do frontend
    created_at = Column(
    DateTime,
    default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
    DateTime,
    default=lambda: datetime.now(ZoneInfo("America/Sao_Paulo")),
    onupdate=lambda: datetime.now(ZoneInfo("America/Sao_Paulo"))
)

    answers = relationship("Answer", back_populates="session")
    progress = relationship("ModuleProgress", back_populates="session")


class Answer(Base):
    """Resposta de uma sessão a uma pergunta."""
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), ForeignKey("user_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("question_options.id"), nullable=False)
    created_at = Column(
    DateTime,
    default=lambda: datetime.now(ZoneInfo("America/Sao_Paulo"))
)

    session = relationship("UserSession", back_populates="answers")
    question = relationship("Question", back_populates="answers")
    option = relationship("QuestionOption")


class ModuleProgress(Base):
    """Progresso de uma sessão em cada módulo."""
    __tablename__ = "module_progress"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), ForeignKey("user_sessions.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    session = relationship("UserSession", back_populates="progress")
    module = relationship("Module")


class PasswordResetToken(Base):
    """Token temporário para redefinição de senha (válido por 1 hora)."""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(100), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DefinitiveCareer(Base):
    """Carreira definitiva escolhida pelo usuário na Rota Definida."""
    __tablename__ = "definitive_careers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), ForeignKey("user_sessions.id"), nullable=False, unique=True)
    career_id = Column(Integer, ForeignKey("careers.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CareerSelection(Base):
    """Carreiras escolhidas pelo usuário no Horizonte Ampliado."""
    __tablename__ = "career_selections"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), ForeignKey("user_sessions.id"), nullable=False, index=True)
    career_id = Column(Integer, ForeignKey("careers.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Career(Base):
    """Carreiras disponíveis no Horizonte Ampliado."""
    __tablename__ = "careers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)              # Ex: "Desenvolvedor de Software"
    description = Column(Text)
    icon = Column(String(50))                                # nome do ícone
    icon_color = Column(String(20), default="#4F46E5")       # cor do ícone
    # Tags que batem com as career_tags das opções de resposta
    tags = Column(String(500), default="")                   # Ex: "tech,analytical,independent"
    match_score = Column(Float, default=0.0)                 # preenchido dinamicamente
