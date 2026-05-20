from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import uvicorn

from database import get_db, engine
import models
import schemas
import crud
from career_engine import recommend_careers
from sqlalchemy.orm import Session
from fastapi import Depends
from models import Answer

# Cria as tabelas no banco
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sua Jornada API",
    description="Backend para o app de desenvolvimento de carreira",
    version="1.0.0"
)

# CORS para o frontend se conectar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, troque pelo domínio do seu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── MÓDULOS (Jornada) ────────────────────────────────────────────────────────

@app.get("/modules", response_model=list[schemas.ModuleOut])
def list_modules(db: Session = Depends(get_db)):
    """Retorna todos os módulos com seu status (para a tela 'Sua Jornada')."""
    return crud.get_all_modules(db)


@app.get("/modules/{module_id}", response_model=schemas.ModuleOut)
def get_module(module_id: int, db: Session = Depends(get_db)):
    module = crud.get_module(db, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return module


# ─── PERGUNTAS ────────────────────────────────────────────────────────────────

@app.get("/modules/{module_id}/questions", response_model=list[schemas.QuestionOut])
def get_questions(module_id: int, db: Session = Depends(get_db)):
    """Retorna todas as perguntas de um módulo (ex: Mapa Interior)."""
    questions = crud.get_questions_by_module(db, module_id)
    if not questions:
        raise HTTPException(status_code=404, detail="Nenhuma pergunta encontrada para este módulo")
    return questions


# ─── RESPOSTAS ────────────────────────────────────────────────────────────────

@app.post("/sessions/{session_id}/answers", response_model=schemas.AnswerOut)
def save_answer(
    session_id: str,
    payload: schemas.AnswerCreate,
    db: Session = Depends(get_db)
):
    """Salva a resposta de uma pergunta para uma sessão de usuário."""
    # Garante que a sessão existe
    crud.get_or_create_session(db, session_id)
    answer = crud.save_answer(db, session_id, payload)
    return answer

@app.get("/sessions/{session_id}/answers")
def get_session_answers(session_id: str, db: Session = Depends(get_db)):
    """Retorna todas as respostas salvas de uma sessão."""

    answers = db.query(models.Answer).filter(
        models.Answer.session_id == session_id
    ).all()

    result = []

    for answer in answers:
        result.append({
            "question_id": answer.question.id,
            "question": answer.question.text,

            "option_id": answer.option.id,
            "answer": answer.option.text,

            "created_at": answer.created_at
        })

    return result

    """
@app.get("/sessions/{session_id}/answers", response_model=list[schemas.AnswerOut])
def get_session_answers(session_id: str, db: Session = Depends(get_db)):
    
    return crud.get_answers_by_session(db, session_id)
    """

# ─── PROGRESSO ────────────────────────────────────────────────────────────────

@app.post("/sessions/{session_id}/complete-module/{module_id}")
def complete_module(session_id: str, module_id: int, db: Session = Depends(get_db)):
    """Marca um módulo como concluído para a sessão."""
    crud.get_or_create_session(db, session_id)
    crud.mark_module_complete(db, session_id, module_id)
    return {"status": "ok", "message": "Módulo concluído"}


@app.get("/sessions/{session_id}/progress")
def get_progress(session_id: str, db: Session = Depends(get_db)):
    """Retorna o progresso geral da sessão em todos os módulos."""
    return crud.get_session_progress(db, session_id)


# ─── HORIZONTE AMPLIADO (Recomendações) ───────────────────────────────────────
    
@app.get("/sessions/{session_id}/careers", response_model=list[schemas.CareerOut])
def get_recommended_careers(
    session_id: str,
    db: Session = Depends(get_db)
):
    
    """
    Retorna carreiras recomendadas com base nas respostas do 'Mapa Interior'.
    Ordena as carreiras por compatibilidade com o perfil do usuário.
    """
    answers = crud.get_answers_by_session(db, session_id)
    all_careers = crud.get_all_careers(db)

    if not answers:
        # Sem respostas, retorna todas as carreiras sem score
        return all_careers

    # Motor de recomendação
    scored = recommend_careers(answers, all_careers)
    return scored


@app.get("/careers", response_model=list[schemas.CareerOut])
def list_all_careers(db: Session = Depends(get_db)):
    """Lista todas as carreiras disponíveis."""
    return crud.get_all_careers(db)


@app.get("/careers/{career_id}", response_model=schemas.CareerOut)
def get_career(career_id: int, db: Session = Depends(get_db)):
    career = crud.get_career(db, career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Carreira não encontrada")
    return career


# ─── SEED ─────────────────────────────────────────────────────────────────────

@app.post("/seed", tags=["dev"])
def seed_database(db: Session = Depends(get_db)):
    """Popula o banco com dados iniciais (módulos, perguntas e carreiras)."""
    from seed import run_seed
    run_seed(db)
    return {"status": "ok", "message": "Banco populado com sucesso!"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# ─── DELETE ─────────────────────────────────────────────────────────────────────

@app.delete("/sessions/{session_id}/answers")
def delete_answers(session_id: str, db: Session = Depends(get_db)):

    # Apaga respostas
    db.query(models.Answer).filter(
        models.Answer.session_id == session_id
    ).delete()

    # Apaga progresso dos módulos
    db.query(models.ModuleProgress).filter(
        models.ModuleProgress.session_id == session_id
    ).delete()

    db.commit()

    return {
        "message": f"Dados da sessão {session_id} apagados"
    }