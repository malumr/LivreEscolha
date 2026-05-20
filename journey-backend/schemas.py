from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ─── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserLoginOut(BaseModel):
    session_id: str
    email: str
    name: str

class GoogleLogin(BaseModel):
    token: str

class ForgotPassword(BaseModel):
    email: str

class ResetPassword(BaseModel):
    token: str
    password: str

class DeleteAccount(BaseModel):
    session_id: str
    password: str


# ─── OPÇÕES ──────────────────────────────────────────────────────────────────

class OptionOut(BaseModel):
    id: int
    text: str

    class Config:
        from_attributes = True


# ─── PERGUNTAS ───────────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    id: int
    order: int
    text: str
    options: list[OptionOut]

    class Config:
        from_attributes = True


# ─── MÓDULOS ─────────────────────────────────────────────────────────────────

class ModuleOut(BaseModel):
    id: int
    slug: str
    title: str
    description: Optional[str]
    icon: Optional[str]
    order: int

    class Config:
        from_attributes = True


# ─── RESPOSTAS ───────────────────────────────────────────────────────────────

class AnswerCreate(BaseModel):
    question_id: int
    option_id: int


class AnswerOut(BaseModel):
    id: int
    session_id: str
    question_id: int
    option_id: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── PROGRESSO ───────────────────────────────────────────────────────────────

class ModuleProgressOut(BaseModel):
    module_id: int
    module_title: str
    completed: bool
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── CARREIRA DEFINITIVA / SELEÇÃO DE CARREIRAS ──────────────────────────────

class DefinitiveCareerCreate(BaseModel):
    career_id: int

class CareerSelectionsCreate(BaseModel):
    career_ids: list[int]


# ─── CARREIRAS ───────────────────────────────────────────────────────────────

class CareerOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    icon: Optional[str]
    icon_color: Optional[str]
    match_score: Optional[float] = 0.0

    class Config:
        from_attributes = True
