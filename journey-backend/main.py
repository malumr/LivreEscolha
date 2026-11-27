from fastapi import FastAPI, HTTPException, Depends, Header
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
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:5173")

def send_reset_email(to_email: str, name: str, token: str):
    reset_url = f"{FRONTEND_URL}?token={token}"

    if not RESEND_API_KEY:
        print(f"\n[RESET DE SENHA] Link para {to_email}:\n{reset_url}\n")
        return

    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem">
      <h2 style="color:#0f172a">Olá, {name}!</h2>
      <p style="color:#475569">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Próximo Destino</strong>.</p>
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

    payload = _json.dumps({
        "from": "Próximo Destino <onboarding@resend.dev>",
        "to": [to_email],
        "subject": "Redefinição de senha — Próximo Destino",
        "html": html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        resp.read()

# Cria as tabelas no banco
models.Base.metadata.create_all(bind=engine)

# Seed automático se banco estiver vazio
try:
    from database import SessionLocal as _SL
    from seed import run_seed as _run_seed
    _db = _SL()
    _run_seed(_db)
    _db.close()
except Exception as _e:
    print(f"[seed] {_e}")

# Migração: adiciona coluna is_google se não existir
try:
    from database import engine as _engine
    with _engine.connect() as _conn:
        _conn.execute(__import__("sqlalchemy").text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_google BOOLEAN DEFAULT FALSE"
        ))
        _conn.commit()
except Exception:
    pass

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


def _verify_google_token(token: str) -> dict:
    """Valida o token Google e retorna as informações do usuário."""
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
        with urllib.request.urlopen(url, timeout=10) as resp:
            info = _json.loads(resp.read())
    except Exception:
        raise HTTPException(status_code=401, detail="Token Google inválido.")
    email = info.get("email")
    if not email or info.get("email_verified") != "true":
        raise HTTPException(status_code=401, detail="Email Google não verificado.")
    return info


@app.post("/auth/google")
def google_auth(payload: schemas.GoogleLogin, db: Session = Depends(get_db)):
    """Verifica o token Google. Se usuário já existe, faz login.
    Se é novo, retorna new_user=True para o frontend solicitar nome e senha."""
    info = _verify_google_token(payload.token)
    email = info.get("email")
    name = info.get("name") or info.get("given_name") or email.split("@")[0]

    user = crud.get_user_by_email(db, email)
    if not user:
        # Novo usuário — pede nome e senha antes de criar
        return {"new_user": True, "google_name": name, "google_email": email}

    # Usuário existente — login direto
    crud.get_or_create_session(db, user.email)
    return {"new_user": False, "session_id": user.email, "email": user.email, "name": user.name}


@app.post("/auth/google/complete", response_model=schemas.UserLoginOut)
def google_complete_register(payload: schemas.GoogleCompleteRegister, db: Session = Depends(get_db)):
    """Conclui o cadastro Google com nome e senha definidos pelo usuário."""
    info = _verify_google_token(payload.token)
    email = info.get("email")

    if crud.get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Este email já está cadastrado.")
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="O nome é obrigatório.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres.")

    user = crud.create_user(db, email, payload.name.strip(), payload.password)
    user.is_google = True
    db.commit()
    crud.get_or_create_session(db, email)
    return {"session_id": email, "email": email, "name": payload.name.strip()}


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


ADMIN_SECRET = os.getenv("ADMIN_SECRET", "Marisa-LivreEscolha-2026")

def verify_admin(x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Acesso negado.")


# ─── ADMIN ────────────────────────────────────────────────────────────────────

@app.get("/admin/users", tags=["admin"], dependencies=[Depends(verify_admin)])
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
            "login_type": "google" if u.is_google else "email",
            "modules_completed": modules_completed,
            "selected_careers": selected_careers,
            "definitive_career": definitive_career,
            "admin_recommendation": admin_recommendation,
        })
    return {"users": result, "total": len(result)}


@app.get("/admin/sessions", tags=["admin"], dependencies=[Depends(verify_admin)])
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


@app.delete("/admin/sessions/{session_id}", tags=["admin"], dependencies=[Depends(verify_admin)])
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


@app.post("/admin/sessions/{session_id}/recommend-career", tags=["admin"], dependencies=[Depends(verify_admin)])
def admin_recommend_career(session_id: str, payload: schemas.AdminRecommendationCreate, db: Session = Depends(get_db)):
    """Admin sugere/recomenda uma carreira para o usuário."""
    crud.get_or_create_session(db, session_id)
    crud.save_admin_recommendation(db, session_id, payload.career_id, payload.note)
    return {"status": "ok"}


@app.delete("/admin/sessions/{session_id}/recommend-career", tags=["admin"], dependencies=[Depends(verify_admin)])
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


@app.delete("/admin/answers/{answer_id}", tags=["admin"], dependencies=[Depends(verify_admin)])
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


@app.post("/admin/import-careers", tags=["admin"], dependencies=[Depends(verify_admin)])
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


# ─── MVP DE VALIDAÇÃO COMERCIAL ───────────────────────────────────────────────

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
MVP_FROM    = os.getenv("MVP_FROM_EMAIL", "Livre Escolha <noreply@livreescolha.com.br>")


def _send_mvp_email(to: str, subject: str, html: str):
    """Envia e-mail via Resend API. Silencia se RESEND_API_KEY não configurada."""
    if not RESEND_API_KEY or not to:
        print(f"[MVP EMAIL] {subject} → {to} (sem RESEND_API_KEY, apenas log)")
        return
    try:
        body = _json.dumps({"from": MVP_FROM, "to": [to], "subject": subject, "html": html}).encode()
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=body,
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=8)
    except Exception as exc:
        print(f"[MVP EMAIL ERROR] {exc}")


def _mvp_confirmation_html(nome: str) -> str:
    primeiro_nome = nome.split()[0] if nome else nome
    return f"""
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:auto;padding:0;background:#f8f7ff">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#7c3aed 100%);border-radius:16px 16px 0 0;padding:32px 28px;text-align:center">
    <div style="font-size:2rem;margin-bottom:8px">🧭</div>
    <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:900;letter-spacing:-.3px">Livre Escolha</h1>
    <p style="color:#c7c5ff;margin:4px 0 0;font-size:.88rem">Programa Próximo Destino</p>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:32px 28px">
    <h2 style="color:#1e1b4b;font-size:1.2rem;margin:0 0 12px">Olá, {primeiro_nome}! Sua vaga está reservada 🎉</h2>
    <p style="color:#4a4880;line-height:1.75;margin:0 0 24px;font-size:.95rem">
      Que ótimo ter você aqui! O <strong>Programa Próximo Destino</strong> foi criado para ajudar jovens a descobrirem sua carreira ideal com autoconhecimento real — não um simples teste vocacional.
    </p>

    <!-- Como funciona -->
    <div style="background:#f0f1fb;border-radius:12px;padding:20px 22px;margin-bottom:24px">
      <p style="margin:0 0 14px;color:#1e1b4b;font-weight:800;font-size:.95rem">📋 Como funciona a jornada:</p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:32px"><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#5b5fc7;color:#fff;border-radius:50%;font-size:.78rem;font-weight:900">1</span></td>
          <td style="padding:8px 0 8px 10px;vertical-align:top"><strong style="color:#1e1b4b;font-size:.9rem">Mapa Interior</strong><br><span style="color:#7675a0;font-size:.82rem">Perguntas curtas que revelam seus valores, preferências e estilo de trabalho</span></td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top"><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#5b5fc7;color:#fff;border-radius:50%;font-size:.78rem;font-weight:900">2</span></td>
          <td style="padding:8px 0 8px 10px;vertical-align:top"><strong style="color:#1e1b4b;font-size:.9rem">Horizonte Ampliado</strong><br><span style="color:#7675a0;font-size:.82rem">Explore mais de 100 carreiras com informações de mercado, renda e habilidades</span></td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top"><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#5b5fc7;color:#fff;border-radius:50%;font-size:.78rem;font-weight:900">3</span></td>
          <td style="padding:8px 0 8px 10px;vertical-align:top"><strong style="color:#1e1b4b;font-size:.9rem">Rota Definida</strong><br><span style="color:#7675a0;font-size:.82rem">O sistema apresenta as carreiras com maior compatibilidade com você</span></td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top"><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#5b5fc7;color:#fff;border-radius:50%;font-size:.78rem;font-weight:900">4</span></td>
          <td style="padding:8px 0 8px 10px;vertical-align:top"><strong style="color:#1e1b4b;font-size:.9rem">Plano de Voo</strong><br><span style="color:#7675a0;font-size:.82rem">Um plano de ação com 6 passos concretos do ensino médio à entrada no mercado</span></td>
        </tr>
      </table>
    </div>

    <!-- Preço e CTA -->
    <div style="background:linear-gradient(135deg,#ede9ff,#f0f1ff);border:2px solid #c7c5ff;border-radius:14px;padding:22px 24px;text-align:center;margin-bottom:24px">
      <p style="margin:0 0 4px;color:#7675a0;font-size:.8rem;text-transform:uppercase;letter-spacing:.8px">Acesso completo</p>
      <p style="margin:0 0 4px;font-size:2.4rem;font-weight:900;color:#5b5fc7;line-height:1">R$&nbsp;19<span style="font-size:1rem;font-weight:400">,00</span></p>
      <p style="margin:0 0 18px;color:#7675a0;font-size:.82rem">pagamento único · acesso por 6 meses</p>
      <a href="https://livreescolha.vercel.app" style="display:inline-block;background:#5b5fc7;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:800;font-size:.95rem">
        Acessar o Programa Próximo Destino →
      </a>
      <p style="margin:12px 0 0;color:#a8a6cc;font-size:.75rem">Sem cobrança agora — estamos abrindo o acesso em breve.</p>
    </div>

    <p style="color:#4a4880;font-size:.9rem;line-height:1.7">
      Assim que o acesso abrir oficialmente, você será avisado por aqui com o link direto para garantir sua vaga. Fique de olho na caixa de entrada! 👀
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f8f7ff;border-radius:0 0 16px 16px;padding:20px 28px;text-align:center;border-top:1px solid #dde0f7">
    <p style="margin:0;color:#7675a0;font-size:.8rem">
      <strong style="color:#5b5fc7">Livre Escolha</strong> · São Caetano do Sul, SP<br>
      Dados protegidos pela LGPD · <a href="https://livreescolha.vercel.app" style="color:#5b5fc7;text-decoration:none">livreescolha.vercel.app</a>
    </p>
  </div>
</div>"""


@app.post("/mvp/event", tags=["mvp"])
def mvp_track_event(payload: dict, db: Session = Depends(get_db)):
    """Registra evento de rastreamento do MVP (clique, scroll, demo, etc.)."""
    try:
        crud.mvp_track_event(
            db,
            session_id  = payload.get("session_id", "anonymous"),
            event_type  = payload.get("event_type", "unknown"),
            event_name  = payload.get("event_name", ""),
            event_data  = _json.dumps(payload.get("data", {})),
            utm_source  = payload.get("utm_source", ""),
            utm_medium  = payload.get("utm_medium", ""),
            utm_campaign= payload.get("utm_campaign", ""),
        )
    except Exception as exc:
        print(f"[MVP EVENT ERROR] {exc}")
    return {"ok": True}


@app.post("/mvp/lead", tags=["mvp"])
def mvp_submit_lead(payload: dict, db: Session = Depends(get_db)):
    """Salva lead/survey do MVP e envia e-mail de confirmação."""
    allowed = {
        "session_id", "nome", "email", "whatsapp", "respondent_type",
        "q1_autoconhecimento", "q2_acredita", "q3_atencao",
        "q4_interesse", "q5_pagaria", "q6_objecao", "q7_mais_infos",
        "intent_level", "utm_source", "utm_medium", "utm_campaign",
        "utm_content", "device_type", "lgpd_consent",
    }
    data = {k: v for k, v in payload.items() if k in allowed}
    lead = crud.mvp_save_lead(db, data)

    # E-mail de confirmação ao usuário
    nome  = data.get("nome") or "visitante"
    email = data.get("email") or ""
    _send_mvp_email(email, "✅ Recebemos seu interesse — Livre Escolha", _mvp_confirmation_html(nome))

    # Notificação ao admin
    if ADMIN_EMAIL:
        _send_mvp_email(
            ADMIN_EMAIL,
            f"Novo lead MVP: {nome} ({data.get('intent_level','')})",
            f"<pre>{_json.dumps(data, ensure_ascii=False, indent=2)}</pre>",
        )

    return {"ok": True, "id": lead.id}


@app.post("/mvp/diagnostic", tags=["mvp"])
def mvp_submit_diagnostic(payload: dict, db: Session = Depends(get_db)):
    """Salva resultado do diagnóstico e envia convite ao responsável."""
    nome = payload.get("nome", "").strip()
    guardian_email = payload.get("guardian_email", "").strip()
    s1 = payload.get("diag_score_autoconhecimento")
    s2 = payload.get("diag_score_pensamento_critico")
    s3 = payload.get("diag_score_profissoes")

    # Persiste como lead com campos extras
    lead_data = {
        "session_id": payload.get("session_id", "diag_" + str(__import__("time").time())),
        "nome": nome,
        "email": guardian_email,
        "respondent_type": "adolescente_diagnostico",
        "intent_level": "guardian_invite",
        "lgpd_consent": payload.get("lgpd_consent", False),
    }
    lead = crud.mvp_save_lead(db, lead_data)

    # E-mail de convite ao responsável
    if guardian_email:
        resp_url = f"{FRONTEND_URL}/responsavel.html?nome={__import__('urllib.parse', fromlist=['quote']).parse.quote(nome)}&ref={lead.id}"
        _send_mvp_email(
            guardian_email,
            f"{nome} quer continuar a jornada do Próximo Destino",
            _guardian_invite_html(nome, resp_url),
        )

    # Notificação ao admin
    if ADMIN_EMAIL:
        axis_names = {1: "Autoconhecimento", 2: "Pensamento Crítico", 3: "Profissões e Mercado"}
        scores_txt = f"AC={s1} · PC={s2} · PM={s3}" if all(x is not None for x in [s1, s2, s3]) else "sem scores"
        _send_mvp_email(
            ADMIN_EMAIL,
            f"Diagnóstico concluído: {nome} ({scores_txt})",
            f"<pre>Nome: {nome}\nResponsável: {guardian_email}\nScores: {scores_txt}\nLead ID: {lead.id}</pre>",
        )

    return {"ok": True, "id": lead.id}


def _guardian_invite_html(nome: str, resp_url: str) -> str:
    pn = nome.split()[0] if nome else nome
    return f"""
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:auto;background:#f0f4ff">
  <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:32px 28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:900">LivreEscolha</h1>
    <p style="color:#818cf8;margin:4px 0 0;font-size:.9rem">Programa Próximo Destino</p>
  </div>
  <div style="background:#fff;padding:32px 28px">
    <h2 style="color:#0f172a;font-size:1.2rem;margin:0 0 16px">{nome} quer continuar a jornada do Próximo Destino</h2>
    <p style="color:#475569;line-height:1.75;margin:0 0 20px;font-size:.95rem">
      Ele(a) realizou o diagnóstico inicial e agora pode continuar explorando interesses, habilidades, possibilidades profissionais e próximos passos.
    </p>
    <div style="background:#eef2ff;border-radius:12px;padding:20px 22px;margin-bottom:24px;text-align:center">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:.8rem;text-transform:uppercase;letter-spacing:1px">Acesso completo</p>
      <p style="margin:0;font-size:2.4rem;font-weight:900;color:#0f172a;line-height:1">R$&nbsp;19<span style="font-size:1rem;font-weight:400">,00</span></p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:.8rem">pagamento único · acesso por 6 meses</p>
    </div>
    <a href="{resp_url}"
       style="display:block;background:#6366f1;color:#fff;text-decoration:none;padding:15px 28px;border-radius:12px;font-weight:800;font-size:.95rem;text-align:center;margin-bottom:16px">
      Conhecer o Próximo Destino →
    </a>
    <p style="color:#94a3b8;font-size:.8rem;text-align:center">Dados protegidos pela LGPD · livreescolha.vercel.app</p>
  </div>
</div>"""


@app.get("/mvp/stats", tags=["mvp"], dependencies=[Depends(verify_admin)])
def mvp_get_stats(db: Session = Depends(get_db)):
    """Retorna métricas do MVP para o dashboard administrativo."""
    return crud.mvp_get_stats(db)


@app.get("/mvp/export", tags=["mvp"], dependencies=[Depends(verify_admin)])
def mvp_export(db: Session = Depends(get_db)):
    """Exporta todos os leads em formato JSON (use para gerar CSV no frontend)."""
    return crud.mvp_export_csv(db)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
