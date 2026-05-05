import re
import statistics

# =========================
# 1. 工具函数：解析 & 标准化
# =========================

def parse_big_five(score):
    """
    支持：
    1. "O72-C58-E43-A81-N34"
    2. [72, 58, 43, 81, 34]
    """
    if isinstance(score, list):
        return [max(0, min(100, int(x))) for x in score]

    if not score:
        return [50, 50, 50, 50, 50]

    match = re.search(r"O(\d+)-C(\d+)-E(\d+)-A(\d+)-N(\d+)", score)
    if not match:
        return [50, 50, 50, 50, 50]

    return [max(0, min(100, int(x))) for x in match.groups()]


def normalize(x):
    """0~100 → -1 ~ 1"""
    return (x - 50) / 50


def sim_linear(x, y):
    """线性相似度（0~1）"""
    return max(0.0, min(1.0, 1 - abs(x - y)))


# =========================
# 2. 🎯 80题 → 大五计算
# =========================

def calculate_80_scores(answers_list):
    """
    输入:
        [
          {"id_question": 1, "id_select": 3},
          ...
        ]

    输出:
        [O, C, E, A, N] （0~100）
    """

    dimensions = {
        "E": [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76],
        "A": [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 77],
        "C": [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73, 78],
        "N": [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64, 69, 74, 79],
        "O": [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
    }

    reverse_ids = {
        6,11,21,31,46,51,66,71,
        12,17,27,42,47,57,72,77,
        8,18,23,33,48,53,68,78,
        9,14,24,39,44,54,69,74,
        10,25,35,45,55,65,75,80
    }

    ans_map = {a['id_question']: a['id_select'] for a in answers_list}

    scores = {}

    for dim, q_ids in dimensions.items():
        total = 0
        for qid in q_ids:
            val = ans_map.get(qid, 3)

            if qid in reverse_ids:
                val = 6 - val

            total += val

        scores[dim] = round(((total - 16) / 64) * 100)

    return [
        scores["O"],
        scores["C"],
        scores["E"],
        scores["A"],
        scores["N"]
    ]


# =========================
# 3. Big Five 相似度
# =========================

def big5_similarity(s1, s2):
    # 调整后的权重：O 提高（聊得来）, E 降低（文字影响小）, N 提高（情绪共鸣最重要）
    weights = {
        "O": 0.18,
        "C": 0.15,
        "E": 0.12,
        "A": 0.22,
        "N": 0.33,
    }

    keys = ["O", "C", "E", "A", "N"]

    score = 0.0

    for i, k in enumerate(keys):
        # 归一化到 0~1 范围再计算相似度，避免 normalize(-1~1) 传入 sim_linear 导致截断
        x = s1[i] / 100.0
        y = s2[i] / 100.0

        if k == "N":
            similarity = sim_linear(x, y)
            avg = (s1[i] + s2[i]) / 2
            # N 分数都低时额外加分（双方情绪都稳定，更契合）
            low_bonus = max(0.0, (50 - avg) / 50)
            sim = similarity * 0.7 + low_bonus * 0.3
        else:
            sim = sim_linear(x, y)

        score += weights[k] * sim

    return max(0, min(100, round(score * 100, 2)))


# =========================
# 4. 依恋匹配
# =========================

def attachment_score(a1, a2):
    base_matrix = {
        ("安全型", "安全型"): 95,
        ("安全型", "焦虑型"): 82,   # 安全型对焦虑型有疗愈作用
        ("安全型", "回避型"): 75,
        ("安全型", "恐惧型"): 65,
        ("焦虑型", "焦虑型"): 58,   # 双焦虑容易相互强化不安
        ("焦虑型", "回避型"): 32,   # 追逐-逃离动态，最差配对
        ("焦虑型", "恐惧型"): 48,
        ("回避型", "回避型"): 55,   # 双方都不深入，关系表浅但稳定
        ("回避型", "恐惧型"): 42,
        ("恐惧型", "恐惧型"): 28,   # 双方都不稳定，容易崩溃
    }

    base = base_matrix.get((a1, a2)) or base_matrix.get((a2, a1)) or 58

    bonus = 0

    # 安全型参与时加分（稳定锚点效应）
    if "安全型" in (a1, a2):
        if {a1, a2} == {"安全型", "焦虑型"}:
            bonus += 10  # 焦虑+安全是疗愈型配对，额外奖励
        else:
            bonus += 5

    # 同类型相遇：安全型是正向的，其他是负向的
    if a1 == a2:
        if a1 == "安全型":
            bonus += 3
        else:
            bonus -= 5

    return max(0, min(100, base + bonus))


# =========================
# 5. 🎯 主匹配函数
# =========================

def score_bottle(u1_big5, u1_attach, u2_big5_or_obj, u2_attach=None):
    """
    返回匹配分（0~100）
    """

    # 兼容 bottle 对象
    if hasattr(u2_big5_or_obj, 'author_big_five'):
        b2_five = u2_big5_or_obj.author_big_five
        b2_attach = u2_big5_or_obj.author_attachment
    else:
        b2_five = u2_big5_or_obj
        b2_attach = u2_attach

    s1 = parse_big_five(u1_big5)
    s2 = parse_big_five(b2_five)

    sim_big5 = big5_similarity(s1, s2)
    sim_attach = attachment_score(u1_attach, b2_attach)

    final_score = 0.65 * sim_big5 + 0.35 * sim_attach

    return int(max(0, min(100, round(final_score))))


# =========================
# 6. 🧠 风控：防乱填
# =========================

def detect_random_answers(answers, duration_sec):
    """
    answers: [1,2,3,4,5,...]
    """

    if duration_sec < 30:
        return True

    if len(answers) < 2:
        return True

    if len(set(answers)) <= 1:
        return True

    sd = statistics.stdev(answers)

    if sd < 0.6 or sd > 2.2:
        return True

    return False


# =========================
# 7. 情绪风险
# =========================

def emotional_risk(s):
    _, _, _, _, N = s

    if N >= 75:
        return "高敏感"
    elif N >= 60:
        return "中敏感"
    else:
        return "稳定"