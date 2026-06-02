"""
Script para importar as carreiras do SQLite local para o PostgreSQL do Render.
Execute uma vez: python import_careers.py
"""
import json
import urllib.request

BACKEND_URL = "https://livreescolha-backend.onrender.com/admin/import-careers"

with open("careers_export.json", "r", encoding="utf-8") as f:
    careers = json.load(f)

print(f"Enviando {len(careers)} carreiras para o Render...")

data = json.dumps(careers).encode("utf-8")
req = urllib.request.Request(BACKEND_URL, data=data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
        print(f"✅ Importadas com sucesso: {result['inserted']} carreiras inseridas!")
except Exception as e:
    print(f"❌ Erro: {e}")
