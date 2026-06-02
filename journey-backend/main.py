from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import urllib.request
import json as _json
import uvicorn
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import get_db, engine
import models
import schemas
import crud
from career_engine import recommend_careers

# ─── CONFIG DE EMAIL ──────────────────────────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASS     = os.getenv("SMTP_PASS", "")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:5173")

def send_reset_email(to_email: str, name: str, token: str):
    reset_url = f"{FRONTEND_URL}?token={token}"
    # Se não houver credenciais configuradas, imprime o link no terminal
    if not SMTP_USER or not SMTP_PASS:
        print(f"\n[RESET DE SENHA] Link para {to_email}:\n{reset_url}\n")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Redefinição de senha — Próximo Destino"
    msg["From"]    = SMTP_USER
    msg["To"]      = to_email
    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">
      <h2 style="color:#0f172a">Olá, {name}!</h2>
      <p style="color:#475569">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
      <a href="{reset_url}"
         style="display:inline-block;background:#0f172a;color:#fff;padding:12px 28px;
                border-radius:10px;text-decoration:none;font-weight:600;margin:1rem 0">
        Redefinir minha senha
      </a>
      <p style="color:#94a3b8;font-size:0.82rem;margin-top:1.5rem">
        Este link expira em <strong>1 hora</strong>.<br>
        Se você não solicitou a redefinição, ignore este email.
      </p>
    </div>"""
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())

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


# ─── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    """Cadastra um novo usuário."""
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Este email já está cadastrado.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres.")
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="O nome é obrigatório.")
    crud.create_user(db, payload.email, payload.name.strip(), payload.password)
    return {"status": "ok", "message": "Conta criada com sucesso!"}


@app.post("/auth/login", response_model=schemas.UserLoginOut)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """Autentica um usuário e retorna o session_id vinculado ao email."""
    user = crud.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")
    crud.get_or_create_session(db, user.email)
    return {"session_id": user.email, "email": user.email, "name": user.name}


@app.post("/auth/google", response_model=schemas.UserLoginOut)
def google_auth(payload: schemas.GoogleLogin, db: Session = Depends(get_db)):
    """Verifica o token Google e faz login ou cria conta automaticamente."""
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.token}"
        with urllib.request.urlopen(url, timeout=10) as resp:
            info = _json.loads(resp.read())
    except Exception:
        raise HTTPException(status_code=401, detail="Token Google inválido.")

    email = info.get("email")
    if not email or info.get("email_verified") != "true":
        raise HTTPException(status_code=401, detail="Email Google não verificado.")

    name = info.get("name") or info.get("given_name") or email.split("@")[0]

    user = crud.get_user_by_email(db, email)
    if not user:
        user = crud.create_google_user(db, email, name)

    crud.get_or_create_session(db, user.email)
    return {"session_id": user.email, "email": user.email, "name": user.name}


@app.post("/auth/forgot-password")
def forgot_password(payload: schemas.ForgotPassword, db: Session = Depends(get_db)):
    """Gera token de reset e envia email (não revela se o email existe)."""
    user = crud.get_user_by_email(db, payload.email)
    if user and user.password_hash:  # só para contas com senha (não Google-only)
        token = crud.create_reset_token(db, user.email)
        try:
            send_reset_email(user.email, user.name, token)
        except Exception as e:
            print(f"[EMAIL ERROR] {e}")
    return {"status": "ok", "message": "Se o email existir, um link de redefinição foi enviado."}


@app.delete("/auth/account")
def delete_account(payload: schemas.DeleteAccount, db: Session = Depends(get_db)):
    """Verifica a senha e apaga permanentemente a conta e todos os dados do usuário."""
    success, error = crud.delete_user_account(db, payload.session_id, payload.password)
    if not success:
        status = 401 if "incorreta" in error else 400 if "Google" in error else 404
        raise HTTPException(status_code=status, detail=error)
    return {"status": "ok"}


@app.post("/auth/reset-password")
def reset_password(payload: schemas.ResetPassword, db: Session = Depends(get_db)):
    """Redefine a senha a partir de um token válido."""
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres.")
    token_obj = crud.get_valid_reset_token(db, payload.token)
    if not token_obj:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado.")
    if not crud.use_reset_token(db, token_obj, payload.password):
        raise HTTPException(status_code=400, detail="Usuário não encontrado.")
    return {"status": "ok", "message": "Senha redefinida com sucesso!"}


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


@app.get("/sessions/{session_id}/answers", response_model=list[schemas.AnswerOut])
def get_session_answers(session_id: str, db: Session = Depends(get_db)):
    """Retorna todas as respostas salvas de uma sessão."""
    return crud.get_answers_by_session(db, session_id)


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


@app.post("/sessions/{session_id}/definitive-career")
def save_definitive_career(session_id: str, payload: schemas.DefinitiveCareerCreate, db: Session = Depends(get_db)):
    """Salva a carreira definitiva escolhida pelo usuário na Rota Definida."""
    crud.get_or_create_session(db, session_id)
    crud.save_definitive_career(db, session_id, payload.career_id)
    return {"status": "ok"}


@app.get("/sessions/{session_id}/definitive-career")
def get_definitive_career(session_id: str, db: Session = Depends(get_db)):
    """Retorna a carreira definitiva escolhida na Rota Definida."""
    dc = crud.get_definitive_career(db, session_id)
    if not dc:
        return None
    career = crud.get_career(db, dc.career_id)
    if not career:
        return None
    return {"id": career.id, "title": career.title, "description": career.description, "icon_color": career.icon_color}


@app.post("/sessions/{session_id}/career-selections")
def save_career_selections(
    session_id: str,
    payload: schemas.CareerSelectionsCreate,
    db: Session = Depends(get_db)
):
    """Salva as carreiras escolhidas pelo usuário no Horizonte Ampliado."""
    crud.get_or_create_session(db, session_id)
    crud.save_career_selections(db, session_id, payload.career_ids)
    return {"status": "ok"}


@app.get("/sessions/{session_id}/career-selections")
def get_career_selections(session_id: str, db: Session = Depends(get_db)):
    """Retorna as carreiras escolhidas pelo usuário no Horizonte Ampliado."""
    selections = crud.get_career_selections(db, session_id)
    result = []
    for sel in selections:
        career = crud.get_career(db, sel.career_id)
        if career:
            result.append({"id": career.id, "title": career.title, "description": career.description, "icon_color": career.icon_color})
    return result


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


# ─── ADMIN ────────────────────────────────────────────────────────────────────

@app.get("/admin/users", tags=["admin"])
def admin_list_users(db: Session = Depends(get_db)):
    """Lista todos os usuários cadastrados (email, nome, data de criação, tipo de login)."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        modules_completed = (
            db.query(models.ModuleProgress)
            .filter(models.ModuleProgress.session_id == u.email, models.ModuleProgress.completed == True)
            .count()
        )
        selections = crud.get_career_selections(db, u.email)
        selected_careers = []
        for sel in selections:
            career = crud.get_career(db, sel.career_id)
            if career:
                selected_careers.append(career.title)
        def_choice = crud.get_definitive_career(db, u.email)
        definitive_career = None
        if def_choice:
            c = crud.get_career(db, def_choice.career_id)
            if c:
                definitive_career = {"id": c.id, "title": c.title, "icon_color": c.icon_color}
        rec = crud.get_admin_recommendation(db, u.email)
        admin_recommendation = None
        if rec:
            c = crud.get_career(db, rec.career_id)
            if c:
                admin_recommendation = {"id": c.id, "title": c.title, "icon_color": c.icon_color, "note": rec.note}
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "created_at": u.created_at,
            "login_type": "email" if u.password_hash else "google",
            "modules_completed": modules_completed,
            "selected_careers": selected_careers,
            "definitive_career": definitive_career,
            "admin_recommendation": admin_recommendation,
        })
    return {"users": result, "total": len(result)}


@app.get("/admin/sessions", tags=["admin"])
def admin_list_sessions(db: Session = Depends(get_db)):
    """Lista todas as sessões com contagem de respostas e módulos concluídos."""
    sessions = db.query(models.UserSession).all()
    result = []
    for s in sessions:
        answers_count = db.query(models.Answer).filter(models.Answer.session_id == s.id).count()
        modules_completed = db.query(models.ModuleProgress).filter(
            models.ModuleProgress.session_id == s.id,
            models.ModuleProgress.completed == True
        ).count()
        result.append({
            "session_id": s.id,
            "created_at": s.created_at,
            "answers_count": answers_count,
            "modules_completed": modules_completed,
        })

    total_answers = db.query(models.Answer).count()
    total_completed = db.query(models.ModuleProgress).filter(models.ModuleProgress.completed == True).count()

    return {
        "sessions": result,
        "stats": {
            "sessions": len(result),
            "answers": total_answers,
            "completed": total_completed,
        }
    }


@app.delete("/admin/sessions/{session_id}", tags=["admin"])
def admin_delete_session(session_id: str, db: Session = Depends(get_db)):
    """Apaga uma sessão e todas as suas respostas e progresso."""
    db.query(models.Answer).filter(models.Answer.session_id == session_id).delete()
    db.query(models.ModuleProgress).filter(models.ModuleProgress.session_id == session_id).delete()
    db.query(models.CareerSelection).filter(models.CareerSelection.session_id == session_id).delete()
    db.query(models.DefinitiveCareer).filter(models.DefinitiveCareer.session_id == session_id).delete()
    db.query(models.AdminRecommendation).filter(models.AdminRecommendation.session_id == session_id).delete()
    db.query(models.UserSession).filter(models.UserSession.id == session_id).delete()
    db.commit()
    return {"status": "ok", "message": "Sessão apagada com sucesso"}


@app.post("/admin/sessions/{session_id}/recommend-career", tags=["admin"])
def admin_recommend_career(session_id: str, payload: schemas.AdminRecommendationCreate, db: Session = Depends(get_db)):
    """Admin sugere/recomenda uma carreira para o usuário."""
    crud.get_or_create_session(db, session_id)
    crud.save_admin_recommendation(db, session_id, payload.career_id, payload.note)
    return {"status": "ok"}


@app.delete("/admin/sessions/{session_id}/recommend-career", tags=["admin"])
def admin_delete_recommendation(session_id: str, db: Session = Depends(get_db)):
    """Remove a recomendação de carreira feita pelo admin."""
    crud.delete_admin_recommendation(db, session_id)
    return {"status": "ok"}


@app.get("/sessions/{session_id}/recommendation")
def get_recommendation(session_id: str, db: Session = Depends(get_db)):
    """Retorna a recomendação de carreira feita pelo admin para este usuário."""
    rec = crud.get_admin_recommendation(db, session_id)
    if not rec:
        return None
    career = crud.get_career(db, rec.career_id)
    if not career:
        return None
    return {
        "id": career.id,
        "title": career.title,
        "description": career.description,
        "icon_color": career.icon_color,
        "tags": career.tags,
        "campo_conhecimento": career.campo_conhecimento,
        "descricao_campo": career.descricao_campo,
        "areas_atuacao": career.areas_atuacao,
        "habilidades_essenciais": career.habilidades_essenciais,
        "tendencias_mercado": career.tendencias_mercado,
        "potencial_renda": career.potencial_renda,
        "requisitos_formacao": career.requisitos_formacao,
        "ambiente_trabalho": career.ambiente_trabalho,
        "possibilidades_crescimento": career.possibilidades_crescimento,
        "desafios_desvantagens": career.desafios_desvantagens,
        "proximos_passos": career.proximos_passos,
        "note": rec.note,
    }


@app.delete("/admin/answers/{answer_id}", tags=["admin"])
def admin_delete_answer(answer_id: int, db: Session = Depends(get_db)):
    """Apaga uma resposta específica."""
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Resposta não encontrada")
    db.delete(answer)
    db.commit()
    return {"status": "ok", "message": "Resposta apagada com sucesso"}


# ─── SEED ─────────────────────────────────────────────────────────────────────

@app.post("/seed", tags=["dev"])
def seed_database(db: Session = Depends(get_db)):
    """Popula o banco com dados iniciais (módulos, perguntas e carreiras)."""
    from seed import run_seed
    run_seed(db)
    return {"status": "ok", "message": "Banco populado com sucesso!"}


@app.post("/admin/import-careers", tags=["admin"])
def import_careers(careers_data: list[dict], db: Session = Depends(get_db)):
    """Importa lista de carreiras em massa (uso único para migração)."""
    inserted = 0
    for c in careers_data:
        existing = db.query(models.Career).filter(models.Career.title == c.get("title")).first()
        if not existing:
            career = models.Career(
                title=c.get("title"),
                description=c.get("description"),
                icon=c.get("icon"),
                icon_color=c.get("icon_color"),
                tags=c.get("tags", ""),
                campo_conhecimento=c.get("campo_conhecimento"),
                descricao_campo=c.get("descricao_campo"),
                areas_atuacao=c.get("areas_atuacao"),
                tendencias_mercado=c.get("tendencias_mercado"),
                potencial_renda=c.get("potencial_renda"),
                requisitos_formacao=c.get("requisitos_formacao"),
                habilidades_essenciais=c.get("habilidades_essenciais"),
                ambiente_trabalho=c.get("ambiente_trabalho"),
                possibilidades_crescimento=c.get("possibilidades_crescimento"),
                desafios_desvantagens=c.get("desafios_desvantagens"),
                proximos_passos=c.get("proximos_passos"),
            )
            db.add(career)
            inserted += 1
    db.commit()
    return {"status": "ok", "inserted": inserted}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
