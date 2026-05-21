# -*- coding: utf-8 -*-
"""
patch_seed_careers.py
---------------------
Copia os dados detalhados do Excel para as 6 carreiras originais
que nao foram atualizadas pela migracao (titulos diferentes).

Mapeamento manual: titulo_no_banco -> titulo_no_excel
Execute: python patch_seed_careers.py
"""

import sqlite3, os, sys

try:
    import openpyxl
except ImportError:
    print("ERRO: pip install openpyxl")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH    = os.path.join(SCRIPT_DIR, "journey.db")

# Localiza o Excel
EXCEL_PATH = None
d = os.path.expanduser("~/Downloads")
if os.path.isdir(d):
    for f in os.listdir(d):
        if "ATIVIDADE" in f and f.endswith(".xlsx"):
            EXCEL_PATH = os.path.join(d, f)
            break

if not EXCEL_PATH:
    print("ERRO: Excel nao encontrado em Downloads")
    sys.exit(1)

print("Excel:", EXCEL_PATH)

# Mapeamento: titulo_no_banco -> titulo_no_excel (exato, como aparece na col B)
MAPPING = {
    "Desenvolvedor de Software": "Engenheiro de Software",
    "Psicólogo":                 "Psicologo",
    "Gestor de Negócios":        "Gestor de Negócios e Inovação",
    "Pesquisador Científico":    "Pesquisador(a) de Mercado (Qualitativo)",
    "Professor":                 "Professor(a) / Educador(a)",
    "Engenheiro":                "Engenheiro Mecânico",
    "Analista de Marketing":     "Gestor de Marketing e Vendas",
}

# Le o Excel e monta dicionario titulo -> dados
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
ws = wb.active

def cell_val(row, col):
    v = ws.cell(row=row, column=col).value
    if v is None:
        return None
    return str(v).strip() or None

# Encontra linha de cabecalho (default 3)
header_row = 3
data_start = header_row + 1

excel_data = {}
for r in range(data_start, ws.max_row + 1):
    titulo = cell_val(r, 2)
    if not titulo:
        continue
    excel_data[titulo] = {
        "campo_conhecimento":         cell_val(r, 1),
        "descricao_campo":            cell_val(r, 4),
        "areas_atuacao":              cell_val(r, 5),
        "description":                cell_val(r, 6),
        "tendencias_mercado":         cell_val(r, 7),
        "potencial_renda":            cell_val(r, 8),
        "requisitos_formacao":        cell_val(r, 9),
        "habilidades_essenciais":     cell_val(r, 10),
        "ambiente_trabalho":          cell_val(r, 11),
        "possibilidades_crescimento": cell_val(r, 12),
        "desafios_desvantagens":      cell_val(r, 13),
        "proximos_passos":            cell_val(r, 14),
    }

wb.close()
print("Profissoes lidas do Excel:", len(excel_data))

# Atualiza o banco
conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

updated = 0
for db_title, excel_title in MAPPING.items():
    # Verifica se ja tem dados
    cur.execute("SELECT habilidades_essenciais FROM careers WHERE title = ?", (db_title,))
    row = cur.fetchone()
    if row is None:
        print("  [NAO ENCONTRADO no banco]", db_title)
        continue

    if row[0]:
        print("  [JA TEM DADOS]", db_title, "- pulando")
        continue

    data = excel_data.get(excel_title)
    if not data:
        print("  [NAO ACHADO no Excel]", excel_title, "- tentando busca parcial...")
        # Busca parcial: primeira palavra do titulo
        first_word = excel_title.split()[0].lower()
        for et, ed in excel_data.items():
            if first_word in et.lower():
                data = ed
                print("    -> Usando:", et)
                break

    if not data:
        print("  [FALHOU]", db_title, "- nenhuma correspondencia encontrada")
        continue

    cur.execute("""
        UPDATE careers SET
            description                = COALESCE(?, description),
            campo_conhecimento         = COALESCE(?, campo_conhecimento),
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
        data["description"],
        data["campo_conhecimento"],
        data["descricao_campo"],
        data["areas_atuacao"],
        data["tendencias_mercado"],
        data["potencial_renda"],
        data["requisitos_formacao"],
        data["habilidades_essenciais"],
        data["ambiente_trabalho"],
        data["possibilidades_crescimento"],
        data["desafios_desvantagens"],
        data["proximos_passos"],
        db_title
    ))
    print("  [OK]", db_title, "->", excel_title)
    updated += 1

conn.commit()
conn.close()
print("\nConcluido! Carreiras atualizadas:", updated)
