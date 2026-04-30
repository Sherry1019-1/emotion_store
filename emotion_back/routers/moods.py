from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from models import MoodRecord, Users
from schemas import MoodCreate, MoodOut
from auth import get_current_user

router = APIRouter()

@router.post("/", response_model=MoodOut)
async def create_mood(
    mood: MoodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    new_mood = MoodRecord(
        user_id=current_user.id,
        emoji=mood.emoji,
        text=mood.text
    )
    db.add(new_mood)
    await db.commit()
    await db.refresh(new_mood)
    return new_mood

@router.get("/", response_model=list[MoodOut])
async def get_moods(
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    stmt = select(MoodRecord).where(MoodRecord.user_id == current_user.id).order_by(MoodRecord.time.desc())
    result = await db.execute(stmt)
    moods = result.scalars().all()
    return moods

@router.delete("/{mood_id}")
async def delete_mood(
    mood_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    stmt = select(MoodRecord).where(MoodRecord.id == mood_id, MoodRecord.user_id == current_user.id)
    result = await db.execute(stmt)
    mood = result.scalar_one_or_none()
    if not mood:
        raise HTTPException(status_code=404, detail="心情记录不存在")
    await db.delete(mood)
    await db.commit()
    return {"msg": "删除成功"}