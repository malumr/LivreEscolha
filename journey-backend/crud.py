from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta
import hashlib
import os
import secrets
import models
import schemas


# ─── USUÁRIOS ─────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000)
    return f"{salt}${dk.hex()}"

def _verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, dk_hex = password_hash.split("$", 1)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000)
        return dk.hex() == dk_hex
    except Exception:
        return False

def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email.lower()).first()

def _cleanup_orphaned_data(db: Session, email: str):
    """Remove dados órfãos de contas anteriores com o mesmo email."""
    e = email.lower()
    db.query(models.CareerSelection).filter(models.CareerSelection.session_id == e).delete()
    db.query(models.DefinitiveCareer).filter(models.DefinitiveCareer.session_id == e).delete()
    db.query(models.Answer).filter(models.Answer.session_id == e).delete()
    db.query(models.ModuleProgress).filter(models.ModuleProgress.session_id == e).delete()
    db.query(models.UserSession).filter(models.UserSession.id == e).delete()
    db.query(models.PasswordResetToken).filter(models.PasswordResetToken.email == e).delete()

def create_user(db: Session, email: str, name: str, password: str) -> models.User:
    _cleanup_orphaned_data(db, email)
    user = models.User(
        email=email.lower(),
        name=name,
        password_hash=_hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str) -> models.User | None:
    user = get_user_by_email(db, email)
    if not user or not _verify_password(password, user.password_hash):
        return None
    return user

def update_user_password(db: Session, email: str, new_password: str) -> bool:
    user = get_user_by_email(db, email)
    if not user:
        return False
    user.password_hash = _hash_password(new_password)
    db.commit()
    return True

def create_google_user(db: Session, email: str, name: str) -> models.User:
    _cleanup_orphaned_data(db, email)
    user = models.User(email=email.lower(), name=name, password_hash="")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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


# ─── RESET DE SENHA ──────────────────────────────────────────────────────────

def create_reset_token(db: Session, email: str) -> str:
    # Invalida tokens anteriores não usados do mesmo email
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == email.lower(),
        models.PasswordResetToken.used == False,
    ).delete()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.add(models.PasswordResetToken(email=email.lower(), token=token, expires_at=expires_at))
    db.commit()
    return token

def get_valid_reset_token(db: Session, token: str) -> models.PasswordResetToken | None:
    rt = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used == False,
    ).first()
    if not rt:
        return None
    expires = rt.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        return None
    return rt

def use_reset_token(db: Session, token_obj: models.PasswordResetToken, new_password: str) -> bool:
    token_obj.used = True
    db.commit()
    return update_user_password(db, token_obj.email, new_password)

def delete_user_account(db: Session, email: str, password: str) -> tuple[bool, str]:
    """Verifica a senha e apaga todos os dados do usuário. Retorna (sucesso, mensagem_de_erro)."""
    user = get_user_by_email(db, email)
    if not user:
        return False, "Usuário não encontrado."
    if not user.password_hash:
        return False, "Esta conta foi criada via Google e não possui senha. Para excluí-la, defina uma senha primeiro em 'Esqueci minha senha'."
    if not _verify_password(password, user.password_hash):
        return False, "Senha incorreta. Tente novamente."
    # Apaga em ordem para respeitar as foreign keys
    db.query(models.Answer).filter(models.Answer.session_id == email).delete()
    db.query(models.ModuleProgress).filter(models.ModuleProgress.session_id == email).delete()
    db.query(models.CareerSelection).filter(models.CareerSelection.session_id == email).delete()
    db.query(models.DefinitiveCareer).filter(models.DefinitiveCareer.session_id == email).delete()
    db.query(models.UserSession).filter(models.UserSession.id == email).delete()
    db.query(models.PasswordResetToken).filter(models.PasswordResetToken.email == email.lower()).delete()
    db.delete(user)
    db.commit()
    return True, ""


# ─── CARREIRA DEFINITIVA ─────────────────────────────────────────────────────

def save_definitive_career(db: Session, session_id: str, career_id: int):
    existing = db.query(models.DefinitiveCareer).filter(models.DefinitiveCareer.session_id == session_id).first()
    if existing:
        existing.career_id = career_id
    else:
        db.add(models.DefinitiveCareer(session_id=session_id, career_id=career_id))
    db.commit()

def get_definitive_career(db: Session, session_id: str) -> models.DefinitiveCareer | None:
    return db.query(models.DefinitiveCareer).filter(models.DefinitiveCareer.session_id == session_id).first()


# ─── SELEÇÃO DE CARREIRAS ─────────────────────────────────────────────────────

def save_career_selections(db: Session, session_id: str, career_ids: list[int]):
    db.query(models.CareerSelection).filter(models.CareerSelection.session_id == session_id).delete()
    for cid in career_ids:
        db.add(models.CareerSelection(session_id=session_id, career_id=cid))
    db.commit()

def get_career_selections(db: Session, session_id: str) -> list[models.CareerSelection]:
    return db.query(models.CareerSelection).filter(models.CareerSelection.session_id == session_id).all()


# ─── CARREIRAS ───────────────────────────────────────────────────────────────

def get_all_careers(db: Session) -> list[models.Career]:
    return db.query(models.Career).all()


def get_career(db: Session, career_id: int) -> models.Career | None:
    return db.query(models.Career).filter(models.Career.id == career_id).first()
