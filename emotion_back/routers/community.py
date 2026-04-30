# routers/community.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from auth import get_current_user
from models import Users, WarmWord
from database import get_db           # 和其它 router 一样的 Session 依赖
from schemas import TipCreate, WarmWordCreate, Tip, tips_db   # 保留你现在的 Tip 仍走内存

router = APIRouter()

# ===== 小贴士（继续用内存版，不动） =====

@router.get("/tips")
async def get_community_tips():
    return tips_db

@router.post("/tips")
async def create_tip(
    body: TipCreate,
    user: Users = Depends(get_current_user)
):
    new_id = (tips_db[-1].id + 1) if tips_db else 1
    tip = Tip(id=new_id, text=body.text, author=user.username or "匿名用户")
    tips_db.append(tip)
    return tip

@router.post("/tips/{tip_id}/like")
async def like_tip(
    tip_id: int,
    user: Users = Depends(get_current_user)
):
    for t in tips_db:
        if t.id == tip_id:
            if user.id in t.liked_users:
                raise HTTPException(status_code=400, detail="你已经点过赞啦")
            t.liked_users.append(user.id)
            t.likes = len(t.liked_users)
            t.helped = t.likes
            return t
    raise HTTPException(status_code=404, detail="tip not found")


# ===== 暖心话（改为用数据库 WarmWord 表） =====

# 列表：返回所有暖心话（或你可以加 limit / order_by）
@router.get("/warmwords")
async def get_warm_words(db: AsyncSession = Depends(get_db)):
    stmt = select(WarmWord).order_by(WarmWord.created_at.desc())
    result = await db.execute(stmt)
    words = result.scalars().all()

    return [
        {
            "id": w.id,
            "text": w.text,
            "author": w.author,
            "likes": w.likes,
        }
        for w in words
    ]



# 发布暖心话
# 发布暖心话
@router.post("/warmwords")
async def create_warm_word(
    body: WarmWordCreate,
    user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    warm = WarmWord(
        user_id=user.id,
        text=body.text,
        author=user.username or "匿名用户",
    )
    db.add(warm)
    await db.commit()
    await db.refresh(warm)

    return {
        "id": warm.id,
        "text": warm.text,
        "author": warm.author,
        "likes": warm.likes,
    }


# 点赞暖心话（一人一次）
@router.post("/warmwords/{wid}/like")
async def like_warm_word(
    wid: int,
    user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 查询这条暖心话
    result = await db.execute(
        select(WarmWord).where(WarmWord.id == wid)
    )
    warm = result.scalar_one_or_none()
    if not warm:
        raise HTTPException(status_code=404, detail="warm word not found")

    liked = warm.liked_users or []
    if user.id in liked:
        raise HTTPException(status_code=400, detail="你已经点过赞啦")

    liked.append(user.id)
    warm.liked_users = liked
    warm.likes = len(liked)

    await db.commit()
    await db.refresh(warm)

    return {
        "id": warm.id,
        "likes": warm.likes,
    }
