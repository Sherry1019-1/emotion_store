from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Users
from auth import get_current_user
from ipipneo import IpipNeo

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
    sex = payload.get("sex", "N")

    # ✅ 校验
    if len(answers) != 80:
        raise HTTPException(status_code=400, detail="需要120道题答案")

    if any(a.get("id_select") not in [1,2,3,4,5] for a in answers):
        raise HTTPException(status_code=400, detail="答案格式错误")

    # ✅ 计算
    try:
        result = IpipNeo(question=80).compute(
            sex=sex,
            age=25,
            answers={"answers": answers}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"计算失败: {str(e)}")

    p = result["personalities"][0]

    o = round(p["openness"]["O"])
    c = round(p["conscientiousness"]["C"])
    e = round(p["extraversion"]["E"])
    a = round(p["agreeableness"]["A"])
    n = round(p["neuroticism"]["N"])

    score_str = f"O{o}-C{c}-E{e}-A{a}-N{n}"

    # ✅ 自动保存
    current_user.big_five = score_str
    current_user.big_five_done = True
    await db.commit()

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