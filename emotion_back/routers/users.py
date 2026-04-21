from fastapi import APIRouter, HTTPException
from fastapi.params import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Users
from schemas import register, Response, Login, TokenResponse
from auth import create_access_token, get_current_user   # get_current_user 暂时用不到，但先导入
from re_pw import hash_password, verify_password
router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/register")
async def register_user(user:register,db:AsyncSession=Depends(get_db)):
    isexist=select(Users).where(Users.username==user.username)
    result=await db.execute(isexist)
    existing=result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400,detail="用户已存在")
#     哈希密码
    hashed_pw = hash_password(user.password)
    new_user=Users(username=user.username,password=hashed_pw,img=user.img, sex=user.sex,zodiac=user.zodiac,mbti=user.mbti)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return Response(
        id=new_user.id,
        img=new_user.img,
        username=new_user.username,
        sex=new_user.sex,
        zodiac=new_user.zodiac,
        mbti=new_user.mbti,
        created_at=new_user.created_at
    )


@router.post("/login", response_model=TokenResponse)
async def login(user: Login, db: AsyncSession = Depends(get_db)):
    # 查询用户
    stmt = select(Users).where(Users.username == user.username)
    result = await db.execute(stmt)
    db_user = result.scalar_one_or_none()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 生成 token
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=Response)
async def get_me(current_user: Users = Depends(get_current_user)):
    return Response(
        id=current_user.id,
        img=current_user.img,
        username=current_user.username,
        sex=current_user.sex,
        zodiac=current_user.zodiac,
        mbti=current_user.mbti,
        created_at=current_user.created_at
    )