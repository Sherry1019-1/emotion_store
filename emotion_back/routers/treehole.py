from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from models import TreeholeHistory, PublicConfession, Users
from schemas import TreeholePrivateCreate, TreeholePrivateOut, PublicConfessionCreate, PublicConfessionOut, CommentCreate
from auth import get_current_user
from datetime import datetime
import random

router = APIRouter(prefix="/api/treehole", tags=["treehole"])

# ---------- 预设回信库 ----------
REPLY_POOL = [
    "你的心情我收到了。有时候倾诉本身就是一种疗愈，希望你能好受一点。",
    "谢谢你愿意和我分享。我在这里陪着你，你不是一个人。",
    "听你说完这些，我能感受到你的情绪。要相信，明天会更好。",
    "你真的很勇敢，愿意说出心里话。我会一直在这里倾听。",
    "有时候哭出来也是一种释放，我陪你一起。",
    "你值得被温柔对待，包括被自己温柔对待。",
    "不用急着解决问题，先让自己舒服一点更重要。",
    "这件事确实很难，你能撑到现在已经很厉害了。",
    "你现在的感受特别正常，换作是我也会这样。",
    "黑暗的夜晚总会过去，黎明就在前方。"
]

# ---------- 私密树洞 ----------
@router.post("/private", response_model=TreeholePrivateOut)
async def create_private_treehole(
    entry: TreeholePrivateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    reply = random.choice(REPLY_POOL)
    new_entry = TreeholeHistory(
        user_id=current_user.id,
        message=entry.message,
        reply=reply
    )
    db.add(new_entry)
    await db.commit()
    await db.refresh(new_entry)
    return new_entry

@router.get("/private", response_model=list[TreeholePrivateOut])
async def get_private_treeholes(
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    stmt = select(TreeholeHistory).where(TreeholeHistory.user_id == current_user.id).order_by(TreeholeHistory.time.desc())
    result = await db.execute(stmt)
    entries = result.scalars().all()
    return entries

@router.delete("/private/{entry_id}")
async def delete_private_treehole(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    stmt = select(TreeholeHistory).where(TreeholeHistory.id == entry_id, TreeholeHistory.user_id == current_user.id)
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="倾诉记录不存在")
    await db.delete(entry)
    await db.commit()
    return {"msg": "删除成功"}

# ---------- 公开心事 ----------
@router.post("/public", response_model=PublicConfessionOut)
async def create_public_confession(
    confession: PublicConfessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    new_confession = PublicConfession(
        user_id=current_user.id,
        message=confession.message,
        emoji=confession.emoji,
        comments=[]
    )
    db.add(new_confession)
    await db.commit()
    await db.refresh(new_confession)
    return new_confession

@router.get("/public", response_model=list[PublicConfessionOut])
async def get_public_confessions(
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PublicConfession).order_by(PublicConfession.time.desc())
    result = await db.execute(stmt)
    confessions = result.scalars().all()
    return confessions

@router.post("/public/{confession_id}/like")
async def like_public_confession(
    confession_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    stmt = select(PublicConfession).where(PublicConfession.id == confession_id)
    result = await db.execute(stmt)
    confession = result.scalar_one_or_none()
    if not confession:
        raise HTTPException(status_code=404, detail="心事不存在")
    confession.likes += 1
    await db.commit()
    return {"likes": confession.likes}

@router.post("/public/{confession_id}/comment")
async def add_comment(
    confession_id: int,
    comment: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    stmt = select(PublicConfession).where(PublicConfession.id == confession_id)
    result = await db.execute(stmt)
    confession = result.scalar_one_or_none()

    if not confession:
        raise HTTPException(status_code=404, detail="心事不存在")

    if confession.comments is None:
        confession.comments = []

    new_comment = {
        "user_id": current_user.id,
        "username": current_user.username,
        "text": comment.text,
        "time": datetime.now().isoformat()
    }

    # ⭐关键修复
    confession.comments = confession.comments + [new_comment]

    await db.commit()
    return {"msg": "评论成功"}