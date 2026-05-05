import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Users, Bottle, PublicConfession
from schemas import BottleCreate, BottleOut, CommentCreate
from auth import get_current_user
from utils.matching import score_bottle  # 此时 score_bottle 已在 matching.py 中更新
import random

router = APIRouter()


@router.post("/throw")
async def throw_bottle(
        bottle_in: BottleCreate,
        db: AsyncSession = Depends(get_db),
        current_user: Users = Depends(get_current_user)
):
    # --- 逻辑修改：检查新的人格数据 ---
    if not current_user.big_five or not current_user.attachment_style:
        raise HTTPException(status_code=400, detail="请先在个人中心完成大五人格与依恋人格测试")

    new_bottle = Bottle(
        user_id=current_user.id,
        message=bottle_in.message,
        # 存储投递者此时的人格状态快照，用于后续匹配
        author_big_five=current_user.big_five,
        author_attachment=current_user.attachment_style,
        match_mode=bottle_in.match_mode,
        is_public=bottle_in.is_public,
    )
    db.add(new_bottle)

    if bottle_in.is_public:
        public = PublicConfession(
            user_id=current_user.id,
            message=bottle_in.message,
            emoji="🍾",
            likes=0,
            comments = json.dumps([])
        )
        db.add(public)

    await db.commit()
    await db.refresh(new_bottle)
    return {"msg": "带有灵魂印记的漂流瓶已扔出", "bottle_id": new_bottle.id}


@router.post("/pick")
async def pick_bottle(
        db: AsyncSession = Depends(get_db),
        current_user: Users = Depends(get_current_user)):
    # 基础检查
    if not current_user.big_five or not current_user.attachment_style:
        raise HTTPException(status_code=400, detail="请先完成人格测评，否则无法打捞瓶子")

    # 只捞别人的瓶子，绝不捞自己的
    stmt = select(Bottle).where(
        Bottle.picked == False,
        Bottle.user_id != current_user.id
    )
    result = await db.execute(stmt)
    bottles = result.scalars().all()

    if not bottles:
        raise HTTPException(status_code=404, detail="海面上空空如也，等别人扔瓶子后再来吧 🌊")

    # 4️⃣ 第三阶段：人格匹配算法（对当前“池子”里的瓶子进行评分）
    scored = []
    for b in bottles:
        # 核心匹配逻辑：计算当前用户与瓶子作者的契合度
        s = score_bottle(
            current_user.big_five,
            current_user.attachment_style,
            b.author_big_five,
            b.author_attachment
        )
        scored.append((s, b))

    # 按契合度降序排序
    scored.sort(key=lambda x: x[0], reverse=True)

    # 从最契合的前5个中随机抽取一个（增加“缘分”的随机感）
    pool_size = min(len(scored), 5)
    top_pool = [b for _, b in scored[:pool_size]]
    chosen = random.choice(top_pool)

    # 5️⃣ 第四阶段：判定“幸运/自我遇见”状态
    lucky_flag = False
    lucky_msg = None

    # 如果抽中的瓶子是自己的（通过 user_id 判断）
    if chosen.user_id == current_user.id:
        # 触发 20% 的“觉醒”提示概率，或者你可以设置为 100% 只要抽到自己就提示
        lucky_flag = True
        lucky_msg = random.choice([
            "✨ 你捞到了过去的自己，那一刻的你也在等你",
            "🌊 海浪翻涌，你与自己的灵魂再次相遇",
            "💫 命运回响：你值得被现在的自己拥抱",
            "🍀 幸运时刻：也许答案一直在你心里"
        ])

    # 6️⃣ 标记并提交数据库
    chosen.picked = True
    chosen.picker_id = current_user.id

    try:
        await db.commit()
        await db.refresh(chosen)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="打捞失败，海浪太大了")

    # 7️⃣ 返回结果
    # 注意：前端需要适配这种返回格式 { bottle: {...}, lucky: bool, lucky_msg: string }
    return {
        "bottle": chosen,
        "lucky": lucky_flag,
        "lucky_msg": lucky_msg
    }

@router.get("/my", response_model=list[BottleOut])
async def get_my_bottles(
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    try:
        stmt = select(Bottle).where(Bottle.user_id == current_user.id).order_by(Bottle.id.desc())
        result = await db.execute(stmt)
        my_bottles = result.scalars().all()
        return my_bottles
    except Exception as e:
        # 这一行会在你的黑色命令行窗口打印具体的 Python 报错详情
        print(f"!!! [Bottles Error] 获取我的瓶子失败: {str(e)}")
        # 即使报错也返回空列表，防止前端 500 导致整个页面白屏
        return []


@router.get("/", response_model=list[BottleOut])
async def list_all_available_bottles(
        db: AsyncSession = Depends(get_db),
        current_user: Users = Depends(get_current_user)
):
    """
    获取海面上所有可以被打捞的瓶子（对应前端 apiCall('/bottles', 'get')）
    """
    # 获取未被捡起且不是自己扔的瓶子
    stmt = select(Bottle).where(
        Bottle.picked == False,
        Bottle.user_id != current_user.id
    ).order_by(Bottle.id.desc())

    result = await db.execute(stmt)
    bottles = result.scalars().all()
    return bottles

@router.get("/{bottle_id}")
async def get_bottle(
    bottle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)  # 可选，是否需要登录看需求
):
    stmt = select(Bottle).where(Bottle.id == bottle_id)
    result = await db.execute(stmt)
    bottle = result.scalar_one_or_none()
    if not bottle:
        raise HTTPException(status_code=404, detail="瓶子不存在")
    return bottle

@router.post("/{bottle_id}/like")
async def like_bottle(
        bottle_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: Users = Depends(get_current_user)
):
    result = await db.execute(select(Bottle).where(Bottle.id == bottle_id))
    bottle = result.scalar_one_or_none()
    if not bottle:
        raise HTTPException(status_code=404, detail="瓶子不存在")

    # 一人一赞逻辑
    likes_list = list(bottle.liked_users) if bottle.liked_users else []
    if current_user.id in likes_list:
        raise HTTPException(status_code=400, detail="你已经点过赞啦")

    likes_list.append(current_user.id)
    bottle.liked_users = likes_list  # 重新赋值触发SQLAlchemy更新
    bottle.likes = (bottle.likes or 0) + 1

    await db.commit()
    return {"likes": bottle.likes}


@router.post("/{bottle_id}/comment")
async def comment_bottle(
        bottle_id: int,
        comment_in: CommentCreate,
        db: AsyncSession = Depends(get_db),
        current_user: Users = Depends(get_current_user)
):
    result = await db.execute(select(Bottle).where(Bottle.id == bottle_id))
    bottle = result.scalar_one_or_none()
    if not bottle:
        raise HTTPException(status_code=404, detail="瓶子不存在")

    new_comment = {
        "user_id": current_user.id,
        "username": current_user.username,
        "text": comment_in.text,
        "time": datetime.now().isoformat()
    }

    comments_list = list(bottle.comments) if bottle.comments else []
    comments_list.append(new_comment)
    bottle.comments = comments_list

    await db.commit()
    return {"msg": "留言成功"}