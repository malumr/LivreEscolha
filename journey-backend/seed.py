"""
Seed: popula o banco com os dados iniciais do app.
Execute via: POST /seed   ou   python seed.py
"""

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)


# ─── DADOS ───────────────────────────────────────────────────────────────────

MODULES = [
    {
        "slug": "mapa-interior",
        "title": "Mapa Interior",
        "description": "Descubra mais sobre você",
        "icon": "compass",
        "order": 1,
    },
    {
        "slug": "horizonte-ampliado",
        "title": "Horizonte Ampliado",
        "description": "Explore possibilidades de carreira",
        "icon": "eye",
        "order": 2,
    },
    {
        "slug": "rota-definida",
        "title": "Rota Definida",
        "description": "Identifique caminhos ideais",
        "icon": "route",
        "order": 3,
    },
    {
        "slug": "plano-de-voo",
        "title": "Plano de Voo",
        "description": "Planeje seus próximos passos",
        "icon": "plane",
        "order": 4,
    },
]

# Perguntas do Mapa Interior (module slug: "mapa-interior")
MAPA_INTERIOR_QUESTIONS = [
    {
        "order": 1,
        "text": "Você prefere trabalhar:",
        "options": [
            {"text": "Sozinho",     "career_tags": "independent,analytical,research,tech"},
            {"text": "Em equipe",   "career_tags": "team,people,management,teaching"},
            {"text": "Depende",     "career_tags": "flexible,management,consulting"},
        ],
    },
    {
        "order": 2,
        "text": "Quando enfrenta um problema, você prefere:",
        "options": [
            {"text": "Buscar soluções práticas",  "career_tags": "practical,engineering,tech,entrepreneurship"},
            {"text": "Analisar profundamente",    "career_tags": "analytical,research,science,strategy"},
            {"text": "Pedir ajuda",               "career_tags": "team,people,collaborative,consulting"},
        ],
    },
    {
        "order": 3,
        "text": "O que mais te motiva?",
        "options": [
            {"text": "Criar algo novo",   "career_tags": "creative,entrepreneurship,design,tech,innovation"},
            {"text": "Ajudar pessoas",    "career_tags": "people,teaching,psychology,social,healthcare"},
            {"text": "Resolver desafios", "career_tags": "analytical,engineering,research,science,strategy"},
        ],
    },
]

CAREERS = [
    {
        "title": "Desenvolvedor de Software",
        "description": "Cria aplicativos, sistemas e soluções tecnológicas para resolver problemas do mundo real",
        "icon": "code",
        "icon_color": "#4F46E5",
        "tags": "tech,analytical,independent,practical,innovation",
    },
    {
        "title": "Psicólogo",
        "description": "Ajuda pessoas a compreender e lidar com questões emocionais, comportamentais e mentais",
        "icon": "heart",
        "icon_color": "#EC4899",
        "tags": "people,social,analytical,healthcare,collaborative",
    },
    {
        "title": "Designer Gráfico",
        "description": "Desenvolve identidades visuais, materiais publicitários e soluções de comunicação visual",
        "icon": "palette",
        "icon_color": "#8B5CF6",
        "tags": "creative,design,independent,innovation,practical",
    },
    {
        "title": "Gestor de Negócios",
        "description": "Administra empresas, coordena equipes e desenvolve estratégias de crescimento",
        "icon": "briefcase",
        "icon_color": "#10B981",
        "tags": "management,team,strategy,people,entrepreneurship",
    },
    {
        "title": "Pesquisador Científico",
        "description": "Conduz estudos e experimentos para expandir o conhecimento em diversas áreas",
        "icon": "microscope",
        "icon_color": "#06B6D4",
        "tags": "research,analytical,science,independent,innovation",
    },
    {
        "title": "Professor",
        "description": "Educa e inspira alunos, compartilhando conhecimento e desenvolvendo habilidades",
        "icon": "graduation-cap",
        "icon_color": "#F59E0B",
        "tags": "teaching,people,social,collaborative,team",
    },
    {
        "title": "Engenheiro",
        "description": "Projeta, desenvolve e implementa soluções técnicas para problemas complexos",
        "icon": "wrench",
        "icon_color": "#F97316",
        "tags": "engineering,practical,analytical,independent,science",
    },
    {
        "title": "Analista de Marketing",
        "description": "Desenvolve estratégias para promover produtos e serviços no mercado",
        "icon": "trending-up",
        "icon_color": "#EF4444",
        "tags": "strategy,creative,team,people,entrepreneurship",
    },
]


# ─── SEED ────────────────────────────────────────────────────────────────────

def run_seed(db: Session):
    # Evita duplicar dados se já existirem
    if db.query(models.Module).count() > 0:
        print("Banco já populado. Pulando seed.")
        return

    print("Populando banco de dados...")

    # Módulos
    module_map: dict[str, models.Module] = {}
    for m_data in MODULES:
        module = models.Module(**m_data)
        db.add(module)
        db.flush()
        module_map[m_data["slug"]] = module

    # Perguntas do Mapa Interior
    mapa = module_map["mapa-interior"]
    for q_data in MAPA_INTERIOR_QUESTIONS:
        question = models.Question(
            module_id=mapa.id,
            order=q_data["order"],
            text=q_data["text"],
        )
        db.add(question)
        db.flush()

        for opt in q_data["options"]:
            option = models.QuestionOption(
                question_id=question.id,
                text=opt["text"],
                career_tags=opt["career_tags"],
            )
            db.add(option)

    # Carreiras
    for c_data in CAREERS:
        career = models.Career(**c_data)
        db.add(career)

    db.commit()
    print(f"✅ Seed completo: {len(MODULES)} módulos, {len(CAREERS)} carreiras.")


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
