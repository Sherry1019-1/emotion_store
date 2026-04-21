from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from database import get_db
from models import Users, Bottle, PublicConfession
from schemas import BottleCreate, BottleOut
from auth import get_current_user
from utils.matching import score_bottle   # 需要创建 matching.py
import random

router = APIRouter(prefix="/api/bottles", tags=["bottles"])

@router.post("/throw")
async def throw_bottle(
    bottle_in: BottleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    if not current_user.mbti or not current_user.zodiac:
        raise HTTPException(status_code=400, detail="请先完善 MBTI 和星座信息")
    new_bottle = Bottle(
        user_id=current_user.id,
        message=bottle_in.message,
        author_mbti=current_user.mbti,
        author_zodiac=current_user.zodiac,
        match_mode=bottle_in.match_mode,
        is_public=bottle_in.is_public,
    )
    db.add(new_bottle)
    await db.commit()
    await db.refresh(new_bottle)

    # 如果公开，同步到 public_confessions 表
    if bottle_in.is_public:
        public = PublicConfession(
            user_id=current_user.id,
            message=bottle_in.message,
            emoji="🍾",
            likes=0,
            comments=[]
        )
        db.add(public)
        await db.commit()
    return {"msg": "漂流瓶已扔出", "bottle_id": new_bottle.id}

@router.post("/pick")
async def pick_bottle(
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    if not current_user.mbti or not current_user.zodiac:
        raise HTTPException(status_code=400, detail="请先完善 MBTI 和星座信息")
    # 获取未被捡起的瓶子
    stmt = select(Bottle).where(Bottle.picked == False)
    result = await db.execute(stmt)
    bottles = result.scalars().all()
    if not bottles:
        raise HTTPException(status_code=404, detail="暂时没有漂流瓶了")

    # 计算每个瓶子的匹配得分
    scored = []
    for b in bottles:
        # 调用匹配算法
        from utils.matching import score_bottle
        s = score_bottle(current_user.mbti, current_user.zodiac, b)
        scored.append((s, b))
    scored.sort(key=lambda x: x[0], reverse=True)
    top3 = [b for _, b in scored[:3]]
    chosen = random.choice(top3)
    # 标记为已捡起
    chosen.picked = True
    chosen.picker_id = current_user.id
    await db.commit()
    return BottleOut(
        id=chosen.id,
        message=chosen.message,
        author_mbti=chosen.author_mbti,
        author_zodiac=chosen.author_zodiac,
        match_mode=chosen.match_mode,
        likes=chosen.likes,
        time=chosen.time
    )

@router.get("/my")
async def get_my_bottles(
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    stmt = select(Bottle).where(Bottle.user_id == current_user.id).order_by(Bottle.time.desc())
    result = await db.execute(stmt)
    bottles = result.scalars().all()
    return bottles

@router.post("/{bottle_id}/like")
async def like_bottle(
    bottle_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Bottle).where(Bottle.id == bottle_id)
    result = await db.execute(stmt)
    bottle = result.scalar_one_or_none()
    if not bottle:
        raise HTTPException(status_code=404, detail="瓶子不存在")
    bottle.likes += 1
    await db.commit()
    return {"likes": bottle.likes}