-- ============================================================
--  PRÓXIMO DESTINO  —  Diagrama Entidade-Relacionamento (DER)
--  Banco de dados: MySQL 8.0+
--  Compatível com MySQL Workbench
--  Criado para integração futura com o frontend/backend do projeto
-- ============================================================

CREATE DATABASE IF NOT EXISTS proximo_destino
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE proximo_destino;

-- ============================================================
-- 1. USUÁRIOS
--    Representa cada pessoa cadastrada no sistema.
--    tipo_login: 'email' ou 'google'
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(100)        NOT NULL,
    email           VARCHAR(255)        NOT NULL UNIQUE,
    senha_hash      VARCHAR(255)        NOT NULL DEFAULT '',  -- vazio para login Google
    tipo_login      ENUM('email','google') NOT NULL DEFAULT 'email',
    ativo           TINYINT(1)          NOT NULL DEFAULT 1,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Usuários cadastrados no sistema';


-- ============================================================
-- 2. TOKENS DE REDEFINIÇÃO DE SENHA
--    Link temporário enviado por email (válido por 1 hora)
-- ============================================================
CREATE TABLE IF NOT EXISTS tokens_reset_senha (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    email       VARCHAR(255)    NOT NULL,
    token       VARCHAR(100)    NOT NULL UNIQUE,
    expires_at  DATETIME        NOT NULL,
    usado       TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_token (token),
    INDEX idx_token_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tokens temporários para redefinição de senha';


-- ============================================================
-- 3. QUESTIONÁRIOS  (módulos da jornada)
--    Cada questionário corresponde a um módulo:
--      1 – Mapa Interior
--      2 – Horizonte Ampliado
--      3 – Rota Definida
--      4 – Plano de Voo
-- ============================================================
CREATE TABLE IF NOT EXISTS questionarios (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(60)     NOT NULL UNIQUE,  -- ex: 'mapa-interior'
    titulo      VARCHAR(150)    NOT NULL,          -- ex: 'Mapa Interior'
    descricao   VARCHAR(300)    NULL,
    icone       VARCHAR(60)     NULL,              -- nome do ícone no frontend
    ordem       INT UNSIGNED    NOT NULL DEFAULT 0,
    ativo       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_questionarios_slug (slug),
    INDEX idx_questionarios_ordem (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Módulos / questionários da jornada';


-- ============================================================
-- 4. QUESTÕES
--    Perguntas vinculadas a cada questionário.
-- ============================================================
CREATE TABLE IF NOT EXISTS questoes (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    questionario_id INT UNSIGNED    NOT NULL,
    texto           TEXT            NOT NULL,  -- enunciado da pergunta
    ordem           INT UNSIGNED    NOT NULL DEFAULT 0,
    ativo           TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_questoes_questionario (questionario_id),
    INDEX idx_questoes_ordem (ordem),
    CONSTRAINT fk_questoes_questionario
        FOREIGN KEY (questionario_id) REFERENCES questionarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Perguntas de cada módulo/questionário';


-- ============================================================
-- 5. ALTERNATIVAS  (opções de resposta)
--    Cada questão tem N alternativas (tipicamente A, B, C, D).
--    career_tags: palavras-chave separadas por vírgula usadas
--    pelo motor de IA para pontuar compatibilidade de carreiras.
--    Ex: 'tech,analytical,independent'
-- ============================================================
CREATE TABLE IF NOT EXISTS alternativas (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    questao_id  INT UNSIGNED    NOT NULL,
    texto       VARCHAR(300)    NOT NULL,  -- texto da alternativa
    career_tags VARCHAR(500)    NOT NULL DEFAULT '',
    ordem       INT UNSIGNED    NOT NULL DEFAULT 0,  -- A=0, B=1, C=2…
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_alt_questao (questao_id),
    CONSTRAINT fk_alt_questao
        FOREIGN KEY (questao_id) REFERENCES questoes(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Alternativas (opções A/B/C) de cada questão';


-- ============================================================
-- 6. RESPOSTAS
--    Cada linha registra a resposta de um usuário a uma questão.
--    Upsert: se o usuário responder novamente, atualiza o registro.
-- ============================================================
CREATE TABLE IF NOT EXISTS respostas (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED    NOT NULL,
    questao_id      INT UNSIGNED    NOT NULL,
    alternativa_id  INT UNSIGNED    NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resposta_usuario_questao (usuario_id, questao_id),  -- apenas 1 resposta por questão
    INDEX idx_resp_usuario (usuario_id),
    INDEX idx_resp_questao (questao_id),
    CONSTRAINT fk_resp_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_resp_questao
        FOREIGN KEY (questao_id) REFERENCES questoes(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_resp_alternativa
        FOREIGN KEY (alternativa_id) REFERENCES alternativas(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Respostas dos usuários às questões';


-- ============================================================
-- 7. PROGRESSO NOS MÓDULOS
--    Registra se o usuário concluiu cada módulo.
-- ============================================================
CREATE TABLE IF NOT EXISTS progresso_modulos (
    id              INT UNSIGNED        NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED        NOT NULL,
    questionario_id INT UNSIGNED        NOT NULL,
    concluido       TINYINT(1)          NOT NULL DEFAULT 0,
    concluido_em    DATETIME            NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_progresso (usuario_id, questionario_id),
    INDEX idx_prog_usuario (usuario_id),
    CONSTRAINT fk_prog_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_prog_questionario
        FOREIGN KEY (questionario_id) REFERENCES questionarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Progresso do usuário em cada módulo da jornada';


-- ============================================================
-- 8. PROFISSÕES
--    Catálogo completo de profissões (baseado na planilha ATIVIDADE 4).
--    Estrutura espelhada nas colunas da planilha para fácil importação.
--    tags: palavras-chave para o motor de IA (career_engine).
-- ============================================================
CREATE TABLE IF NOT EXISTS profissoes (
    id                      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    titulo                  VARCHAR(150)    NOT NULL,
    campo_conhecimento      VARCHAR(100)    NOT NULL,  -- ex: 'Engenharias'
    descricao_campo         TEXT            NULL,      -- col D da planilha
    areas_atuacao           TEXT            NULL,      -- col E
    descricao_profissao     LONGTEXT        NULL,      -- col F (texto longo)
    tendencias_mercado      LONGTEXT        NULL,      -- col G
    potencial_renda         TEXT            NULL,      -- col H
    requisitos_formacao     TEXT            NULL,      -- col I
    habilidades_essenciais  TEXT            NULL,      -- col J
    ambiente_trabalho       TEXT            NULL,      -- col K
    possibilidades_crescimento TEXT         NULL,      -- col L
    desafios_desvantagens   TEXT            NULL,      -- col M
    proximos_passos         TEXT            NULL,      -- col N
    -- Campos para integração com o frontend/backend --
    icone                   VARCHAR(60)     NULL,      -- nome do ícone (ex: 'code', 'heart')
    cor_icone               VARCHAR(20)     NOT NULL DEFAULT '#4F46E5',  -- hex
    tags                    VARCHAR(500)    NOT NULL DEFAULT '',         -- ex: 'tech,analytical'
    ativo                   TINYINT(1)      NOT NULL DEFAULT 1,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_prof_campo (campo_conhecimento),
    INDEX idx_prof_titulo (titulo),
    FULLTEXT INDEX ft_prof_busca (titulo, campo_conhecimento, tags)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de profissões (fonte: planilha Atividade 4)';


-- ============================================================
-- 9. SELEÇÕES DE PROFISSÕES  (Horizonte Ampliado)
--    Profissões escolhidas pelo usuário no módulo 2.
-- ============================================================
CREATE TABLE IF NOT EXISTS selecoes_profissoes (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED    NOT NULL,
    profissao_id    INT UNSIGNED    NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_selecao (usuario_id, profissao_id),
    INDEX idx_sel_usuario (usuario_id),
    CONSTRAINT fk_sel_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sel_profissao
        FOREIGN KEY (profissao_id) REFERENCES profissoes(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Profissões selecionadas pelo usuário no Horizonte Ampliado';


-- ============================================================
-- 10. CARREIRA DEFINITIVA  (Rota Definida)
--     A profissão escolhida como definitiva no módulo 3.
--     Um registro por usuário (UNIQUE em usuario_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS carreira_definitiva (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED    NOT NULL UNIQUE,
    profissao_id    INT UNSIGNED    NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_cardef_usuario (usuario_id),
    CONSTRAINT fk_cardef_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cardef_profissao
        FOREIGN KEY (profissao_id) REFERENCES profissoes(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Carreira definitiva escolhida pelo usuário na Rota Definida';


-- ============================================================
-- 11. RECOMENDAÇÕES DO ADMIN
--     O orientador pode sugerir uma profissão ao usuário
--     enquanto o módulo Horizonte Ampliado estiver em andamento.
-- ============================================================
CREATE TABLE IF NOT EXISTS recomendacoes_admin (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED    NOT NULL UNIQUE,
    profissao_id    INT UNSIGNED    NOT NULL,
    nota            TEXT            NULL,  -- mensagem personalizada do orientador
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_rec_usuario (usuario_id),
    CONSTRAINT fk_rec_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rec_profissao
        FOREIGN KEY (profissao_id) REFERENCES profissoes(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Profissão recomendada pelo admin/orientador a cada usuário';


-- ============================================================
-- DADOS INICIAIS  —  Questionários (módulos)
-- ============================================================
INSERT IGNORE INTO questionarios (slug, titulo, descricao, icone, ordem) VALUES
('mapa-interior',       'Mapa Interior',       'Descubra mais sobre você e seus valores',          'compass', 1),
('horizonte-ampliado',  'Horizonte Ampliado',  'Explore possibilidades de carreira compatíveis',   'eye',     2),
('rota-definida',       'Rota Definida',       'Identifique e escolha seu caminho ideal',          'route',   3),
('plano-de-voo',        'Plano de Voo',        'Planeje os próximos passos concretos da carreira', 'plane',   4);


-- ============================================================
-- DADOS INICIAIS  —  Profissões (amostra das 8 já usadas no app)
--   (O import completo das 371 profissões da planilha pode ser
--    feito via script Python separado que lê o .xlsx e gera INSERTs)
-- ============================================================
INSERT IGNORE INTO profissoes (titulo, campo_conhecimento, descricao_profissao, icone, cor_icone, tags) VALUES
('Desenvolvedor de Software', 'Tecnologia da Informação e Comunicação',
 'Projeta, desenvolve e mantém sistemas, aplicações e softwares.',
 'code',          '#4F46E5', 'tech,analytical,independent,problem-solving'),
('Psicólogo', 'Ciências da Saúde',
 'Avalia e trata questões emocionais, comportamentais e mentais.',
 'heart',         '#EC4899', 'people,empathy,communication,healthcare'),
('Designer Gráfico', 'Design',
 'Cria soluções visuais para comunicação e identidade de marcas.',
 'palette',       '#F59E0B', 'creative,visual,tech,communication'),
('Gestor de Negócios', 'Gestão e Negócios',
 'Planeja, organiza e dirige operações empresariais e equipes.',
 'briefcase',     '#0EA5E9', 'leadership,analytical,communication,business'),
('Pesquisador Científico', 'Ciências Biológicas',
 'Conduz investigações para ampliar o conhecimento científico.',
 'microscope',    '#8B5CF6', 'research,analytical,independent,academic'),
('Professor', 'Educação',
 'Educa e orienta alunos no desenvolvimento de conhecimentos.',
 'graduation-cap','#10B981', 'people,communication,teaching,social'),
('Engenheiro', 'Engenharias',
 'Projeta e supervisiona construção de sistemas e estruturas.',
 'wrench',        '#F97316', 'tech,analytical,problem-solving,precision'),
('Analista de Marketing', 'Ciências Sociais Aplicadas',
 'Pesquisa mercados, analisa dados e desenvolve estratégias.',
 'trending-up',   '#EF4444', 'analytical,communication,creative,business');


-- ============================================================
-- VIEWS ÚTEIS  (facilitam consultas no Workbench)
-- ============================================================

-- Visão geral do progresso de cada usuário
CREATE OR REPLACE VIEW vw_progresso_usuarios AS
SELECT
    u.id                                        AS usuario_id,
    u.nome,
    u.email,
    u.tipo_login,
    COUNT(pm.id)                                AS modulos_concluidos,
    GROUP_CONCAT(
        CASE WHEN pm.concluido = 1 THEN q.titulo END
        ORDER BY q.ordem SEPARATOR ', '
    )                                           AS modulos_concluidos_nomes,
    cd.profissao_id                             AS carreira_definitiva_id,
    p.titulo                                    AS carreira_definitiva_titulo,
    u.created_at                                AS data_cadastro
FROM usuarios u
LEFT JOIN progresso_modulos pm  ON pm.usuario_id = u.id AND pm.concluido = 1
LEFT JOIN questionarios q       ON q.id = pm.questionario_id
LEFT JOIN carreira_definitiva cd ON cd.usuario_id = u.id
LEFT JOIN profissoes p          ON p.id = cd.profissao_id
GROUP BY u.id, u.nome, u.email, u.tipo_login, cd.profissao_id, p.titulo, u.created_at;


-- Respostas detalhadas por usuário
CREATE OR REPLACE VIEW vw_respostas_detalhadas AS
SELECT
    u.id        AS usuario_id,
    u.nome      AS usuario_nome,
    u.email,
    q.id        AS questao_id,
    qn.titulo   AS questionario,
    q.texto     AS pergunta,
    a.texto     AS resposta_escolhida,
    a.career_tags,
    r.created_at AS respondido_em
FROM respostas r
JOIN usuarios    u  ON u.id  = r.usuario_id
JOIN questoes    q  ON q.id  = r.questao_id
JOIN questionarios qn ON qn.id = q.questionario_id
JOIN alternativas a  ON a.id  = r.alternativa_id;


-- Carreiras mais selecionadas no Horizonte Ampliado
CREATE OR REPLACE VIEW vw_ranking_profissoes AS
SELECT
    p.id,
    p.titulo,
    p.campo_conhecimento,
    COUNT(sp.id) AS total_selecoes
FROM profissoes p
LEFT JOIN selecoes_profissoes sp ON sp.profissao_id = p.id
GROUP BY p.id, p.titulo, p.campo_conhecimento
ORDER BY total_selecoes DESC;


-- ============================================================
-- FIM DO SCRIPT
-- Como usar:
--   1. Abra o MySQL Workbench
--   2. File > Open SQL Script > selecione este arquivo
--   3. Execute (Ctrl+Shift+Enter ou botão ⚡)
--   4. O banco 'proximo_destino' será criado automaticamente
-- ============================================================
