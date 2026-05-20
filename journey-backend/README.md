   # 🗺️ Sua Jornada — Backend API

Backend em Python (FastAPI + SQLite) para o app de desenvolvimento de carreira.

---

## 🚀 Setup

```bash
# 1. Instale as dependências
pip install -r requirements.txt

# 2. Suba o servidor
uvicorn main:app --reload

# 3. Popule o banco com módulos, perguntas e carreiras
curl -X POST http://localhost:8000/seed
```

Acesse a documentação interativa em: **http://localhost:8000/docs**

---

## 📁 Estrutura de arquivos

```
journey_backend/
├── main.py           # Rotas FastAPI
├── database.py       # Conexão SQLAlchemy + SQLite
├── models.py         # Tabelas do banco (ORM)
├── schemas.py        # Validação de dados (Pydantic)
├── crud.py           # Operações no banco
├── career_engine.py  # Motor de recomendação de carreiras
├── seed.py           # Dados iniciais
└── requirements.txt
```

---

## 🔌 Fluxo de integração com o frontend

### 1. Tela "Sua Jornada" (módulos)
```
GET /modules
→ Retorna os 4 módulos com título, descrição e ícone
```

### 2. Mapa Interior (questionário)
```
# Busca as perguntas
GET /modules/1/questions
→ Retorna lista de perguntas com suas opções

# Salva cada resposta conforme o usuário avança
POST /sessions/{session_id}/answers
Body: { "question_id": 1, "option_id": 2 }

# Ao finalizar o módulo
POST /sessions/{session_id}/complete-module/1
```

> **session_id**: gere um UUID no frontend e salve no localStorage.
> Exemplo JS: `const sessionId = crypto.randomUUID()`

### 3. Horizonte Ampliado (carreiras recomendadas)
```
GET /sessions/{session_id}/careers
→ Retorna carreiras ordenadas por compatibilidade com as respostas
   Cada carreira tem um "match_score" de 0.0 a 1.0
```

### 4. Progresso geral
```
GET /sessions/{session_id}/progress
→ Retorna o status de cada módulo (concluído ou não)
```

---

## 🧠 Motor de Recomendação

Cada opção de resposta tem **tags** associadas a perfis de carreira:

| Resposta | Tags |
|---|---|
| Trabalhar sozinho | `independent, analytical, research, tech` |
| Buscar soluções práticas | `practical, engineering, tech` |
| Criar algo novo | `creative, design, innovation` |
| Ajudar pessoas | `people, teaching, psychology` |

Cada carreira também tem suas tags. O score é calculado pela **interseção** das tags coletadas com as da carreira, normalizado pela quantidade de respostas.

---

## 🗄️ Banco de dados

SQLite local (`journey.db`). Para produção, troque a `DATABASE_URL` em `database.py`:

```python
# PostgreSQL
DATABASE_URL = "postgresql://user:password@localhost/journey_db"

# MySQL
DATABASE_URL = "mysql+pymysql://user:password@localhost/journey_db"
```

---

## 📊 Diagrama de tabelas

```
modules ──< questions ──< question_options
                               │
user_sessions ──< answers ─────┘
user_sessions ──< module_progress ──> modules

careers  (standalone, score calculado dinamicamente)
```
