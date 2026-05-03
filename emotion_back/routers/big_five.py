from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Users
from auth import get_current_user

# ✅ 改这里：用你自己的算法
from utils.matching import calculate_80_scores, detect_random_answers

router = APIRouter(
    prefix="/api/bigfive",
    tags=["bigfive"]
)


@router.post("/score")
async def score_bigfive(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    answers = payload.get("answers", [])
    sex = payload.get("sex", "N")  # 现在暂时不用，但保留字段
    duration = payload.get("duration", 60)  # 答题时间（前端可传）

    # =========================
    # ✅ 1. 基础校验
    # =========================
    if len(answers) != 80:
        raise HTTPException(status_code=400, detail="需要80道题答案")

    if any(a.get("id_select") not in [1, 2, 3, 4, 5] for a in answers):
        raise HTTPException(status_code=400, detail="答案格式错误")

    # =========================
    # 🧠 2. 防乱填（加分项）
    # =========================
    raw_values = [a.get("id_select") for a in answers]

    if detect_random_answers(raw_values, duration):
        raise HTTPException(status_code=400, detail="检测到答题异常，请认真作答")

    # =========================
    # 🎯 3. 用你自己的算法计算
    # =========================
    try:
        scores = calculate_80_scores(answers)

        o, c, e, a, n = scores

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"计算失败: {str(e)}")

    # =========================
    # 🧾 4. 生成字符串
    # =========================
    score_str = f"O{o}-C{c}-E{e}-A{a}-N{n}"

    # =========================
    # 💾 5. 自动保存
    # =========================
    current_user.big_five = score_str
    current_user.big_five_done = True
    await db.commit()

    # =========================
    # 🎁 6. 返回结果
    # =========================
    return {
        "auto_saved": True,
        "msg": "人格画像已自动保存✨",
        "score": score_str,
        "dimensions": {
            "openness": o,
            "conscientiousness": c,
            "extraversion": e,
            "agreeableness": a,
            "neuroticism": n
        }
    }