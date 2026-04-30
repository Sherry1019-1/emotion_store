import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from models import TreeholeHistory, PublicConfession, Users
from schemas import TreeholePrivateCreate, TreeholePrivateOut, PublicConfessionCreate, PublicConfessionOut, CommentCreate
from auth import get_current_user
from datetime import datetime
import random
import re

from utils.matching import score_bottle

router = APIRouter()

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

@router.post("/private", response_model=TreeholePrivateOut)
async def create_private_treehole(
    entry: TreeholePrivateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    if not current_user.big_five or not current_user.attachment_style:
        raise HTTPException(status_code=403, detail="请先完成性格测试")

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

@router.get("/history", response_model=list[TreeholePrivateOut])
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

@router.get("/public", response_model=list[PublicConfessionOut])
async def get_public_confessions(db: AsyncSession = Depends(get_db)):
    stmt = select(PublicConfession).order_by(PublicConfession.time.desc())
    result = await db.execute(stmt)
    confessions = result.scalars().all()

    import json

    for item in confessions:
        # comments
        if isinstance(item.comments, str):
            try:
                item.comments = json.loads(item.comments)
            except:
                item.comments = []
        elif item.comments is None:
            item.comments = []

        # liked_users
        if isinstance(item.liked_users, str):
            try:
                item.liked_users = json.loads(item.liked_users)
            except:
                item.liked_users = []
        elif item.liked_users is None:
            item.liked_users = []

        # likes
        if item.likes is None:
            item.likes = 0

    return confessions

@router.post("/public/{confession_id}/like")
async def like_public_confession(
        confession_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: Users = Depends(get_current_user)
):
    result = await db.execute(select(PublicConfession).where(PublicConfession.id == confession_id))
    confession = result.scalar_one_or_none()

    if not confession:
        raise HTTPException(status_code=404, detail="心事已消失")

    # 逻辑：检查用户ID是否在点赞列表中
    # 注意：SQLAlchemy 从 JSON 取出数据时可能是 None，需要处理
    liked_list = list(confession.liked_users) if confession.liked_users else []

    if current_user.id in liked_list:
        raise HTTPException(status_code=400, detail="你已经表达过共鸣了")

    # 更新点赞列表和计数
    liked_list.append(current_user.id)
    confession.liked_users = liked_list  # 重新赋值以确保 SQLAlchemy 能够监听到 JSON 的变化
    confession.likes = (confession.likes or 0) + 1

    await db.commit()
    return {"likes": confession.likes, "msg": "感谢共鸣"}


# --- 2. 评论公开心事 ---
@router.post("/public/{confession_id}/comment")
async def comment_public_confession(
    confession_id: int,
    comment_in: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    # ===== 1. 查找心事 =====
    result = await db.execute(
        select(PublicConfession).where(PublicConfession.id == confession_id)
    )
    confession = result.scalar_one_or_none()

    if not confession:
        raise HTTPException(status_code=404, detail="心事已消失，无法留言")

    # ===== 2. 清洗输入（防 HTML 注入）=====
    def clean_text(text: str):
        text = re.sub(r'<.*?>', '', text)  # 去 HTML 标签
        return text.strip()

    clean_comment = clean_text(comment_in.text)

    if not clean_comment:
        raise HTTPException(status_code=400, detail="评论不能为空")

    if len(clean_comment) > 200:
        raise HTTPException(status_code=400, detail="评论不能超过200字")

    # ===== 3. 构造评论 =====
    new_comment = {
        "user_id": current_user.id,
        "username": current_user.username,
        "text": clean_comment,
        "time": datetime.utcnow().isoformat()
    }

    # ===== 4. 兼容旧数据（字符串 or JSON）=====
    current_comments = confession.comments

    if isinstance(current_comments, str):
        try:
            current_comments = json.loads(current_comments)
        except:
            current_comments = []

    if current_comments is None:
        current_comments = []

    # ===== 5. 添加评论 =====
    current_comments.append(new_comment)
    confession.comments = current_comments

    # ===== 6. 保存 =====
    await db.commit()

    return {
        "msg": "留言成功",
        "comment": new_comment,
        "total": len(current_comments)
    }
@router.get("/public/{confession_id}", response_model=PublicConfessionOut)
async def get_public_confession(
    confession_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PublicConfession).where(PublicConfession.id == confession_id)
    result = await db.execute(stmt)
    confession = result.scalar_one_or_none()

    if not confession:
        raise HTTPException(status_code=404, detail="心事不存在")

    import json

    # ✅ comments 统一为 list
    if isinstance(confession.comments, str):
        try:
            confession.comments = json.loads(confession.comments)
        except:
            confession.comments = []
    elif confession.comments is None:
        confession.comments = []

    # ✅ liked_users 统一为 list
    if isinstance(confession.liked_users, str):
        try:
            confession.liked_users = json.loads(confession.liked_users)
        except:
            confession.liked_users = []
    elif confession.liked_users is None:
        confession.liked_users = []

    # ✅ likes 统一为 int
    if confession.likes is None:
        confession.likes = 0

    return confession