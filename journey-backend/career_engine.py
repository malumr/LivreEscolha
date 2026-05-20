"""
Motor de Recomendação de Carreiras
===================================
Lógica:
- Cada opção de resposta tem "career_tags" (ex: "tech,analytical,independent")
- Cada carreira tem "tags" que descrevem seu perfil
- O score de match é calculado pela interseção de tags coletadas vs tags da carreira
- Resultado: carreiras ordenadas do maior para o menor match (0.0 a 1.0)
"""

from models import Answer, Career


def collect_tags_from_answers(answers: list[Answer]) -> dict[str, int]:
    """
    Percorre todas as respostas e conta quantas vezes cada tag apareceu.
    Retorna um dict: { "tech": 2, "analytical": 1, "creative": 1, ... }
    """
    tag_counts: dict[str, int] = {}

    for answer in answers:
        if answer.option and answer.option.career_tags:
            tags = [t.strip() for t in answer.option.career_tags.split(",") if t.strip()]
            for tag in tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    return tag_counts


def score_career(career: Career, tag_counts: dict[str, int]) -> float:
    """
    Calcula um score de 0.0 a 1.0 para uma carreira com base nas tags coletadas.

    Fórmula:
        score = Σ(peso de cada tag da carreira que está em tag_counts) / total_de_tags_da_carreira
    """
    if not career.tags:
        return 0.0

    career_tags = [t.strip() for t in career.tags.split(",") if t.strip()]
    if not career_tags:
        return 0.0

    total_possible = len(career_tags)
    matched_weight = sum(tag_counts.get(tag, 0) for tag in career_tags)

    # Normaliza pelo total de respostas para evitar bias por número de perguntas
    total_answers = sum(tag_counts.values()) or 1
    score = matched_weight / (total_answers * total_possible ** 0.5)

    return min(round(score, 4), 1.0)


def recommend_careers(
    answers: list[Answer],
    careers: list[Career],
) -> list[Career]:
    """
    Recebe as respostas salvas e a lista de carreiras,
    e retorna as carreiras ordenadas por compatibilidade (maior score primeiro).
    """
    tag_counts = collect_tags_from_answers(answers)

    # Atribui scores e ordena
    scored: list[tuple[float, Career]] = []
    for career in careers:
        s = score_career(career, tag_counts)
        # Cria uma cópia temporária com o score preenchido
        career.match_score = s
        scored.append((s, career))

    scored.sort(key=lambda x: x[0], reverse=True)

    return [career for _, career in scored]
