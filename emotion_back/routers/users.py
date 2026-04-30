from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Users
from schemas import register, Login, TokenResponse, BigFiveUpdate, AttachmentUpdate, UserOut
from auth import create_access_token, get_current_user
from re_pw import hash_password, verify_password

router = APIRouter(tags=["users"])

# 注册
@router.post("/register")
async def register(user: register, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Users).where(Users.username == user.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户已存在")

    new_user = Users(
        username=user.username,
        password=hash_password(user.password),
        img=user.img,
        sex=user.sex
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {"msg": "注册成功"}

# 登录
@router.post("/login", response_model=TokenResponse)
async def login(user: Login, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Users).where(Users.username == user.username))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token({"sub": str(db_user.id)})

    return {"access_token": token, "token_type": "bearer"}

# 当前用户
@router.get("/me", response_model=UserOut)
async def get_me(current_user: Users = Depends(get_current_user)):
    return current_user
# --- 保存大五人格 ---
@router.post("/me/big_five", response_model=UserOut)
async def update_big_five(
        data: BigFiveUpdate,
        current_user: Users = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    try:
        current_user.big_five = data.result
        current_user.big_five_done = True  # ✅ 建议加这个标记

        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)

        return current_user   # ✅ 直接返回完整用户

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
# --- 保存依恋人格 ---
@router.post("/me/attachment")
async def update_attachment(
        data: AttachmentUpdate,
        current_user: Users = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):
    try:
        current_user.attachment_style = data.style
        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)
        return {"msg": "依恋类型已记录", "value": current_user.attachment_style}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))