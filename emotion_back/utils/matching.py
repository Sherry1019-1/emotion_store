import re
import math
import statistics


# =========================
# 1. 工具函数：解析 & 标准化
# =========================

def parse_big_five(score):
    """
    支持两种输入：
    1. "O72-C58-E43-A81-N34"
    2. [72, 58, 43, 81, 34]  -> 顺序 O C E A N
    """
    if isinstance(score, list):
        return [max(0, min(100, int(x))) for x in score]

    if not score:
        return [50, 50, 50, 50, 50]

    pattern = r"O(\d+)-C(\d+)-E(\d+)-A(\d+)-N(\d+)"
    match = re.search(pattern, score)

    if not match:
        return [50, 50, 50, 50, 50]

    return [max(0, min(100, int(x))) for x in match.groups()]


def normalize(x):
    """把 0~100 转成 -1 ~ 1"""
    return (x - 50) / 50


def sim_linear(x, y):
    """
    两个已 normalize 的值之间的相似度，严格在 [0, 1]。
    差距越小越相似。
    """
    return max(0.0, min(1.0, 1 - abs(x - y)))


# =========================
# 2. Big Five 相似度（修复版）
# =========================

def big5_similarity(s1, s2):
    """
    输入: [O, C, E, A, N]（0~100）
    输出: 0~100

    修复点：
    - 原 N 维度公式 (1-|x-y|)*(1-max(x,y)) 在双低时会超出 [0,1]。
      改为：相似度分离计算（sim_linear），再独立奖励双低的情况，
      保证每个分量都严格在 [0,1] 内。
    - 权重之和 = 1.0，总分天然不超过 100。
    """

    # 心理学依据：A 和 N 对长期关系质量预测力最强
    weights = {
        "O": 0.12,
        "C": 0.18,
        "E": 0.15,
        "A": 0.28,
        "N": 0.27,
    }
    keys = ["O", "C", "E", "A", "N"]

    score = 0.0
    for i, k in enumerate(keys):
        x = normalize(s1[i])
        y = normalize(s2[i])

        if k == "N":
            # N：相似度 + 双低奖励
            # 双方都低（稳定）是最优情况，但计算必须 clamp 到 [0,1]
            similarity = sim_linear(x, y)          # [0,1]
            avg_n = (s1[i] + s2[i]) / 2            # 0~100，越低越好
            low_bonus = max(0.0, (50 - avg_n) / 50) # 双低时 > 0，最大 1.0
            sim = similarity * 0.7 + low_bonus * 0.3
        else:
            sim = sim_linear(x, y)

        score += weights[k] * sim

    # weights 之和 = 1.0，sim 严格在 [0,1]，所以 score 在 [0,1]
    return max(0, min(100, round(score * 100, 2)))


# =========================
# 3. 依恋人格匹配（不变，逻辑正确）
# =========================

def attachment_score(a1, a2):
    base_matrix = {
        ("安全型", "安全型"): 95,
        ("安全型", "焦虑型"): 85,
        ("安全型", "回避型"): 75,
        ("安全型", "恐惧型"): 65,
        ("焦虑型", "焦虑型"): 60,
        ("焦虑型", "回避型"): 35,
        ("焦虑型", "恐惧型"): 50,
        ("回避型", "回避型"): 55,
        ("回避型", "恐惧型"): 45,
        ("恐惧型", "恐惧型"): 30,
    }

    base = base_matrix.get((a1, a2)) or base_matrix.get((a2, a1)) or 60

    bonus = 0
    if "安全型" in (a1, a2):
        bonus += 5
    if a1 == a2 and a1 != "安全型":
        bonus -= 5

    return max(0, min(100, base + bonus))


# =========================
# 4. 情绪风险检测
# =========================

def emotional_risk(s):
    _, _, _, _, N = s
    if N >= 75:
        return "高敏感"
    elif N >= 60:
        return "中敏感"
    else:
        return "稳定"


# =========================
# 5. 🎯 主入口函数
# =========================

def score_bottle(u1_big5, u1_attach, u2_big5_or_obj, u2_attach=None):
    """
    统一入口（兼容 bottle 对象）

    修复点（相对原版）：
    1. 去掉 complementarity —— 它的 E/N 维度与 big5_similarity 重叠，
       造成双重计算，且公式量纲混乱（最大值实为 75 而非 100）。
       互补性已通过 big5_similarity 中的差异权重隐式体现。
    2. big5_similarity 内部修复 N 维度越界问题。
    3. 权重重新分配：big5(0.65) + attachment(0.35)，
       依恋风格对亲密关系预测力强，适当提权。
    """

    # 兼容 bottle 对象
    if hasattr(u2_big5_or_obj, 'author_big_five'):
        b2_five   = u2_big5_or_obj.author_big_five
        b2_attach = u2_big5_or_obj.author_attachment
    else:
        b2_five   = u2_big5_or_obj
        b2_attach = u2_attach

    s1 = parse_big_five(u1_big5)
    s2 = parse_big_five(b2_five)

    sim_big5   = big5_similarity(s1, s2)         # 0~100
    sim_attach = attachment_score(u1_attach, b2_attach)  # 0~100

    final_score = 0.65 * sim_big5 + 0.35 * sim_attach

    return int(max(0, min(100, round(final_score))))


# =========================
# 6. 反刷题检测（升级版）
# =========================

def detect_random_answers(answers, duration_sec):
    """
    answers: [1,2,3,4,5,...]  —— 原始作答列表
    duration_sec: 答题总用时（秒）

    修复点：
    原版只检测"全部相同"，用户交替填 1-2-1-2 即可绕过。
    新增标准差检测：
    - SD 极低（< 0.6）：几乎全选同一个值，机械作答
    - SD 极高（> 2.2）：随机乱点，没有一致性
    - 用时过短（< 30s，每题不足 0.4s）：不可能认真阅读
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
