from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timezone
import models
import schemas


# ─── MÓDULOS ─────────────────────────────────────────────────────────────────

def get_all_modules(db: Session) -> list[models.Module]:
    return db.query(models.Module).order_by(models.Module.order).all()


def get_module(db: Session, module_id: int) -> models.Module | None:
    return db.query(models.Module).filter(models.Module.id == module_id).first()


def get_module_by_slug(db: Session, slug: str) -> models.Module | None:
    return db.query(models.Module).filter(models.Module.slug == slug).first()


# ─── PERGUNTAS ───────────────────────────────────────────────────────────────

def get_questions_by_module(db: Session, module_id: int) -> list[models.Question]:
    return (
        db.query(models.Question)
        .filter(models.Question.module_id == module_id)
        .order_by(models.Question.order)
        .all()
    )


# ─── SESSÕES ─────────────────────────────────────────────────────────────────

def get_or_create_session(db: Session, session_id: str) -> models.UserSession:
    session = db.query(models.UserSession).filter(
        models.UserSession.id == session_id
    ).first()

    if not session:
        session = models.UserSession(id=session_id)
        db.add(session)
        db.commit()
        db.refresh(session)

    return session


# ─── RESPOSTAS ───────────────────────────────────────────────────────────────

def save_answer(db: Session, session_id: str, payload: schemas.AnswerCreate) -> models.Answer:
    # Upsert: se já respondeu essa pergunta, atualiza
    existing = (
        db.query(models.Answer)
        .filter(
            models.Answer.session_id == session_id,
            models.Answer.question_id == payload.question_id,
        )
        .first()
    )

    if existing:
        existing.option_id = payload.option_id
        db.commit()
        db.refresh(existing)
        return existing

    answer = models.Answer(
        session_id=session_id,
        question_id=payload.question_id,
        option_id=payload.option_id,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


def get_answers_by_session(db: Session, session_id: str) -> list[models.Answer]:
    return (
        db.query(models.Answer)
        .filter(models.Answer.session_id == session_id)
        .all()
    )


# ─── PROGRESSO ───────────────────────────────────────────────────────────────

def mark_module_complete(db: Session, session_id: str, module_id: int):
    progress = (
        db.query(models.ModuleProgress)
        .filter(
            models.ModuleProgress.session_id == session_id,
            models.ModuleProgress.module_id == module_id,
        )
        .first()
    )

    if not progress:
        progress = models.ModuleProgress(
            session_id=session_id,
            module_id=module_id,
        )
        db.add(progress)

    progress.completed = True
    progress.completed_at = datetime.now(timezone.utc)
    db.commit()


def get_session_progress(db: Session, session_id: str) -> list[dict]:
    modules = db.query(models.Module).order_by(models.Module.order).all()
    result = []

    for module in modules:
        progress = (
            db.query(models.ModuleProgress)
            .filter(
                models.ModuleProgress.session_id == session_id,
                models.ModuleProgress.module_id == module.id,
            )
            .first()
        )
        result.append({
            "module_id": module.id,
            "module_title": module.title,
            "slug": module.slug,
            "completed": progress.completed if progress else False,
            "completed_at": progress.completed_at if progress else None,
        })

    return result


# ─── CARREIRAS ───────────────────────────────────────────────────────────────

def get_all_careers(db: Session) -> list[models.Career]:
    return db.query(models.Career).all()


def get_career(db: Session, career_id: int) -> models.Career | None:
    return db.query(models.Career).filter(models.Career.id == career_id).first()
