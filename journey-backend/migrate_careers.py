# -*- coding: utf-8 -*-
"""
migrate_careers.py
------------------
* Adiciona as colunas novas a tabela 'careers' no SQLite (se ainda nao existirem)
* Le a planilha ATIVIDADE 4 e importa todas as profissoes
* As 8 carreiras antigas sao ATUALIZADAS (por titulo), nao duplicadas
* Execute: python migrate_careers.py
"""

import sqlite3
import os
import sys

try:
    import openpyxl
except ImportError:
    print("ERRO: openpyxl nao esta instalado. Execute: pip install openpyxl")
    sys.exit(1)

# -- Localiza o banco de dados -------------------------------------------------
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DB_PATH     = os.path.join(SCRIPT_DIR, "journey.db")

# -- Localiza o arquivo Excel --------------------------------------------------
EXCEL_CANDIDATES = [
    os.path.join(os.path.dirname(SCRIPT_DIR),
                 "Copia de Copy of ATIVIDADE 4 _ Criando ideias de futuros.xlsx"),
    os.path.join(os.path.dirname(SCRIPT_DIR),
                 u"Cópia de Copy of ATIVIDADE 4 _ Criando idéias de futuros.xlsx"),
    os.path.join(os.path.expanduser("~"), "Downloads",
                 u"Cópia de Copy of ATIVIDADE 4 _ Criando idéias de futuros.xlsx"),
    os.path.join(os.path.expanduser("~"), "Downloads",
                 "Copy of ATIVIDADE 4 _ Criando ideias de futuros.xlsx"),
    # Tenta encontrar qualquer arquivo com ATIVIDADE 4 na pasta pai
]

EXCEL_PATH = None
for p in EXCEL_CANDIDATES:
    if os.path.exists(p):
        EXCEL_PATH = p
        break

# Se nao encontrou, busca na pasta pai e Downloads
if not EXCEL_PATH:
    search_dirs = [os.path.dirname(SCRIPT_DIR), os.path.expanduser("~/Downloads")]
    for d in search_dirs:
        if os.path.isdir(d):
            for f in os.listdir(d):
                if "ATIVIDADE 4" in f and f.endswith(".xlsx"):
                    EXCEL_PATH = os.path.join(d, f)
                    break
        if EXCEL_PATH:
            break

if not EXCEL_PATH:
    print("ERRO: Arquivo Excel nao encontrado.")
    print("Caminhos tentados:")
    for p in EXCEL_CANDIDATES:
        print("  " + p)
    print("\nColoque o arquivo na pasta pai do projeto ou em Downloads.")
    sys.exit(1)

print("[OK] Excel encontrado: " + EXCEL_PATH)
print("[OK] Banco de dados  : " + DB_PATH)

# -- Colunas novas a adicionar ------------------------------------------------
NEW_COLUMNS = [
    ("campo_conhecimento",         "TEXT"),
    ("descricao_campo",            "TEXT"),
    ("areas_atuacao",              "TEXT"),
    ("tendencias_mercado",         "TEXT"),
    ("potencial_renda",            "TEXT"),
    ("requisitos_formacao",        "TEXT"),
    ("habilidades_essenciais",     "TEXT"),
    ("ambiente_trabalho",          "TEXT"),
    ("possibilidades_crescimento", "TEXT"),
    ("desafios_desvantagens",      "TEXT"),
    ("proximos_passos",            "TEXT"),
]

# -- Conecta ao SQLite ---------------------------------------------------------
conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

cur.execute("PRAGMA table_info(careers)")
existing_cols = {row[1] for row in cur.fetchall()}

for col_name, col_type in NEW_COLUMNS:
    if col_name not in existing_cols:
        cur.execute("ALTER TABLE careers ADD COLUMN {} {}".format(col_name, col_type))
        print("  + coluna '{}' adicionada".format(col_name))
    else:
        print("  = coluna '{}' ja existe".format(col_name))

conn.commit()

# -- Le o Excel ----------------------------------------------------------------
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
ws = wb.active
print("\n[Excel] Aba ativa: '{}' | {} linhas x {} colunas".format(
    ws.title, ws.max_row, ws.max_column))

def cell_val(row, col):
    """Retorna texto limpo de uma celula (None se vazio)."""
    v = ws.cell(row=row, column=col).value
    if v is None:
        return None
    return str(v).strip() or None

# -- Mapas de cores e icones para campos de conhecimento ----------------------
FIELD_COLORS = {
    "Tecnologia da Informacao e Comunicacao": "#4F46E5",
    "Tecnologia da Informação e Comunicação": "#4F46E5",
    "Engenharias":                              "#F97316",
    "Ciências da Saúde":              "#EC4899",
    "Ciencias da Saude":                        "#EC4899",
    "Ciências Biológicas":            "#8B5CF6",
    "Ciencias Biologicas":                      "#8B5CF6",
    "Ciências Exatas e da Terra":          "#06B6D4",
    "Ciencias Exatas e da Terra":               "#06B6D4",
    "Ciências Sociais Aplicadas":          "#EF4444",
    "Ciencias Sociais Aplicadas":               "#EF4444",
    "Ciências Humanas":                    "#10B981",
    "Ciencias Humanas":                         "#10B981",
    "Linguística, Letras e Artes":         "#F59E0B",
    "Linguistica, Letras e Artes":              "#F59E0B",
    "Multidisciplinar":                         "#64748B",
    "Gestão e Negócios":              "#0EA5E9",
    "Gestao e Negocios":                        "#0EA5E9",
    "Design":                                   "#A855F7",
    "Educação":                       "#10B981",
    "Educacao":                                 "#10B981",
    "Agrárias":                            "#84CC16",
    "Agrarias":                                 "#84CC16",
    "Arquitetura e Urbanismo":                  "#78716C",
}

DEFAULT_COLOR = "#6366F1"

FIELD_ICONS = {
    "Tecnologia da Informacao e Comunicacao":   "code",
    "Tecnologia da Informação e Comunicação": "code",
    "Engenharias":                              "wrench",
    "Ciências da Saúde":              "heart",
    "Ciencias da Saude":                        "heart",
    "Ciências Biológicas":            "microscope",
    "Ciencias Biologicas":                      "microscope",
    "Ciências Exatas e da Terra":          "calculator",
    "Ciencias Exatas e da Terra":               "calculator",
    "Ciências Sociais Aplicadas":          "trending-up",
    "Ciencias Sociais Aplicadas":               "trending-up",
    "Ciências Humanas":                    "users",
    "Ciencias Humanas":                         "users",
    "Linguística, Letras e Artes":         "book",
    "Linguistica, Letras e Artes":              "book",
    "Multidisciplinar":                         "star",
    "Gestão e Negócios":              "briefcase",
    "Gestao e Negocios":                        "briefcase",
    "Design":                                   "palette",
    "Educação":                       "graduation-cap",
    "Educacao":                                 "graduation-cap",
    "Agrárias":                            "leaf",
    "Agrarias":                                 "leaf",
    "Arquitetura e Urbanismo":                  "home",
}

DEFAULT_ICON = "briefcase"

TAG_MAP = {
    "Tecnologia da Informacao e Comunicacao":   "tech,analytical,independent,problem-solving",
    "Tecnologia da Informação e Comunicação": "tech,analytical,independent,problem-solving",
    "Engenharias":                              "tech,analytical,problem-solving,precision",
    "Ciências da Saúde":              "people,empathy,healthcare,analytical",
    "Ciencias da Saude":                        "people,empathy,healthcare,analytical",
    "Ciências Biológicas":            "research,analytical,science,independent",
    "Ciencias Biologicas":                      "research,analytical,science,independent",
    "Ciências Exatas e da Terra":          "analytical,research,science,precision",
    "Ciencias Exatas e da Terra":               "analytical,research,science,precision",
    "Ciências Sociais Aplicadas":          "analytical,communication,creative,business",
    "Ciencias Sociais Aplicadas":               "analytical,communication,creative,business",
    "Ciências Humanas":                    "people,communication,social,teaching",
    "Ciencias Humanas":                         "people,communication,social,teaching",
    "Linguística, Letras e Artes":         "creative,communication,social,independent",
    "Linguistica, Letras e Artes":              "creative,communication,social,independent",
    "Multidisciplinar":                         "flexible,analytical,creative,communication",
    "Gestão e Negócios":              "leadership,analytical,communication,business",
    "Gestao e Negocios":                        "leadership,analytical,communication,business",
    "Design":                                   "creative,visual,tech,communication",
    "Educação":                       "people,communication,teaching,social",
    "Educacao":                                 "people,communication,teaching,social",
    "Agrárias":                            "practical,science,independent,environment",
    "Agrarias":                                 "practical,science,independent,environment",
    "Arquitetura e Urbanismo":                  "creative,analytical,practical,design",
}

# -- Detecta linha de cabecalho ------------------------------------------------
# A linha 3 tem: col A="Campo de Conhecimento", col B="Profissao"
# Procura ate a linha 6 por "Profissao" em col A ou B
header_row = 3  # padrao conhecido para este arquivo
for r in range(1, 8):
    va = cell_val(r, 1)  # col A
    vb = cell_val(r, 2)  # col B
    for v in [va, vb]:
        if v and any(kw in v.lower() for kw in ["profiss", "titulo", "título", "campo"]):
            header_row = r
            break

data_start = header_row + 1
print("[Info] Cabecalho na linha {}, dados a partir da linha {}".format(
    header_row, data_start))

# -- Itera pelas profissoes ---------------------------------------------------
inserted = 0
updated  = 0

for r in range(data_start, ws.max_row + 1):
    titulo = cell_val(r, 2)  # col B - titulo da profissao
    if not titulo:
        continue

    campo               = cell_val(r, 1)   # col A - Campo de Conhecimento
    # col C (3) = checkbox "Selecionar" - ignorado
    descricao_campo     = cell_val(r, 4)   # col D - Descricao Breve do Campo
    areas_atuacao       = cell_val(r, 5)   # col E - Areas de Atuacao
    descricao_profissao = cell_val(r, 6)   # col F - Descricao da Profissao
    tendencias_mercado  = cell_val(r, 7)   # col G - Tendencias e Mercado
    potencial_renda     = cell_val(r, 8)   # col H - Potencial de Renda
    requisitos_formacao = cell_val(r, 9)   # col I - Requisitos de Formacao
    habilidades         = cell_val(r, 10)  # col J - Habilidades Essenciais
    ambiente            = cell_val(r, 11)  # col K - Ambiente de Trabalho
    possibilidades      = cell_val(r, 12)  # col L - Possibilidades de Crescimento
    desafios            = cell_val(r, 13)  # col M - Desafios e Desvantagens
    proximos_passos     = cell_val(r, 14)  # col N - Proximos Passos

    icon_color = FIELD_COLORS.get(campo, DEFAULT_COLOR) if campo else DEFAULT_COLOR
    icon       = FIELD_ICONS.get(campo, DEFAULT_ICON)   if campo else DEFAULT_ICON
    tags       = TAG_MAP.get(campo, "")                 if campo else ""

    cur.execute("SELECT id FROM careers WHERE title = ?", (titulo,))
    row = cur.fetchone()

    if row:
        cur.execute("""
            UPDATE careers SET
                description                = ?,
                icon                       = ?,
                icon_color                 = ?,
                tags                       = ?,
                campo_conhecimento         = ?,
                descricao_campo            = ?,
                areas_atuacao              = ?,
                tendencias_mercado         = ?,
                potencial_renda            = ?,
                requisitos_formacao        = ?,
                habilidades_essenciais     = ?,
                ambiente_trabalho          = ?,
                possibilidades_crescimento = ?,
                desafios_desvantagens      = ?,
                proximos_passos            = ?
            WHERE title = ?
        """, (
            descricao_profissao, icon, icon_color, tags,
            campo, descricao_campo, areas_atuacao,
            tendencias_mercado, potencial_renda, requisitos_formacao,
            habilidades, ambiente, possibilidades, desafios, proximos_passos,
            titulo
        ))
        updated += 1
    else:
        cur.execute("""
            INSERT INTO careers
                (title, description, icon, icon_color, tags, match_score,
                 campo_conhecimento, descricao_campo, areas_atuacao,
                 tendencias_mercado, potencial_renda, requisitos_formacao,
                 habilidades_essenciais, ambiente_trabalho,
                 possibilidades_crescimento, desafios_desvantagens, proximos_passos)
            VALUES (?,?,?,?,?,0,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            titulo, descricao_profissao, icon, icon_color, tags,
            campo, descricao_campo, areas_atuacao,
            tendencias_mercado, potencial_renda, requisitos_formacao,
            habilidades, ambiente, possibilidades, desafios, proximos_passos,
        ))
        inserted += 1

conn.commit()
conn.close()
wb.close()

print("\n[CONCLUIDO] Migracao de carreiras finalizada!")
print("  Inseridas  : {}".format(inserted))
print("  Atualizadas: {}".format(updated))
print("  Total      : {}".format(inserted + updated))
