from pathlib import Path
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)


# ─── MÓDULOS ─────────────────────────────────────────────────────────────────

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


MAPA_INTERIOR_QUESTIONS = [
    {
        "order": 1,
        "text": "Você prefere trabalhar:",
        "options": [
            {"text": "Sozinho", "career_tags": "independent,analytical,research,tech"},
            {"text": "Em equipe", "career_tags": "team,people,management,teaching"},
            {"text": "Depende", "career_tags": "flexible,management,consulting"},
        ],
    },
    {
        "order": 2,
        "text": "Quando enfrenta um problema, você prefere:",
        "options": [
            {
                "text": "Buscar soluções práticas",
                "career_tags": "practical,engineering,tech,entrepreneurship",
            },
            {
                "text": "Analisar profundamente",
                "career_tags": "analytical,research,science,strategy",
            },
            {
                "text": "Pedir ajuda",
                "career_tags": "team,people,collaborative,consulting",
            },
        ],
    },
    {
        "order": 3,
        "text": "O que mais te motiva?",
        "options": [
            {
                "text": "Criar algo novo",
                "career_tags": "creative,entrepreneurship,design,tech,innovation",
            },
            {
                "text": "Ajudar pessoas",
                "career_tags": "people,teaching,psychology,social,healthcare",
            },
            {
                "text": "Resolver desafios",
                "career_tags": "analytical,engineering,research,science,strategy",
            },
        ],
    },
]


# ─── IMPORTAÇÃO DAS 342 PROFISSÕES ───────────────────────────────────────────

SQL_COLUMNS = [
    "titulo",
    "campo_conhecimento",
    "descricao_campo",
    "areas_atuacao",
    "descricao_profissao",
    "tendencias_mercado",
    "potencial_renda",
    "requisitos_formacao",
    "habilidades_essenciais",
    "ambiente_trabalho",
    "possibilidades_crescimento",
    "desafios_desvantagens",
    "proximos_passos",
    "icone",
    "cor_icone",
]


def _parse_sql_values(line: str) -> list[str | None]:
    """
    Lê apenas o trecho VALUES (...) de um INSERT MySQL.
    Também entende apóstrofo SQL escapado como duas aspas simples: ''.
    """
    marker = " VALUES "
    if marker not in line:
        return []

    values_text = line.split(marker, 1)[1].strip()

    if not values_text.startswith("(") or not values_text.endswith(");"):
        return []

    values_text = values_text[1:-2]

    values = []
    i = 0

    while i < len(values_text):
        while i < len(values_text) and values_text[i] in " \t,":
            i += 1

        if i >= len(values_text):
            break

        if values_text[i] == "'":
            i += 1
            buffer = []

            while i < len(values_text):
                if values_text[i] == "'":
                    if i + 1 < len(values_text) and values_text[i + 1] == "'":
                        buffer.append("'")
                        i += 2
                        continue

                    i += 1
                    break

                buffer.append(values_text[i])
                i += 1

            values.append("".join(buffer))
        else:
            start = i
            while i < len(values_text) and values_text[i] != ",":
                i += 1

            token = values_text[start:i].strip()
            values.append(None if token.upper() == "NULL" else token)

    return values


def _find_profissoes_sql() -> Path:
    """
    O arquivo profissoes_seed.sql está na raiz do repositório.
    seed.py fica em journey-backend, então primeiro tenta ../profissoes_seed.sql.
    """
    backend_dir = Path(__file__).resolve().parent

    candidates = [
        backend_dir.parent / "profissoes_seed.sql",
        backend_dir / "profissoes_seed.sql",
    ]

    for path in candidates:
        if path.exists():
            return path

    raise FileNotFoundError(
        "Não encontrei profissoes_seed.sql. "
        "Ele deve estar na raiz do repositório LivreEscolha."
    )


def _load_profissoes() -> list[dict]:
    sql_path = _find_profissoes_sql()
    text = sql_path.read_text(encoding="utf-8")

    careers = []

    for line in text.splitlines():
        line = line.strip()

        if not line.startswith("INSERT IGNORE INTO profissoes"):
            continue

        values = _parse_sql_values(line)

        if len(values) != len(SQL_COLUMNS):
            raise ValueError(
                f"INSERT inválido em profissoes_seed.sql: "
                f"esperava {len(SQL_COLUMNS)} valores, encontrei {len(values)}."
            )

        row = dict(zip(SQL_COLUMNS, values))

        careers.append(
            {
                "title": row["titulo"],
                "description": row["descricao_profissao"],
                "icon": row["icone"],
                "icon_color": row["cor_icone"],
                # A planilha original não possui a coluna de tags do motor atual.
                # Mantemos vazio em vez de inventar classificação.
                "tags": "",
                "campo_conhecimento": row["campo_conhecimento"],
                "descricao_campo": row["descricao_campo"],
                "areas_atuacao": row["areas_atuacao"],
                "tendencias_mercado": row["tendencias_mercado"],
                "potencial_renda": row["potencial_renda"],
                "requisitos_formacao": row["requisitos_formacao"],
                "habilidades_essenciais": row["habilidades_essenciais"],
                "ambiente_trabalho": row["ambiente_trabalho"],
                "possibilidades_crescimento": row["possibilidades_crescimento"],
                "desafios_desvantagens": row["desafios_desvantagens"],
                "proximos_passos": row["proximos_passos"],
            }
        )

    if not careers:
        raise ValueError("Nenhuma profissão foi encontrada em profissoes_seed.sql.")

    return careers


# ─── SEED ─────────────────────────────────────────────────────────────────────

def _seed_modules_if_needed(db: Session):
    """Cria módulos/perguntas apenas se ainda não existirem."""
    if db.query(models.Module).count() > 0:
        return

    module_map: dict[str, models.Module] = {}

    for m_data in MODULES:
        module = models.Module(**m_data)
        db.add(module)
        db.flush()
        module_map[m_data["slug"]] = module

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
            db.add(
                models.QuestionOption(
                    question_id=question.id,
                    text=opt["text"],
                    career_tags=opt["career_tags"],
                )
            )

    db.commit()


def _replace_test_careers_with_full_list(db: Session) -> int:
    """
    Troca as carreiras de teste pela lista completa da planilha.

    Se o banco já tiver a lista completa (300+ carreiras), não importa novamente.
    """
    current_count = db.query(models.Career).count()

    if current_count >= 300:
        print(f"Carreiras já importadas: {current_count}. Pulando importação.")
        return 0

    careers = _load_profissoes()

    # Remove somente dados que dependem diretamente dos IDs das carreiras antigas.
    # Usuários, respostas e progresso dos módulos são preservados.
    db.query(models.AdminRecommendation).delete()
    db.query(models.DefinitiveCareer).delete()
    db.query(models.CareerSelection).delete()
    db.query(models.Career).delete()
    db.commit()

    for data in careers:
        db.add(models.Career(**data))

    db.commit()

    print(f"✅ {len(careers)} profissões importadas para a tabela careers.")
    return len(careers)


def run_seed(db: Session):
    _seed_modules_if_needed(db)
    imported = _replace_test_careers_with_full_list(db)

    total_modules = db.query(models.Module).count()
    total_careers = db.query(models.Career).count()

    print(
        f"✅ Seed concluído: {total_modules} módulos e "
        f"{total_careers} carreiras no banco. "
        f"Novas carreiras importadas nesta execução: {imported}."
    )


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
