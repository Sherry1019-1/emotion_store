# utils/matching.py
ZODIAC_SIGNS = [
    "白羊座","金牛座","双子座","巨蟹座","狮子座","处女座",
    "天秤座","天蝎座","射手座","摩羯座","水瓶座","双鱼座"
]

def mbti_similarity(m1: str, m2: str) -> int:
    if not m1 or not m2:
        return 0
    return sum(1 for i in range(4) if m1[i] == m2[i])

def mbti_complement(m1: str, m2: str) -> int:
    if not m1 or not m2:
        return 0
    return sum(1 for i in range(4) if m1[i] != m2[i])

def zodiac_match(z1: str, z2: str, mode: str) -> int:
    if z1 not in ZODIAC_SIGNS or z2 not in ZODIAC_SIGNS:
        return 0
    idx1 = ZODIAC_SIGNS.index(z1)
    idx2 = ZODIAC_SIGNS.index(z2)
    diff = abs(idx1 - idx2)
    circle_diff = min(diff, 12 - diff)
    if mode == "similar":
        if circle_diff == 0:
            return 3
        if circle_diff in (4,8):
            return 2
        return 1
    else:  # complementary
        if circle_diff == 6:
            return 3
        if circle_diff in (3,9):
            return 2
        return 1

def score_bottle(user_mbti, user_zodiac, bottle):
    mode = bottle.match_mode
    if mode == "similar":
        mbti_score = mbti_similarity(user_mbti, bottle.author_mbti) * 10
    else:
        mbti_score = mbti_complement(user_mbti, bottle.author_mbti) * 10
    zodiac_score = zodiac_match(user_zodiac, bottle.author_zodiac, mode) * 8
    return mbti_score + zodiac_score